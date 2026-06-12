import socketService from './socketService';
import { notificationAPI } from './api';
import { authStorage } from './authStorage';

class NotificationService {
  constructor() {
    this.listeners = new Map();
    this.unreadCount = 0;
    this.initialized = false;
    this.pollInterval = null;
    this.pollingActive = false;
  }

  async init(userId) {
    if (this.initialized) return;
    this.initialized = true;

    socketService.on('notification', (data) => {
      this.handleIncomingNotification(data);
    });

    socketService.on('notification_receipt', (data) => {
      this.notifyListeners('receipt', data);
    });

    socketService.on('notification_mention', (data) => {
      this.handleIncomingNotification(data);
    });

    if (userId) {
      socketService.joinUserRoom(userId);
    }

    await this.fetchUnreadCount();
    this.startPolling();
  }

  destroy() {
    this.stopPolling();
    this.listeners.clear();
    this.initialized = false;
  }

  startPolling(intervalMs = 30000) {
    if (this.pollingActive) return;
    this.pollingActive = true;
    this.pollInterval = setInterval(() => {
      this.fetchUnreadCount();
    }, intervalMs);
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.pollingActive = false;
  }

  async fetchUnreadCount() {
    if (!authStorage.getAccessToken()) return;
    try {
      const result = await notificationAPI.getUnreadCount();
      const count = result?.count ?? result?.data?.count ?? 0;
      if (count !== this.unreadCount) {
        this.unreadCount = count;
        this.notifyListeners('unread', count);
      }
    } catch (e) {}
  }

  async fetchUnreadNotifications() {
    if (!authStorage.getAccessToken()) return [];
    try {
      return await notificationAPI.getUnreadNotifications();
    } catch (e) {
      return [];
    }
  }

  async fetchNotifications(params = {}) {
    if (!authStorage.getAccessToken()) return { data: [], total: 0, page: 1, pages: 1 };
    try {
      return await notificationAPI.getNotifications(params);
    } catch (e) {
      return { data: [], total: 0, page: 1, pages: 1 };
    }
  }

  handleIncomingNotification(data) {
    if (data.isRead) return;
    this.unreadCount++;
    this.notifyListeners('new', data);
    this.notifyListeners('unread', this.unreadCount);
  }

  async markAsRead(id) {
    try {
      await notificationAPI.markAsRead(id);
      this.unreadCount = Math.max(0, this.unreadCount - 1);
      this.notifyListeners('unread', this.unreadCount);
      this.notifyListeners('read', id);
    } catch (e) {}
  }

  async markAsUnread(id) {
    try {
      await notificationAPI.markAsUnread(id);
      this.unreadCount++;
      this.notifyListeners('unread', this.unreadCount);
    } catch (e) {}
  }

  async markAllAsRead() {
    try {
      await notificationAPI.markAllAsRead();
      this.unreadCount = 0;
      this.notifyListeners('unread', 0);
      this.notifyListeners('readAll');
    } catch (e) {}
  }

  async deleteNotification(id) {
    try {
      await notificationAPI.deleteNotification(id);
      this.unreadCount = Math.max(0, this.unreadCount - 1);
      this.notifyListeners('unread', this.unreadCount);
      this.notifyListeners('delete', id);
    } catch (e) {
      throw e;
    }
  }

  async replyToNotification(parentId, message) {
    try {
      return await notificationAPI.replyToNotification(parentId, message);
    } catch (e) {
      throw e;
    }
  }

  async getThread(id) {
    try {
      return await notificationAPI.getThread(id);
    } catch (e) {
      return [];
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => {
      this.off(event, callback);
    };
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  notifyListeners(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => cb(data));
    }
  }

  getUnreadCount() {
    return this.unreadCount;
  }
}

const notificationService = new NotificationService();
export default notificationService;
