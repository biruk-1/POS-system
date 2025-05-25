import io from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5001';

// Create socket instance
export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

// Socket event handlers
socket.on('connect', () => {
  console.log('Connected to socket server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from socket server');
});

socket.on('connect_error', (error) => {
  console.error('Socket connection error:', error);
});

// Export socket instance
export default socket; 