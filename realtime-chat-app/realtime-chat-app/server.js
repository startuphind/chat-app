
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io with CORS configuration
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Store connected users
const users = new Map();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle user joining
  socket.on('user-joined', (username) => {
    users.set(socket.id, {
      id: socket.id,
      username: username,
      joinedAt: new Date()
    });

    // Notify all users about new user
    socket.broadcast.emit('user-connected', {
      username: username,
      userId: socket.id,
      timestamp: new Date()
    });

    // Send current users list to the new user
    socket.emit('users-list', Array.from(users.values()));

    console.log(`${username} joined the chat`);
  });

  // Handle chat messages
  socket.on('chat-message', (data) => {
    const user = users.get(socket.id);
    if (user) {
      const messageData = {
        username: user.username,
        message: data.message,
        timestamp: new Date(),
        userId: socket.id
      };

      // Broadcast message to all users including sender
      io.emit('message-received', messageData);
      console.log(`Message from ${user.username}: ${data.message}`);
    }
  });

  // Handle typing indicators
  socket.on('typing-start', () => {
    const user = users.get(socket.id);
    if (user) {
      socket.broadcast.emit('user-typing', {
        username: user.username,
        userId: socket.id
      });
    }
  });

  socket.on('typing-stop', () => {
    const user = users.get(socket.id);
    if (user) {
      socket.broadcast.emit('user-stopped-typing', {
        userId: socket.id
      });
    }
  });

  // Handle user disconnection
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      users.delete(socket.id);
      
      // Notify all users about user leaving
      socket.broadcast.emit('user-disconnected', {
        username: user.username,
        userId: socket.id,
        timestamp: new Date()
      });

      console.log(`${user.username} left the chat`);
    }
  });
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Visit: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});