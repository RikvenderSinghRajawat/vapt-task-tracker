const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  updateProfile
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth.js');
const { idValidation, updateUserValidation, registerValidation } = require('../middleware/validation.js');

router.route('/')
  .get(protect, authorize('admin', 'super_admin', 'vapt_analyst', 'vapt_tl', 'project_manager'), getUsers)
  .post(protect, authorize('admin', 'vapt_analyst', 'vapt_tl'), registerValidation, createUser);

router.route('/profile')
  .put(protect, updateProfile);

router.route('/:id')
  .get(protect, authorize('admin', 'vapt_analyst', 'vapt_tl', 'project_manager'), idValidation, getUser)
  .put(protect, authorize('admin', 'vapt_analyst', 'vapt_tl', 'project_manager', 'developer'), idValidation, updateUserValidation, updateUser)
  .delete(protect, authorize('admin', 'vapt_analyst', 'vapt_tl'), idValidation, deleteUser);

module.exports = router;
