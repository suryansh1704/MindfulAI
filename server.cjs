const express = require('express');
const path = require('path');
const app = express();

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// All routes should serve the index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
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
  const server = app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Also try: http://127.0.0.1:${port}`);
  }).on('error', (err) => {
    console.log(`Port ${port} is busy, trying next port...`);
    currentPortIndex++;
    tryPort();
  });
}

tryPort(); 