const { Server: SocketIOServer } = require('socket.io');

let io = null;
const userCache = new Map();
const noteRoomUsers = new Map(); // noteId -> Map<userId, userInfo>

async function getUserInfo(userId) {
  if (userCache.has(userId)) return userCache.get(userId);
  try {
    const User = require('../models/User');
    const user = await User.findById(userId).select('name email avatar role');
    if (user) {
      const info = { _id: userId, name: user.name, email: user.email, avatar: user.avatar, role: user.role };
      userCache.set(userId, info);
      setTimeout(() => userCache.delete(userId), 300000);
      return info;
    }
  } catch (e) {}
  return { _id: userId, name: 'Unknown', email: '', avatar: null };
}

function createSocketServer(httpServer) {
  if (io) return io;

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: true,
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    socket.noteRooms = new Set();

    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        const { verifyToken } = require('../utils/jwt');
        const decoded = verifyToken(token);
        if (decoded && decoded.id) {
          socket.join(`user:${decoded.id}`);
          socket.userId = decoded.id;
        }
      } catch (e) {
        console.warn('[Socket] Invalid auth token on connection');
      }
    }

    socket.on('join-project', (projectId) => {
      if (projectId) socket.join(`project:${projectId}`);
    });

    socket.on('leave-project', (projectId) => {
      if (projectId) socket.leave(`project:${projectId}`);
    });

    socket.on('join-user-room', (userId) => {
      if (userId) socket.join(`user:${userId}`);
    });

    socket.on('join-note-room', async (noteId, ack) => {
      if (!noteId || !socket.userId) return;
      socket.join(`note:${noteId}`);
      socket.noteRooms.add(noteId);
      const userInfo = await getUserInfo(socket.userId);
      // Track in room users map
      if (!noteRoomUsers.has(noteId)) noteRoomUsers.set(noteId, new Map());
      noteRoomUsers.get(noteId).set(socket.userId, userInfo);
      // Send existing users to the new joiner
      const existingUsers = Array.from(noteRoomUsers.get(noteId).values()).filter(u => u._id !== socket.userId);
      if (typeof ack === 'function') ack({ userInfo, existingUsers });
      // Broadcast join to others
      socket.broadcast.to(`note:${noteId}`).emit('note:user-joined', { noteId, user: userInfo });
    });

    socket.on('leave-note-room', (noteId) => {
      if (!noteId) return;
      socket.leave(`note:${noteId}`);
      socket.noteRooms.delete(noteId);
      if (socket.userId) {
        if (noteRoomUsers.has(noteId)) {
          noteRoomUsers.get(noteId).delete(socket.userId);
          if (noteRoomUsers.get(noteId).size === 0) noteRoomUsers.delete(noteId);
        }
        socket.broadcast.to(`note:${noteId}`).emit('note:user-left', { noteId, userId: socket.userId });
      }
    });

    socket.on('note:editing', (data) => {
      if (!data || !data.noteId || !socket.userId) return;
      socket.broadcast.to(`note:${data.noteId}`).emit('note:user-editing', {
        noteId: data.noteId,
        userId: socket.userId,
        isEditing: data.isEditing
      });
    });

    socket.on('disconnect', () => {
      if (socket.userId) {
        for (const noteId of socket.noteRooms) {
          if (noteRoomUsers.has(noteId)) {
            noteRoomUsers.get(noteId).delete(socket.userId);
            if (noteRoomUsers.get(noteId).size === 0) noteRoomUsers.delete(noteId);
          }
          socket.broadcast.to(`note:${noteId}`).emit('note:user-left', { noteId, userId: socket.userId });
        }
      }
      socket.noteRooms.clear();
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.IO not initialized. Call createSocketServer first.');
  return io;
}

module.exports = { createSocketServer, getIO };
