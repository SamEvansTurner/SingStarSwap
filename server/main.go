package main

import (
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"

	"github.com/kirsle/configdir"
)

type ServerConfig struct {
	Port string `json:"port"`
}

type PS3Config struct {
	Address         string `json:"address"`
	PS2Path         string `json:"ps2path"`
	PS2ISOPath      string `json:"ps2isopath"`
	PS2FolderFilter string `json:"ps2folderfilter"`
	PS3Path         string `json:"ps3path"`
	PS3IsoFilter    string `json:"ps3isofilter"`
}

type Config struct {
	ServerConfig `json:"server"`
	PS3Config    `json:"PS3"`
}

// In essence this is a const setting for defaults, but Go doesn't work that way for structs afaict
func GetDefaultSettings() *Config {
	return &Config{ServerConfig{"4000"}, PS3Config{"192.168.1.2", "/dev_hdd0/SINGSTAR", "/dev_hdd0/PS2ISO/SingStar+'80s+(Europe,+Australia)+(v2.00).iso", "SingStar", "/net0/PS3ISO", "SingStar"}}
}

// Embed the static generated Angular from the previous build step.
//
//go:embed static
var embedWebApp embed.FS

// Set-up global config to be passed to web-app
var settings *Config

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

func returnConfig(w http.ResponseWriter, r *http.Request) {
	// Convert your config to JSON
	configJSON, err := json.Marshal(settings.PS3Config)
	if err != nil {
		http.Error(w, "Error encoding config", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(configJSON)
}

func main() {
	var err error
	settings, err = ReadConfig()
	if err != nil {
		panic(err)
	}

	fmt.Println("Welcome to SingStarSwap")
	configFilePath, _ := GetConfigFilePath()
	fmt.Println("Config can be found at " + configFilePath)
	fmt.Println("You can find the web GUI at http://localhost:" + settings.Port)

	fsys, err := fs.Sub(embedWebApp, "static")

	if err != nil {
		panic(err)
	}

	fileserver := http.FileServer(http.FS(fsys))
	http.Handle("/", fileserver)
	http.Handle("/settings.json", http.HandlerFunc(returnConfig))

	err = http.ListenAndServe(":"+settings.Port, nil)
	if err != nil {
		panic(err)
	}
}
