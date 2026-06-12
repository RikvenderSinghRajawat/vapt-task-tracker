import React from 'react';
import { API_BASE_URL } from '../config/apiBaseResolver';
import { AUTH_CONFIG } from '../config/api.config';
import { authStorage } from './authStorage';

/**
 * System Information Service
 * Fetches and manages real-time system metrics from backend
 */

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || API_BASE_URL.replace(/\/api$/, '');
const SYSTEM_INFO_INTERVAL = 900000; // 15 minutes for system info updates

const SYSTEM_INFO_ENDPOINT = '/api/system/metrics';

function buildDebugUrl() {
  try {
    const base = BACKEND_URL || window?.location?.origin || '';
    return `${base}${SYSTEM_INFO_ENDPOINT}`;
  } catch {
    return SYSTEM_INFO_ENDPOINT;
  }
}



class SystemInfoService {
  constructor() {
    this.systemInfo = null;
    this.lastUpdate = null;
    this.updateInterval = null;
    this.listeners = [];
    this.isLoading = false;
    this.error = null;
  }

  async fetchSystemInfo() {
    this.isLoading = true;
    this.error = null;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
const response = await (async () => {
        let headers = {
          'Content-Type': 'application/json'
        };


        const token = authStorage.getAccessToken();
        if (token) {
          headers = {
            ...headers,
            Authorization: `Bearer ${token}`
          };
        }

        const url = `${BACKEND_URL}${SYSTEM_INFO_ENDPOINT}`;

        return fetch(url, {
          method: 'GET',
          signal: controller.signal,
          headers
        });
      })();
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          const text = await response.text();
          throw new Error(
            `Expected JSON response but received non-JSON response from ${buildDebugUrl()}. ` +
              `HTTP ${response.status} ${response.statusText}. ` +
              `Body preview: ${text.slice(0, 200)}`
          );
        }

        const data = await response.json();
        this.systemInfo = this.formatSystemInfo(data);
        this.lastUpdate = new Date();
        this.notifyListeners();
      } else {
        let errorMessage = `HTTP ${response?.status || 'Unknown'}: ${response?.statusText || 'Unknown Error'}`;
        try {
          const errorData = await response.json().catch(() => ({}));
          if (errorData && errorData.message) {
            errorMessage = errorData.message;
          }
          } catch (parseError) {
          }
        throw new Error(errorMessage);
      }
    } catch (error) {
      this.error = error.message;
      this.systemInfo = null;
      this.notifyListeners();
      console.error('Error fetching system info:', error);
    } finally {
      this.isLoading = false;
    }
  }

  formatSystemInfo(data) {
    if (!data.success || !data.data) {
      return null;
    }

    const { data: metrics } = data;
    
    return {
      host: {
        name: metrics.host?.name || 'Unknown',
        platform: metrics.host?.platform || 'Unknown',
        arch: metrics.host?.arch || 'Unknown',
        uptime: metrics.host?.uptime || 'Unknown',
        uptimeSeconds: metrics.host?.uptimeSeconds || 0
      },
      cpu: {
        model: metrics.cpu?.model || 'Unknown',
        cores: metrics.cpu?.cores || 0,
        load: {
          current: metrics.cpu?.load?.current || 0,
          avg1m: metrics.cpu?.load?.avg1m || 0,
          avg5m: metrics.cpu?.load?.avg5m || 0,
          avg15m: metrics.cpu?.load?.avg15m || 0,
          percentage: metrics.cpu?.load?.percentage || 0
        },
        temperature: metrics.cpu?.temperature || null
      },
      memory: {
        total: this.formatBytes((metrics.memory?.total || 0) * 1024 * 1024),
        used: this.formatBytes((metrics.memory?.used || 0) * 1024 * 1024),
        free: this.formatBytes((metrics.memory?.free || 0) * 1024 * 1024),
        percentage: metrics.memory?.percentage || 0,
        totalGB: metrics.memory?.totalGB || '0',
        usedGB: metrics.memory?.usedGB || '0',
        freeGB: metrics.memory?.freeGB || '0',
        swap: {
          total: metrics.memory?.swap?.total || 0,
          used: metrics.memory?.swap?.used || 0,
          free: metrics.memory?.swap?.free || 0,
          percentage: metrics.memory?.swap?.percentage || 0
        }
      },
      storage: {
        total: metrics.storage?.total || 'Unknown',
        used: metrics.storage?.used || 'Unknown',
        free: metrics.storage?.free || 'Unknown',
        percentage: metrics.storage?.percentage || 0,
        mount: metrics.storage?.mount || '/',
        inode: metrics.storage?.inode || null
      },
      network: {
        primaryIP: metrics.network?.primaryIP || 'Unknown',
        interfaceCount: metrics.network?.interfaceCount || 0
      },
      process: {
        uptime: metrics.process?.uptime || 'Unknown',
        heap: {
          usedMB: metrics.process?.heap?.usedMB || 0,
          totalMB: metrics.process?.heap?.totalMB || 0
        },
        rss: metrics.process?.rss || 'Unknown'
      },
      processes: metrics.processes || 0,
      timestamp: metrics.timestamp || new Date().toISOString()
    };
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  formatUptime(seconds) {
    if (!seconds) return '0m';
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  subscribe(callback) {
    this.listeners.push(callback);
    
    // Immediately notify with current status
    callback(this.getStatus());
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.getStatus());
      } catch (error) {
        console.error('System info listener error:', error);
      }
    });
  }

  getStatus() {
    return {
      systemInfo: this.systemInfo,
      lastUpdate: this.lastUpdate,
      isLoading: this.isLoading,
      error: this.error,
      isAvailable: !!this.systemInfo
    };
  }

  startMonitoring() {
    // Initial fetch
    this.fetchSystemInfo();
    
    // Start periodic updates (every hour)
    if (!this.updateInterval) {
      this.updateInterval = setInterval(() => {
        this.fetchSystemInfo();
      }, SYSTEM_INFO_INTERVAL);
    }
  }

  stopMonitoring() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  // Manual refresh
  async refreshNow() {
    await this.fetchSystemInfo();
    return this.getStatus();
  }

  // Clear system metrics cache
  async clearCache() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      let headers = { 'Content-Type': 'application/json' };
      const token = authStorage.getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch(`${BACKEND_URL}/api/system/metrics/clear-cache`, {
        method: 'GET',
        signal: controller.signal,
        headers
      });

      clearTimeout(timeoutId);

      const data = await response.json();
      if (data.success) {
        this.systemInfo = null;
        this.notifyListeners();
      }
      return data;
    } catch (error) {
      console.error('Error clearing cache:', error);
      return { success: false, message: error.message };
    }
  }

  // Get formatted last update time
  getFormattedLastUpdate() {
    if (!this.lastUpdate) return 'Never';
    return new Date(this.lastUpdate).toLocaleString();
  }

  // Check if data is stale (older than 2 hours)
  isDataStale() {
    if (!this.lastUpdate) return true;
    const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
    return this.lastUpdate.getTime() < twoHoursAgo;
  }
}

// Export singleton instance
export const systemInfoService = new SystemInfoService();

// React Hook for system information
export const useSystemInfo = () => {
  const [state, setState] = React.useState(systemInfoService.getStatus());

  React.useEffect(() => {
    systemInfoService.startMonitoring();
    const unsubscribe = systemInfoService.subscribe((newState) => {
      setState(newState);
    });

    return () => {
      unsubscribe();
      systemInfoService.stopMonitoring();
    };
  }, []);

  return state;
};

export default systemInfoService;
