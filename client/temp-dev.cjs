// Simple script to start a development server without using Vite's config
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Create a minimalist package.json two directories up
const parentPath = path.resolve(__dirname, '../..');
const packageJsonPath = path.join(parentPath, 'package.json');

try {
  // Check if package.json doesn't exist or is empty
  let shouldCreateFile = false;
  try {
    const fileContents = fs.readFileSync(packageJsonPath, 'utf8');
    if (!fileContents || fileContents.trim().length === 0) {
      shouldCreateFile = true;
    }
  } catch (err) {
    shouldCreateFile = true;
  }

  if (shouldCreateFile) {
    fs.writeFileSync(packageJsonPath, JSON.stringify({
      name: "root-package",
      private: true
    }, null, 2));
    
    console.log(`Created package.json at ${packageJsonPath}`);
  }
  
  // Now run vite without config - handle Windows vs Unix platforms
  const isWindows = process.platform === 'win32';
  const viteProcess = isWindows
    ? spawn('npx.cmd', ['vite', '--force'], { cwd: __dirname, shell: true })
    : spawn('npx', ['vite', '--force'], { cwd: __dirname });
  
  viteProcess.stdout.on('data', (data) => {
    process.stdout.write(data);
  });
  
  viteProcess.stderr.on('data', (data) => {
    process.stderr.write(data);
  });
  
  viteProcess.on('exit', (code) => {
    console.log(`Vite process exited with code ${code}`);
    process.exit(code);
  });
  
} catch (error) {
  console.error('Error:', error);
} 