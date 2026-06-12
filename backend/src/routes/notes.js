const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getNotes, getNote, createNote, updateNote, deleteNote,
  restoreNote, permanentDelete, shareNote, removeShare,
  getSummary, searchUsers, getNoteActiveUsers
} = require('../controllers/noteController');

/**
 * @swagger
 * tags:
 *   name: Notes
 *   description: Personal & Shared Notes Workspace
 */

// Summary & Search
router.get('/summary', protect, getSummary);
router.get('/search-users', protect, searchUsers);

// CRUD
router.route('/')
  .get(protect, getNotes)
  .post(protect, createNote);

router.route('/:id')
  .get(protect, getNote)
  .put(protect, updateNote)
  .delete(protect, deleteNote);

// Restore & Permanent Delete
router.put('/:id/restore', protect, restoreNote);
router.delete('/:id/permanent', protect, permanentDelete);

// Sharing
router.post('/:id/share', protect, shareNote);
router.delete('/:id/share/:userId', protect, removeShare);

// Real-time awareness
router.get('/:id/active-users', protect, getNoteActiveUsers);

module.exports = router;