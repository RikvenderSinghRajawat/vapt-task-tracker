import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/apiBaseResolver';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || API_BASE_URL.replace(/\/api$/, '');
const HEALTH_CHECK_INTERVAL = 30000;

class BackendStatusService {
  constructor() {
    this.isAvailable = true;
    this.lastCheck = null;
    this.checkInterval = null;
    this.listeners = [];
    this.serverInfo = null;
  }

  static getServerRequirements() {
    return {
      title: 'Backend Server Required',
      description: 'The VAPT Tracker backend server is not running. Some features will be unavailable.',
      requirements: [
        { name: 'Node.js', version: 'v18+', required: true, check: 'node --version' },
        { name: 'MongoDB', version: '6.0+', required: true, check: 'mongod --version', note: 'Must be running locally or available over the network' },
        { name: 'Backend Server', port: '5000', required: true, commands: ['cd backend', 'npm install', 'npm start'] },
        { name: 'Environment Variables', required: true, file: 'backend/.env', variables: ['NODE_ENV=development', 'PORT=5000', 'MONGO_URI=mongodb://localhost:27017/vapt_tracker', 'JWT_SECRET=your-secret-key', 'FRONTEND_URL=http://localhost:3000'] }
      ],
      quickStart: [
        '1. Ensure MongoDB is running: sudo systemctl status mongod',
        '2. Install backend dependencies: cd backend && npm install',
        '3. Copy environment file: cp backend/.env.example backend/.env',
        '4. Start backend server: npm start',
        '5. Backend will be available on the configured API port for this host'
      ],
      featuresUnavailable: [
        'Report conversion (PDF/Excel generation)',
        'Advanced analytics queries',
        'Local file uploads',
        'System metrics monitoring',
        'Email notifications'
      ],
      note: 'Core features use local JWT authentication and the local backend API.'
    };
  }

  async checkBackendHealth() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const isCrossOrigin = BACKEND_URL.startsWith('http') && !BACKEND_URL.startsWith(window.location.origin);

      const response = await fetch(`${BACKEND_URL}/api/health`, {
        method: 'GET',
        signal: controller.signal,
        credentials: isCrossOrigin ? 'include' : 'same-origin',
        headers: { 'Content-Type': 'application/json' }
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        this.serverInfo = data;
        this.setAvailability(true);
      } else {
        this.setAvailability(false);
      }
    } catch (error) {
      this.setAvailability(false);
    }

    this.lastCheck = new Date();
  }

  setAvailability(available) {
    if (this.isAvailable !== available) {
      this.isAvailable = available;
      this.notifyListeners();
    }
  }

  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.isAvailable, this.getStatus());
      } catch (error) {
        console.error('Backend status listener error:', error);
      }
    });
  }

  subscribe(callback) {
    this.listeners.push(callback);
    callback(this.isAvailable, this.getStatus());
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  getStatus() {
    return {
      isAvailable: this.isAvailable,
      lastCheck: this.lastCheck,
      serverInfo: this.serverInfo,
      requirements: BackendStatusService.getServerRequirements()
    };
  }

  startMonitoring() {
    this.checkBackendHealth();
    if (!this.checkInterval) {
      this.checkInterval = setInterval(() => {
        this.checkBackendHealth();
      }, HEALTH_CHECK_INTERVAL);
    }
  }

  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  async checkNow() {
    await this.checkBackendHealth();
    return this.getStatus();
  }
}

export const backendStatus = new BackendStatusService();

export const useBackendStatus = () => {
  const [status, setStatus] = useState(backendStatus.getStatus());

  useEffect(() => {
    backendStatus.startMonitoring();
    const unsubscribe = backendStatus.subscribe((isAvailable, newStatus) => {
      setStatus(newStatus);
    });

    return () => {
      unsubscribe();
      backendStatus.stopMonitoring();
    };
  }, []);

  return status;
};

export default backendStatus;
