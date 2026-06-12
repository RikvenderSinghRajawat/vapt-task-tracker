const express = require('express');
const router = express.Router();
const {
  getNotifications,
  getUnreadNotifications,
  getUnreadCount,
  markAsRead,
  markAsUnread,
  markAllAsRead,
  deleteNotification,
  replyToNotification,
  getNotificationThread,
  createMentionNotification,
} = require('../controllers/notificationController');
const { protect } = require('../middleware/auth.js');
const { idValidation } = require('../middleware/validation.js');

router.route('/')
  .get(protect, getNotifications);

router.route('/unread')
  .get(protect, getUnreadNotifications);

router.route('/unread-count')
  .get(protect, getUnreadCount);

router.route('/read-all')
  .put(protect, markAllAsRead);

router.route('/reply')
  .post(protect, replyToNotification);

router.route('/mention')
  .post(protect, createMentionNotification);

router.route('/:id')
  .put(protect, idValidation, markAsRead)
  .delete(protect, idValidation, deleteNotification);

router.route('/:id/read')
  .put(protect, idValidation, markAsRead);

router.route('/:id/unread')
  .put(protect, idValidation, markAsUnread);

router.route('/:id/thread')
  .get(protect, idValidation, getNotificationThread);

module.exports = router;
