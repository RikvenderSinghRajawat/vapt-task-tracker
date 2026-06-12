const { body, param, query } = require('express-validator');
const validate = require('./validate');

exports.registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['admin', 'vapt_analyst', 'vapt_tl', 'developer', 'project_manager', 'business_analyst', 'read_only']),
  validate
];

exports.loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').exists().withMessage('Password is required'),
  validate
];

exports.otpValidation = [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
    .isNumeric().withMessage('OTP must be numeric'),
  validate
];

exports.resetPasswordValidation = [
  body('resetToken').notEmpty().withMessage('Reset token is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  validate
];

exports.updateUserValidation = [
  param('id').isString().notEmpty().withMessage('Invalid user ID'),
  body('name').optional().trim().notEmpty(),
  body('email').optional().isEmail(),
  body('role').optional().isIn(['admin', 'vapt_analyst', 'vapt_tl', 'developer', 'project_manager', 'business_analyst', 'read_only']),
  body('allocatedProjects').optional().isArray(),
  body('allocatedProjects.*').optional().isMongoId(),
  validate
];

exports.createProjectValidation = [
  body('name').trim().notEmpty().withMessage('Project name is required'),
  body('organization').trim().notEmpty().withMessage('Organization is required'),
  body('assessmentType').isIn(['VAPT', 'SAST', 'DAST', 'PenTest', 'Code Review', 'Red Teaming', 'Blue Teaming', 'Other']),
  body('manager').optional().isString().notEmpty().withMessage('Invalid manager ID'),
  body('startDate').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid start date'),
  validate
];

exports.updateProjectValidation = [
  param('id').isString().notEmpty().withMessage('Invalid project ID'),
  body('name').optional().trim().notEmpty(),
  body('status').optional().isIn(['planning', 'received', 'in_progress', 'remediation', 'retest', 'paused', 'completed', 'closed']),
  body('priority').optional().isIn(['critical', 'high', 'medium', 'low']),
  validate
];

exports.createFindingValidation = [
  param('projectId').isString().notEmpty().withMessage('Invalid project ID'),
  body('title').trim().notEmpty().withMessage('Finding title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('severity').isIn(['critical', 'high', 'medium', 'low', 'info']).withMessage('Invalid severity'),
  body('status').optional().isIn(['open', 'in_progress', 'under_review', 'resolved', 'closed', 'reopened', 'duplicate', 'accepted_risk', 'rejected', 'deferred']),
  body('assignee').optional().isString().notEmpty(),
  validate
];

exports.updateFindingValidation = [
  param('projectId').isString().notEmpty().withMessage('Invalid project ID'),
  param('id').isString().notEmpty().withMessage('Invalid finding ID'),
  body('title').optional().trim().notEmpty(),
  body('severity').optional().isIn(['critical', 'high', 'medium', 'low', 'info']),
  body('status').optional().isIn(['open', 'in_progress', 'under_review', 'resolved', 'closed', 'reopened', 'duplicate', 'accepted_risk', 'rejected', 'deferred']),
  validate
];

exports.createReportValidation = [
  param('projectId').isString().notEmpty().withMessage('Invalid project ID'),
  body('name').trim().notEmpty().withMessage('Report name is required'),
  body('type').isIn(['initial', 'remediation', 'retest', 'final', 'interim', 'executive', 'technical']),
  validate
];

exports.updateReportValidation = [
  param('projectId').isString().notEmpty().withMessage('Invalid project ID'),
  param('id').isString().notEmpty().withMessage('Invalid report ID'),
  body('name').optional().trim().notEmpty(),
  body('status').optional().isIn(['draft', 'in_review', 'approved', 'published', 'archived']),
  validate
];

exports.createMilestoneValidation = [
  param('projectId').isString().notEmpty().withMessage('Invalid project ID'),
  body('title').trim().notEmpty().withMessage('Milestone title is required'),
  body('type').isIn(['code_received', 'assessment_start', 'report_submitted', 'patch_received', 'retest_start', 'retest_complete', 'verified_closed', 'custom']),
  body('dueDate').isISO8601().withMessage('Invalid due date'),
  validate
];

exports.idValidation = [
  param('id').isString().notEmpty().withMessage('Invalid ID'),
  validate
];

exports.projectIdValidation = [
  param('projectId').isString().notEmpty().withMessage('Invalid project ID'),
  validate
];
