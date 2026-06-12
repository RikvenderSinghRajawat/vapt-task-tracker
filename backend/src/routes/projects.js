const express = require('express');
const router = express.Router();
const {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  addTeamMember,
  removeTeamMember,
  addComment
} = require('../controllers/projectController');
const { protect, authorize, checkProjectAccess } = require('../middleware/auth.js');
const { idValidation, createProjectValidation, updateProjectValidation } = require('../middleware/validation.js');
router.route('/')
  .get(protect, getProjects)
  .post(protect, createProjectValidation, createProject);

router.route('/:id')
  .get(protect, checkProjectAccess, idValidation, getProject)
  .put(protect, checkProjectAccess, idValidation, updateProjectValidation, updateProject)
  .delete(protect, authorize('admin', 'vapt_analyst'), idValidation, deleteProject);

router.route('/:id/team')
  .post(protect, checkProjectAccess, addTeamMember);

router.route('/:id/team/:userId')
  .delete(protect, checkProjectAccess, removeTeamMember);

router.route('/:id/comments')
  .post(protect, checkProjectAccess, addComment);

module.exports = router;
