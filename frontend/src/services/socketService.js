import { resolveSocketBaseUrl } from '../config/apiBaseResolver';
import { AUTH_CONFIG } from '../config/api.config';

let socket = null;
let isConnected = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

class SocketService {
  constructor() {
    this.subscriptions = new Map();
    this.pendingCallbacks = [];
    this.noteEditingTimers = new Map();
  }

  connect(token) {
    if (socket) {
      this.disconnect();
    }

    try {
      const { io } = require('socket.io-client');
      socket = io(resolveSocketBaseUrl(), {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 10000,
        timeout: 15000,
        forceNew: true,
      });

      socket.on('connect', () => {
        isConnected = true;
        reconnectAttempts = 0;
        this.pendingCallbacks.forEach(cb => cb());
        this.pendingCallbacks = [];
      });

      socket.on('disconnect', () => {
        isConnected = false;
      });

      socket.on('connect_error', (error) => {
        reconnectAttempts++;
        if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
          socket.disconnect();
          socket = null;
          isConnected = false;
        }
      });

    } catch (error) {
      
    }
  }

  disconnect() {
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
      isConnected = false;
    }
  }

  joinUserRoom(userId) {
    if (socket && isConnected) {
      socket.emit('join-user-room', userId);
    } else {
      this.pendingCallbacks.push(() => {
        if (socket) socket.emit('join-user-room', userId);
      });
    }
  }

  joinNoteRoom(noteId, cb) {
    if (socket && isConnected) {
      socket.emit('join-note-room', noteId, (response) => {
        if (cb) cb(response);
      });
    } else {
      this.pendingCallbacks.push(() => {
        if (socket) {
          socket.emit('join-note-room', noteId, (response) => {
            if (cb) cb(response);
          });
        }
      });
    }
  }

  leaveNoteRoom(noteId) {
    if (socket && isConnected) {
      socket.emit('leave-note-room', noteId);
    }
  }

  emitNoteEditing(noteId, isEditing) {
    if (this.noteEditingTimers.has(noteId)) {
      clearTimeout(this.noteEditingTimers.get(noteId));
    }
    if (socket && isConnected) {
      socket.emit('note:editing', { noteId, isEditing });
    }
    if (isEditing) {
      this.noteEditingTimers.set(noteId, setTimeout(() => {
        if (socket && isConnected) {
          socket.emit('note:editing', { noteId, isEditing: false });
        }
        this.noteEditingTimers.delete(noteId);
      }, 3000));
    } else {
      this.noteEditingTimers.delete(noteId);
    }
  }

  cleanupNoteEditing(noteId) {
    if (this.noteEditingTimers.has(noteId)) {
      clearTimeout(this.noteEditingTimers.get(noteId));
      this.noteEditingTimers.delete(noteId);
    }
    if (socket && isConnected) {
      socket.emit('note:editing', { noteId, isEditing: false });
    }
  }

  joinProjectRoom(projectId) {
    if (socket && isConnected) {
      socket.emit('join-project', projectId);
    } else {
      this.pendingCallbacks.push(() => {
        if (socket) socket.emit('join-project', projectId);
      });
    }
  }

  leaveProjectRoom(projectId) {
    if (socket && isConnected) {
      socket.emit('leave-project', projectId);
    }
  }

  emit(event, data) {
    if (socket && isConnected) {
      socket.emit(event, data);
    }
  }

  on(event, callback) {
    if (!this.subscriptions.has(event)) {
      this.subscriptions.set(event, new Set());
      if (socket && isConnected) {
        socket.on(event, (data) => {
          this.subscriptions.get(event).forEach(cb => cb(data));
        });
      } else {
        this.pendingCallbacks.push(() => {
          if (socket) {
            socket.on(event, (data) => {
              this.subscriptions.get(event).forEach(cb => cb(data));
            });
          }
        });
      }
    }

    this.subscriptions.get(event).add(callback);

    return () => {
      this.off(event, callback);
    };
  }

  off(event, callback) {
    if (this.subscriptions.has(event)) {
      this.subscriptions.get(event).delete(callback);
      if (this.subscriptions.get(event).size === 0) {
        this.subscriptions.delete(event);
        if (socket && isConnected) {
          socket.off(event);
        }
      }
    }
  }

  isConnected() {
    return isConnected;
  }

  getSocket() {
    return socket;
  }
}

const socketService = new SocketService();

export default socketService;
