/*
 * Pre-login script for development
 * This script helps with automatic authentication for testing
 * Usage:
 * - In the browser console, run:
 *   const script = document.createElement('script'); script.src='/pre-login.js'; document.body.appendChild(script);
 * - Or simply include in index.html for development
 */

(function() {
  // Only run in development mode
  if (window.location.host.includes('localhost')) {
    console.log('Pre-login script running...');
    
    const apiUrl = 'http://localhost:5001';
    
    // Check if token already exists
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.log('No token found. Attempting automatic login for development...');
      
      // Try to login as admin
      fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'admin',
          password: 'admin123'
        })
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Login failed');
        }
        return response.json();
      })
      .then(data => {
        if (data.token) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          console.log('Auto-login successful! Refreshing...');
          window.location.reload();
        }
      })
      .catch(error => {
        console.error('Auto-login error:', error);
      });
    } else {
      console.log('Token already exists in localStorage');
    }
  }
})(); 