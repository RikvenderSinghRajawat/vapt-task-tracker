const express = require('express');
const router  = express.Router();
const { protect }              = require('../middleware/auth');
const { createUploader }       = require('../config/upload');
const {
  getTasks, getMyTasks, getTeamTasks,
  getTask, createTask, updateTask, deleteTask,
  addComment, uploadAttachment,
  escalateTask, startTask, completeTask, reopenTask,
  getTaskAnalytics, getTaskActivity,
  rotateCompletedTasks
} = require('../controllers/taskController');

const upload = createUploader('evidence');

// ── List & detail ────────────────────────────────────────────────────────────
router.get('/',          protect, getTasks);
router.get('/my',        protect, getMyTasks);
router.get('/team',      protect, getTeamTasks);
router.get('/analytics', protect, getTaskAnalytics);
router.get('/:id',       protect, getTask);
router.get('/:id/activity', protect, getTaskActivity);

// ── Mutations ─────────────────────────────────────────────────────────────────
router.post('/',     protect, createTask);
router.put('/:id',   protect, updateTask);
router.delete('/:id',protect, deleteTask);

// ── Actions ───────────────────────────────────────────────────────────────────
router.post('/:id/start',    protect, startTask);
router.post('/:id/complete', protect, completeTask);
router.post('/:id/reopen',   protect, reopenTask);
router.post('/:id/escalate', protect, escalateTask);

// ── Maintenance ────────────────────────────────────────────────────────────────
router.post('/rotate-completed', protect, rotateCompletedTasks);

// ── Sub-entities ───────────────────────────────────────────────────────────────
router.post('/:id/comments',    protect, addComment);
router.post('/:id/attachments', protect, upload.single('file'), uploadAttachment);

module.exports = router;
