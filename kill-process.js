const { execSync } = require('child_process');

try {
  console.log('Finding processes using port 5000...');
  
  // For Windows
  if (process.platform === 'win32') {
    // Find the process ID using port 5000
    const output = execSync('netstat -ano | findstr :5000').toString();
    console.log('Open processes using port 5000:');
    console.log(output);
    
    // Extract PID
    const lines = output.split('\n');
    const pids = new Set();
    
    lines.forEach(line => {
      if (line.includes('LISTENING')) {
        const parts = line.trim().split(/\s+/);
        if (parts.length > 4) {
          pids.add(parts[4]);
        }
      }
    });
    
    // Kill each process
    pids.forEach(pid => {
      if (pid) {
        console.log(`Killing process with PID: ${pid}`);
        try {
          execSync(`taskkill /F /PID ${pid}`);
          console.log(`Successfully killed process ${pid}`);
        } catch (error) {
          console.error(`Failed to kill process ${pid}:`, error.message);
        }
      }
    });
  } else {
    // For Unix-based systems
    console.log('For Unix systems, run: lsof -i :5000 | grep LISTEN | awk \'{print $2}\' | xargs kill -9');
  }
  
  console.log('Done! Port 5000 should now be available.');
} catch (error) {
  console.log('No processes found using port 5000 or error occurred.');
  console.error(error.message);
} 