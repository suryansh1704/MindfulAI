const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Railway Start Script');
console.log('====================');

try {
  // Step 1: Build the frontend
  console.log('📦 Building frontend...');
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Frontend build completed');
  
  // Step 2: Check if dist folder exists
  const distPath = path.join(__dirname, 'dist');
  if (!fs.existsSync(distPath)) {
    throw new Error('❌ Dist folder not found after build');
  }
  console.log('✅ Dist folder confirmed');
  
  // Step 3: Start the unified server
  console.log('🔄 Starting unified server...');
  require('./unified-server.cjs');
  
} catch (error) {
  console.error('❌ Railway start error:', error.message);
  process.exit(1);
} 