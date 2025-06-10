const http = require('http');
const fs = require('fs');
const path = require('path');

// Define the directory where your build files are located
const distDirectory = path.join(__dirname, 'dist');

// Create a simple HTTP server
const server = http.createServer((req, res) => {
  // Default to index.html
  let filePath = path.join(distDirectory, req.url === '/' ? 'index.html' : req.url);
  
  // Check if the file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      // If file doesn't exist, serve index.html (for SPA routing)
      filePath = path.join(distDirectory, 'index.html');
    }
    
    // Read the file and serve it
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading ' + filePath);
        return;
      }
      
      // Set the content type based on the file extension
      const ext = path.extname(filePath);
      let contentType = 'text/html';
      
      switch (ext) {
        case '.js':
          contentType = 'text/javascript';
          break;
        case '.css':
          contentType = 'text/css';
          break;
        case '.json':
          contentType = 'application/json';
          break;
        case '.png':
          contentType = 'image/png';
          break;
        case '.jpg':
        case '.jpeg':
          contentType = 'image/jpeg';
          break;
      }
      
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });
});

// Try multiple ports
const ports = [3000, 4000, 5000, 8080, 8000];
let currentPortIndex = 0;

function tryPort() {
  if (currentPortIndex >= ports.length) {
    console.log('Failed to start server on any port.');
    return;
  }
  
  const port = ports[currentPortIndex];
  
  server.listen(port);
  
  server.on('listening', () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Also try: http://127.0.0.1:${port}`);
  });
  
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} is busy, trying next port...`);
      currentPortIndex++;
      tryPort();
    } else {
      console.error('Server error:', err);
    }
  });
}

tryPort(); 