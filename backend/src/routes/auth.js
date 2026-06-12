const express = require('express');
const router = express.Router();
const {
  register, setupStatus, login, sendLoginOtp, verifyLoginOtp, resendLoginOtp,
  getMe, logout, updatePassword, forgotPassword, verifyForgotPasswordOtp,
  resetPasswordWithOtp, resetPassword, adminSetPassword,
  setupMfa, verifyMfaSetup, validateMfa, disableMfa, refreshToken
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');
const { authLimiter, sensitiveLimiter } = require('../middleware/rateLimiter');
const { registerValidation, loginValidation, otpValidation, resetPasswordValidation } = require('../middleware/validation');

/**
 * @swagger
 * /api/auth/setup-status:
 *   get:
 *     summary: Check if setup is complete
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Setup status
 */
router.get('/setup-status', setupStatus);
/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       201:
 *         description: User registered
 */
router.post('/register', authLimiter, registerValidation, register);
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post('/login', authLimiter, loginValidation, login);
router.post('/send-login-otp', authLimiter, loginValidation, sendLoginOtp);
router.post('/verify-login-otp', authLimiter, otpValidation, verifyLoginOtp);
router.post('/resend-login-otp', authLimiter, resendLoginOtp);
router.post('/refresh', authLimiter, refreshToken);
router.get('/me', protect, getMe);
router.post('/logout', authLimiter, logout);
router.put('/updatepassword', protect, updatePassword);
router.post('/forgotpassword', sensitiveLimiter, forgotPassword);
router.post('/verify-forgot-otp', sensitiveLimiter, otpValidation, verifyForgotPasswordOtp);
router.post('/reset-password-otp', sensitiveLimiter, resetPasswordValidation, resetPasswordWithOtp);
router.post('/reset-password/:resettoken', sensitiveLimiter, resetPassword);
router.post('/mfa/setup', protect, setupMfa);
router.post('/mfa/verify-setup', protect, verifyMfaSetup);
router.post('/mfa/validate', authLimiter, validateMfa);
router.post('/mfa/disable', protect, disableMfa);
router.put('/admin-set-password', protect, authorize('admin', 'vapt_analyst', 'vapt_tl'), adminSetPassword);

module.exports = router;
