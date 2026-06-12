let io = null;

function init(ioInstance) {
  io = ioInstance;
}

function emitToUser(userId, event, data) {
  if (!io) {
    try {
      const { getIO } = require('../config/socket');
      io = getIO();
    } catch (_) {
      return;
    }
  }
  io.to(`user:${userId}`).emit(event, data);
}

module.exports = { init, emitToUser };
