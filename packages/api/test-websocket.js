import { WebSocket } from 'ws';

const WS_URL = 'ws://localhost:3002?token=valid.jwt.token';

console.log('Testing WebSocket connection...');
console.log('URL:', WS_URL);

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('✓ WebSocket connected successfully');

  // Send a hello message
  ws.send(JSON.stringify({
    type: 'hello',
    token: 'test-token',
  }));

  // Send a chat message
  setTimeout(() => {
    console.log('Sending chat message...');
    ws.send(JSON.stringify({
      type: 'chat',
      sessionId: 'b4d1ce4e-832b-49fc-a50b-1ed587ef2c64',
      content: 'Hello from test client!',
      timestamp: new Date().toISOString(),
    }));
  }, 1000);
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('✓ Received message:', message);
  } catch (error) {
    console.log('✓ Received raw message:', data.toString());
  }
});

ws.on('error', (error) => {
  console.error('✗ WebSocket error:', error.message);
});

ws.on('close', (code, reason) => {
  console.log(`✗ WebSocket closed: ${code} - ${reason || 'No reason'}`);
  process.exit(code === 1000 ? 0 : 1);
});

// Close after 5 seconds
setTimeout(() => {
  console.log('Closing connection...');
  ws.close();
}, 5000);
