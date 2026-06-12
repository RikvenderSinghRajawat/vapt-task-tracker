'use strict';

require('dotenv').config();
const mongoose = require('mongoose');

mongoose.set('strictQuery', false);
mongoose.set('bufferCommands', false);
mongoose.set('bufferTimeoutMS', 10000);

let _conn = null;
let _connPromise = null;
let _retryCount = 0;
let _healthTimer = null;
let _shuttingDown = false;
let _reconnectTimer = null;

const MAX_RETRIES = parseInt(process.env.DB_MAX_RETRIES) || 10;
const RETRY_BASE_MS = parseInt(process.env.DB_RETRY_DELAY_MS) || 3000;
const MAX_RETRY_DELAY_MS = 30000;

function _state() {
  const s = mongoose.connection.readyState;
  return s === 1 ? 'connected' : s === 2 ? 'connecting' : 'disconnected';
}

function _retryDelay() {
  const delay = Math.min(RETRY_BASE_MS * Math.pow(2, _retryCount), MAX_RETRY_DELAY_MS);
  const jitter = Math.random() * 1000;
  return Math.floor(delay + jitter);
}

function _getUri() {
  return process.env.MONGO_URI || process.env.DB_URI || 'mongodb://127.0.0.1:27017/vapt_tracker';
}

function _getOptions() {
  return {
    dbName: process.env.MONGO_DB_NAME || 'vapt_tracker',
    maxPoolSize: parseInt(process.env.DB_MAX_POOL) || 10,
    minPoolSize: parseInt(process.env.DB_MIN_POOL) || 1,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 60000,
    connectTimeoutMS: 10000,
    heartbeatFrequencyMS: 10000,
    waitQueueTimeoutMS: 10000,
    retryWrites: true,
    retryReads: true,
    autoIndex: process.env.NODE_ENV !== 'production',
  };
}

let _eventsBound = false;
function _bindEvents() {
  if (_eventsBound) return;
  _eventsBound = true;

  mongoose.connection.on('disconnected', () => {
    if (!_shuttingDown) {
      console.warn('[DB] Disconnected from MongoDB');
      _scheduleReconnect();
    }
  });

  mongoose.connection.on('reconnected', () => {
    console.log('[DB] Reconnected to MongoDB');
    _retryCount = 0;
    _conn = mongoose.connection;
    _connPromise = null;
    _cancelReconnect();
  });

  mongoose.connection.on('error', (err) => {
    if (!_shuttingDown) {
      console.error('[DB] Connection error:', err.message);
    }
  });
}

function _scheduleReconnect() {
  if (_shuttingDown || _reconnectTimer) return;
  _retryCount++;
  if (_retryCount > MAX_RETRIES) {
    console.error(`[DB] Max retries (${MAX_RETRIES}) reached. Giving up.`);
    return;
  }
  const delay = _retryDelay();
  console.log(`[DB] Scheduling reconnect attempt ${_retryCount}/${MAX_RETRIES} in ${Math.round(delay / 1000)}s`);
  _reconnectTimer = setTimeout(() => {
    _reconnectTimer = null;
    if (!_shuttingDown && _state() !== 'connected') {
      connectDB().catch(err => {
        console.error(`[DB] Reconnect ${_retryCount} failed:`, err.message);
      });
    }
  }, delay);
  _reconnectTimer.unref?.();
}

function _cancelReconnect() {
  if (_reconnectTimer) {
    clearTimeout(_reconnectTimer);
    _reconnectTimer = null;
  }
}

const connectDB = async () => {
  if (_shuttingDown) {
    throw new Error('Server is shutting down');
  }

  const state = _state();
  if (state === 'connected') {
    _retryCount = 0;
    _conn = mongoose.connection;
    _cancelReconnect();
    return mongoose.connection;
  }

  if (state === 'connecting') {
    if (_connPromise) return _connPromise;
    await new Promise(r => setTimeout(r, 2000));
    if (_state() === 'connected') return mongoose.connection;
  }

  const dbUri = _getUri();

  _connPromise = mongoose.connect(dbUri, _getOptions()).then(() => {
    _bindEvents();
    _conn = mongoose.connection;
    _retryCount = 0;
    _connPromise = null;
    _cancelReconnect();
    console.log('[DB] MongoDB connected successfully');
    return mongoose.connection;
  }).catch(err => {
    _connPromise = null;
    _retryCount++;
    console.error(`[DB] Connection attempt ${_retryCount}/${MAX_RETRIES} failed: ${err.message}`);
    if (_retryCount >= MAX_RETRIES || _shuttingDown) {
      console.error('[DB] Giving up on MongoDB connection');
      throw err;
    }
    const delay = _retryDelay();
    console.log(`[DB] Retrying in ${Math.round(delay / 1000)}s...`);
    return new Promise(r => setTimeout(r, delay)).then(() => {
      if (!_shuttingDown) return connectDB();
      throw new Error('Server shutting down');
    });
  });

  return _connPromise;
};

const closeDB = async () => {
  _shuttingDown = true;
  _cancelReconnect();
  if (_healthTimer) {
    clearInterval(_healthTimer);
    _healthTimer = null;
  }
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.connection.close();
      console.log('[DB] MongoDB connection closed');
    } catch (err) {
      console.warn('[DB] Error closing connection:', err.message);
    }
  }
  _conn = null;
  _connPromise = null;
};

const startHealthMonitor = () => {
  if (_healthTimer) return;
  let pingFailures = 0;
  _healthTimer = setInterval(async () => {
    if (_shuttingDown || _state() !== 'connected') return;
    try {
      if (mongoose.connection.db) {
        await mongoose.connection.db.admin().ping();
        pingFailures = 0;
      }
    } catch (err) {
      pingFailures++;
      if (pingFailures >= 3) {
        console.error('[DB] Health monitor: MongoDB unreachable, triggering reconnect');
        pingFailures = 0;
        _cancelReconnect();
        try {
          await mongoose.disconnect();
        } catch (_) {}
        connectDB().catch(e => {
          console.error('[DB] Health monitor reconnect failed:', e.message);
        });
      }
    }
  }, parseInt(process.env.DB_HEALTH_INTERVAL_MS) || 30000);
  _healthTimer.unref?.();
};

const getConnectionState = _state;

module.exports = connectDB;
module.exports.closeDB = closeDB;
module.exports.getConnectionState = getConnectionState;
module.exports.startHealthMonitor = startHealthMonitor;
