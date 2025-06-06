const { spawn } = require('child_process');
const path = require('path');

// Increase file descriptor limit
process.setMaxListeners(0);

// Start Vite with custom options
const vite = spawn('vite', ['--force'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_OPTIONS: '--max-old-space-size=4096 --max-http-header-size=16384',
    UV_THREADPOOL_SIZE: '128'
  }
});

vite.on('error', (err) => {
  console.error('Failed to start Vite:', err);
  process.exit(1);
}); 