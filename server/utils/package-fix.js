// Fix for missing node-fetch in current environment
// This file ensures compatibility with different Node.js versions

let fetch;

try {
  // Try to use native fetch (Node 18+)
  fetch = globalThis.fetch;
} catch (e) {
  // Fallback for older Node versions or if native fetch fails
}

if (!fetch) {
  try {
    // Try to require node-fetch if available
    fetch = require('node-fetch');
  } catch (e) {
    // Create a simple fetch polyfill using built-in modules
    const https = require('https');
    const http = require('http');
    const url = require('url');

    fetch = function(urlString, options = {}) {
      return new Promise((resolve, reject) => {
        const parsedUrl = new URL(urlString);
        const protocol = parsedUrl.protocol === 'https:' ? https : http;
        
        const requestOptions = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port,
          path: parsedUrl.pathname + parsedUrl.search,
          method: options.method || 'GET',
          headers: options.headers || {},
          timeout: options.timeout || 10000
        };

        const req = protocol.request(requestOptions, (res) => {
          let data = '';
          
          res.on('data', chunk => {
            data += chunk;
          });
          
          res.on('end', () => {
            resolve({
              ok: res.statusCode >= 200 && res.statusCode < 300,
              status: res.statusCode,
              statusText: res.statusMessage,
              headers: res.headers,
              text: () => Promise.resolve(data),
              json: () => Promise.resolve(JSON.parse(data))
            });
          });
        });

        req.on('error', reject);
        req.on('timeout', () => reject(new Error('Request timeout')));
        
        if (options.body) {
          req.write(options.body);
        }
        
        req.end();
      });
    };
  }
}

module.exports = { fetch };