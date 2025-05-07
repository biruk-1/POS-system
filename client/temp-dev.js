// Simple script to start a development server without using Vite's config
const fs = require('fs');
const path = require('path');
const http = require('http');
const { exec } = require('child_process');

// Create a minimalist package.json two directories up
const parentPath = path.resolve(__dirname, '../..');
const packageJsonPath = path.join(parentPath, 'package.json');

try {
  fs.writeFileSync(packageJsonPath, JSON.stringify({
    name: "root-package",
    private: true
  }, null, 2));
  
  console.log(`Created package.json at ${packageJsonPath}`);
  
  // Now run vite without config
  const viteProcess = exec('npx vite --force', {
    cwd: __dirname
  });
  
  viteProcess.stdout.pipe(process.stdout);
  viteProcess.stderr.pipe(process.stderr);
  
  viteProcess.on('exit', (code) => {
    console.log(`Vite process exited with code ${code}`);
    process.exit(code);
  });
  
} catch (error) {
  console.error('Error:', error);
} 