package main

import (
	"context"
	"embed"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"sync"
	"time"

	"github.com/kirsle/configdir"
)

const (
	restartDelay       = 200 * time.Millisecond
	maxRequestBodySize = 1048576 // 1MB
)

type ServerConfig struct {
	Port int `json:"port"`
}

type PS3Config struct {
	Address     string `json:"address"`
	PS2Path     string `json:"ps2path"`
	TitleFilter string `json:"titlefilter"`
	PS3Path     string `json:"ps3path"`
}

type Config struct {
	ServerConfig `json:"server"`
	PS3Config    `json:"PS3"`
}

// In essence this is a const setting for defaults, but Go doesn't work that way for structs afaict
func GetDefaultSettings() *Config {
	return &Config{ServerConfig{4000}, PS3Config{"192.168.1.2", "/dev_hdd0/SINGSTAR", "SingStar", "/net0/PS3ISO"}}
}

// Embed the static generated Angular from the previous build step.
//
//go:embed static
var embedWebApp embed.FS

// Set-up global config to be passed to web-app
var settings *Config
var httpServer *http.Server
var serverMutex sync.Mutex

func GetConfigFilePath() (string, error) {
	configPath := configdir.LocalConfig("SingStarSwap")
	err := configdir.MakePath(configPath)
	if err != nil {
		return "", err
	}
	return filepath.Join(configPath, "settings.json"), nil
}

// Reads config from disk, and then saves it or re-saves it update defaults.
func ReadConfig() (*Config, error) {

	_settings := GetDefaultSettings()

	configFile, err := GetConfigFilePath()
	if err != nil {
		return nil, err
	}

	if _, err = os.Stat(configFile); !os.IsNotExist(err) {

		file, err := os.Open(configFile)
		if err != nil {
			return nil, err
		}
		defer file.Close()

		decoder := json.NewDecoder(file)
		if err := decoder.Decode(&_settings); err != nil {
			return nil, err
		}
		//If the file exists, we have read the data. OK to re-write the file now.
	}

	file, err := os.Create(configFile)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	if err := encoder.Encode(&_settings); err != nil {
		return nil, err
	}

	return _settings, nil
}

// Validation functions
func validatePort(port int) error {
	if port < 1 || port > 65535 {
		return fmt.Errorf("port must be between 1 and 65535")
	}
	return nil
}

func validateIPAddress(address string) error {
	ip := net.ParseIP(address)
	if ip == nil {
		return fmt.Errorf("invalid IP address format")
	}
	return nil
}

func validatePath(path string) error {
	if path == "" {
		return fmt.Errorf("path cannot be empty")
	}
	// Prevent path traversal attacks
	if regexp.MustCompile(`\.\.`).MatchString(path) {
		return fmt.Errorf("path traversal not allowed")
	}
	// Basic validation - check for allowed characters
	matched, err := regexp.MatchString(`^[a-zA-Z0-9\/_\-\.]+$`, path)
	if err != nil {
		return fmt.Errorf("path validation error: %v", err)
	}
	if !matched {
		return fmt.Errorf("path contains invalid characters")
	}
	return nil
}

func validateConfig(config *Config) error {
	if err := validatePort(config.Port); err != nil {
		return fmt.Errorf("invalid port: %v", err)
	}
	if err := validateIPAddress(config.Address); err != nil {
		return fmt.Errorf("invalid address: %v", err)
	}
	if err := validatePath(config.PS2Path); err != nil {
		return fmt.Errorf("invalid PS2 path: %v", err)
	}
	if err := validatePath(config.PS3Path); err != nil {
		return fmt.Errorf("invalid PS3 path: %v", err)
	}
	if config.TitleFilter == "" {
		return fmt.Errorf("title filter cannot be empty")
	}
	return nil
}

func SaveConfig(config *Config) error {
	configFile, err := GetConfigFilePath()
	if err != nil {
		return err
	}

	file, err := os.Create(configFile)
	if err != nil {
		return err
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(config); err != nil {
		return err
	}

	return nil
}

// PS3 Proxy types and globals
type PS3Request struct {
	URL          string
	ResponseChan chan PS3Response
}

type PS3Response struct {
	Body  string
	Error error
}

var ps3RequestQueue chan *PS3Request
var queueWorkerStarted sync.Once

// Initialize PS3 proxy queue and worker
func initPS3Proxy() {
	ps3RequestQueue = make(chan *PS3Request, 100)

	// Start exactly ONE worker goroutine
	queueWorkerStarted.Do(func() {
		go ps3QueueWorker()
	})
}

// Single worker goroutine that processes PS3 requests sequentially
func ps3QueueWorker() {
	requestID := 0
	for req := range ps3RequestQueue {
		requestID++
		resp := processPS3RequestWithRetry(req.URL)
		req.ResponseChan <- resp
	}
}

// Process a single PS3 request with retry logic
func processPS3RequestWithRetry(url string) PS3Response {
	maxRetries := 2
	for attempt := 0; attempt <= maxRetries; attempt++ {
		resp, err := makeHTTPRequest(url, 10*time.Second)
		if err == nil {
			return PS3Response{Body: resp, Error: nil}
		}

		if attempt < maxRetries {
			backoff := time.Duration(1<<uint(attempt)) * time.Second // 1s, 2s
			log.Printf("[PS3 Proxy] Request to %s failed, retry %d after %v", url, attempt+1, backoff)
			time.Sleep(backoff)
		}
	}

	return PS3Response{Error: fmt.Errorf("request failed after %d retries", maxRetries+1)}
}

// Make HTTP request with timeout
func makeHTTPRequest(url string, timeout time.Duration) (string, error) {
	client := &http.Client{Timeout: timeout}
	resp, err := client.Get(url)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("HTTP %d: %s", resp.StatusCode, resp.Status)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	return string(body), nil
}

// Validate proxy path to prevent malicious requests
func validateProxyPath(path string) error {
	if path == "" || path[0] != '/' {
		return fmt.Errorf("path must start with /")
	}
	if regexp.MustCompile(`\.\.`).MatchString(path) {
		return fmt.Errorf("path traversal not allowed")
	}
	return nil
}

// PS3 proxy handler - handles /api/ps3/* requests
func ps3ProxyHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract path after /api/ps3
	ps3Path := r.URL.Path[len("/api/ps3"):]

	// Include query parameters if present
	if r.URL.RawQuery != "" {
		ps3Path += "?" + r.URL.RawQuery
	}

	// Validate path
	if err := validateProxyPath(ps3Path); err != nil {
		log.Printf("[PS3 Proxy] Invalid path rejected: %s (%v)", ps3Path, err)
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	// Construct full URL using server config
	fullURL := "http://" + settings.Address + ps3Path

	// Enqueue request
	responseChan := make(chan PS3Response)
	ps3RequestQueue <- &PS3Request{
		URL:          fullURL,
		ResponseChan: responseChan,
	}

	// Wait for response (blocks this handler goroutine, but not others)
	result := <-responseChan

	if result.Error != nil {
		log.Printf("[PS3 Proxy] Request failed: %v", result.Error)
		http.Error(w, result.Error.Error(), http.StatusBadGateway)
		return
	}

	// Detect and set appropriate content type from response body
	contentType := http.DetectContentType([]byte(result.Body))
	w.Header().Set("Content-Type", contentType)
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(result.Body))
}

// API endpoint to get full config
func getConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	configJSON, err := json.Marshal(settings)
	if err != nil {
		http.Error(w, "Error encoding config", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(configJSON)
}

// API endpoint to update config
func updateConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Limit request body size to prevent DoS attacks
	r.Body = http.MaxBytesReader(w, r.Body, maxRequestBodySize)

	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Error reading request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	var newConfig Config
	if err := json.Unmarshal(body, &newConfig); err != nil {
		http.Error(w, "Error parsing JSON: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Validate config
	if err := validateConfig(&newConfig); err != nil {
		http.Error(w, "Invalid configuration: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Check if port changed
	portChanged := newConfig.Port != settings.Port
	newPort := newConfig.Port

	// Save config to disk
	if err := SaveConfig(&newConfig); err != nil {
		http.Error(w, "Error saving config: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Update in-memory settings
	settings = &newConfig

	// Send response before restarting
	response := map[string]interface{}{
		"success":         true,
		"requiresRestart": portChanged,
		"newPort":         newPort,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)

	// Restart server if port changed
	if portChanged {
		go func() {
			time.Sleep(restartDelay) // Let response reach client
			log.Printf("Restarting server on port %d...", newPort)
			if err := startServer(newPort); err != nil {
				log.Printf("Error restarting server: %v", err)
			}
		}()
	}
}

// Start or restart the HTTP server
func startServer(port int) error {
	serverMutex.Lock()
	defer serverMutex.Unlock()

	// Shutdown existing server if running
	if httpServer != nil {
		log.Println("Shutting down existing server...")
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := httpServer.Shutdown(ctx); err != nil {
			log.Printf("Error shutting down server: %v", err)
		}
	}

	// Create new server
	httpServer = &http.Server{
		Addr:    ":" + strconv.Itoa(port),
		Handler: http.DefaultServeMux,
	}

	log.Printf("Starting server on port %d...", port)
	// Start server in goroutine
	go func() {
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("Server error: %v", err)
		}
	}()

	return nil
}

func main() {
	var err error
	settings, err = ReadConfig()
	if err != nil {
		panic(err)
	}

	log.Println("Welcome to SingStarSwap")
	configFilePath, _ := GetConfigFilePath()
	log.Println("Config can be found at " + configFilePath)
	log.Println("You can find the web GUI at http://localhost:" + strconv.Itoa(settings.Port))

	fsys, err := fs.Sub(embedWebApp, "static")
	if err != nil {
		panic(err)
	}

	// Initialize PS3 proxy
	initPS3Proxy()
	log.Println("PS3 proxy initialized")

	// Setup routes
	fileserver := http.FileServer(http.FS(fsys))
	http.Handle("/", fileserver)
	http.HandleFunc("/api/config", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			getConfig(w, r)
		} else if r.Method == http.MethodPut {
			updateConfig(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})
	http.HandleFunc("/api/ps3/", ps3ProxyHandler)

	// Start the server
	if err := startServer(settings.Port); err != nil {
		panic(err)
	}

	// Keep main goroutine alive
	select {}
}
