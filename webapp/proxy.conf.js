// Development proxy configuration for Angular dev server (ng serve)
// This file is ONLY used during development and has NO impact on production builds

// Allow PS3 IP to be customized via environment variable
// Usage: PS3_IP=192.168.1.39 ng serve
const PS3_IP = process.env.PS3_IP || '192.168.1.99';

const MOCK_CONFIG = {
  server: { port: 4200 },
  PS3: {
    address: PS3_IP,
    ps2path: "/dev_hdd0/SINGSTAR",
    titlefilter: "SingStar",
    ps3path: "/net0/PS3ISO"
  }
};

console.log(`[DEV PROXY] Using PS3 IP: ${PS3_IP}${process.env.PS3_IP ? ' (from PS3_IP env var)' : ' (default)'}`);

module.exports = {
  // Mock config endpoint - no backend needed for development
  '/api/config': {
    target: 'http://localhost:4000',  // Required by Vite (not actually used due to bypass)
    bypass: function(req, res, proxyOptions) {
      // Handle GET requests - return mock config
      if (req.method === 'GET') {
        console.log('[DEV PROXY] Serving mock config');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(MOCK_CONFIG));
        return false;  // Tell Vite we handled it, don't proxy
      }
      
      // Handle PUT requests - return mock success with warning
      if (req.method === 'PUT') {
        console.warn('⚠️  [DEV PROXY] Config save attempted but ignored (no backend running)');
        console.warn('⚠️  [DEV PROXY] Config changes will NOT persist in development mode');
        
        // Return mock success response matching Go server's format
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          requiresRestart: false,
          newPort: 4200
        }));
        return false;  // Tell Vite we handled it, don't proxy
      }
      
      // For any other methods, return 501 Not Implemented
      console.warn(`⚠️  [DEV PROXY] ${req.method} /api/config not implemented in development mode`);
      res.writeHead(501, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not implemented in development mode' }));
      return false;  // Tell Vite we handled it, don't proxy
    }
  },
  
  // Forward PS3 API requests directly to PS3
  '/api/ps3': {
    target: `http://${MOCK_CONFIG.PS3.address}`,
    secure: false,
    logLevel: 'debug',
    changeOrigin: true,
    pathRewrite: {
      '^/api/ps3': ''  // Remove /api/ps3 prefix before forwarding to PS3
    },
    onProxyReq: function(proxyReq, req, res) {
      console.log(`[DEV PROXY] Forwarding to PS3: ${req.url} -> http://${MOCK_CONFIG.PS3.address}${req.url.replace('/api/ps3', '')}`);
    }
  }
};
