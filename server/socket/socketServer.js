const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId; // Changed from decoded.id to decoded.userId
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      console.error('Socket authentication error:', err.message);
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.userId} (${socket.userRole})`);

    // Join user-specific room
    socket.join(`user:${socket.userId}`);

    // Join admin room if user is admin
    if (socket.userRole === 'admin') {
      socket.join('admins');
      console.log(`👑 Admin joined admin room: ${socket.userId}`);
    }

    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.userId}`);
    });
  });

  console.log('🔌 Socket.io server initialized');
  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

// Emit events to specific users or rooms
const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

const emitToAdmins = (event, data) => {
  if (io) {
    io.to('admins').emit(event, data);
  }
};

const emitToAll = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

module.exports = {
  initializeSocket,
  getIO,
  emitToUser,
  emitToAdmins,
  emitToAll
};
