const User = require('../models/User');
const Otp = require('../models/Otp');
const Session = require('../models/Session');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { generateToken, generateRefreshToken, generateMfaToken, verifyToken, verifyRefreshToken } = require('../utils/jwt');
const { generateOtp, hashOtp, verifyOtp, getExpiryDate, isExpired, maskEmail, OTP_EXPIRY_MINUTES, MAX_ATTEMPTS, RESEND_COOLDOWN_SECONDS, MAX_RESENDS } = require('../utils/otp');
const AuditLog = require('../models/AuditLog');
const { sendOtpMail, sendPasswordResetMail } = require('../services/mailService');
const { getSmtpStatus } = require('../config/smtp');

const generateSessionId = () => crypto.randomUUID();
const MAX_ACTIVE_SESSIONS = 2;

function cookieOpts(req, maxAge) {
  return {
    httpOnly: true,
    secure: req.secure,
    sameSite: req.secure ? 'none' : 'lax',
    maxAge
  };
}

async function createSessionRecord(userId, req, refreshTokenHash = '') {
  const sessionId = generateSessionId();
  await Session.create({
    userId,
    sessionId,
    loginTime: new Date(),
    lastActivity: new Date(),
    ip: req.ip || '',
    userAgent: req.get('User-Agent') || '',
    status: 'active',
    refreshTokenHash,
    expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000)
  });
  return sessionId;
}

async function enforceSessionLimit(userId) {
  const activeSessions = await Session.countDocuments({ userId, status: 'active' });
  if (activeSessions >= MAX_ACTIVE_SESSIONS) {
    const oldest = await Session.findOne({ userId, status: 'active' }).sort({ loginTime: 1 });
    if (oldest) {
      oldest.status = 'inactive';
      await oldest.save();
    }
  }
}

async function logAudit(userId, action, req, details = {}) {
  const user = await User.findById(userId);
  await AuditLog.create({
    user: userId,
    action,
    entityType: 'user',
    entityId: userId?.toString(),
    entityName: user?.name || '',
    details,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    status: 'success'
  });
}

exports.setupStatus = async (req, res, next) => {
  try {
    const count = await User.countDocuments({ deletedAt: null });
    res.status(200).json({
      success: true,
      data: { usersExist: count > 0 }
    });
  } catch (error) {
    next(error);
  }
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, department, phone } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'developer',
      department,
      phone
    });

    const sessionId = await createSessionRecord(user._id, req);
    const accessToken = generateToken({ id: user._id.toString(), sessionId });
    const refreshToken = generateRefreshToken({ id: user._id.toString(), sessionId });

    res.cookie('refreshToken', refreshToken, cookieOpts(req, 12 * 60 * 60 * 1000));
    res.cookie('token', accessToken, cookieOpts(req, 30 * 60 * 1000));

    await AuditLog.create({
      user: user._id,
      action: 'create_user',
      entityType: 'user',
      entityId: user._id.toString(),
      entityName: user.name,
      details: { method: 'registration' },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success'
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
        accessToken,
        refreshToken,
        sessionId
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const token = req.body.refreshToken || req.cookies.refreshToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch (error) {
      const message = error?.name === 'TokenExpiredError'
        ? 'Refresh token expired'
        : error?.name === 'FingerprintMismatchError'
        ? 'Session invalidated by server restart'
        : 'Invalid refresh token';
      return res.status(401).json({ success: false, message });
    }

    const userId = decoded?.id || decoded?.userId;
    const sessionId = decoded?.sessionId || decoded?.sid;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    if (decoded?.type && decoded.type !== 'refresh') {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    if (sessionId) {
      const session = await Session.findOne({ sessionId, status: 'active' });
      if (!session) {
        return res.status(401).json({ success: false, message: 'Session has been invalidated. Please login again' });
      }
      session.lastActivity = new Date();
      await session.save();
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'User account is inactive' });
    }

    const accessToken = generateToken({ id: user._id.toString(), sessionId });
    const newRefreshToken = generateRefreshToken({ id: user._id.toString(), sessionId });

    res.cookie('refreshToken', newRefreshToken, cookieOpts(req, 7 * 24 * 60 * 60 * 1000));
    res.cookie('token', accessToken, cookieOpts(req, 15 * 60 * 1000));

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: { accessToken, refreshToken: newRefreshToken }
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Your account has been deactivated' });
    }

    if (user.isLocked()) {
      return res.status(401).json({
        success: false,
        message: 'Account is locked. Please try again later or contact administrator'
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      await user.incLoginAttempts();
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    await user.resetLoginAttempts();

    if (user.mfa_enabled) {
      const mfaToken = generateMfaToken(user._id);
      return res.status(200).json({
        success: true,
        message: 'MFA validation required',
        data: { mfaRequired: true, mfaToken }
      });
    }

    if (req.body.skipOtp !== true) {
    const smtp = getSmtpStatus();
    if (smtp.configured) {
      const recentOtp = await Otp.findOne({
        user: user._id,
        purpose: 'login',
        verified: false,
        expiresAt: { $gt: new Date() },
      }).sort({ createdAt: -1 });

      if (recentOtp && recentOtp.resendCount >= MAX_RESENDS) {
        return res.status(429).json({
          success: false,
          message: 'Maximum OTP requests reached. Try again later.',
        });
      }

      if (recentOtp && recentOtp.lastResentAt) {
        const cooldown = (Date.now() - new Date(recentOtp.lastResentAt).getTime()) / 1000;
        if (cooldown < RESEND_COOLDOWN_SECONDS) {
          return res.status(429).json({
            success: false,
            message: `Please wait ${Math.ceil(RESEND_COOLDOWN_SECONDS - cooldown)}s before requesting a new OTP.`,
          });
        }
      }

      const otp = generateOtp();
      const otpHash = hashOtp(otp);

      if (recentOtp) {
        recentOtp.otpHash = otpHash;
        recentOtp.expiresAt = getExpiryDate();
        recentOtp.attempts = 0;
        recentOtp.resendCount += 1;
        recentOtp.lastResentAt = new Date();
        await recentOtp.save();
      } else {
        await Otp.create({
          user: user._id,
          otpHash,
          purpose: 'login',
          expiresAt: getExpiryDate(),
        });
      }

      await sendOtpMail({
        to: user.email,
        otp,
        name: user.name,
        purpose: 'login',
      }).catch(err => {
        console.error(`[Auth] Failed to send login OTP email to ${user.email}: ${err.message}`);
      });

      await AuditLog.create({
        user: user._id,
        action: 'login_otp_sent',
        entityType: 'user',
        entityId: user._id.toString(),
        entityName: user.name,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        status: 'success',
      });

      return res.status(200).json({
        success: true,
        message: 'OTP sent to your email',
        data: {
          otpRequired: true,
          maskedEmail: maskEmail(user.email),
          userId: user._id.toString(),
        }
      });
    }
    }

    user.lastLogin = Date.now();
    await user.save();

    await enforceSessionLimit(user._id);
    const sessionId = await createSessionRecord(user._id, req);
    const accessToken = generateToken({ id: user._id.toString(), sessionId });
    const refreshToken = generateRefreshToken({ id: user._id.toString(), sessionId });

    res.cookie('refreshToken', refreshToken, cookieOpts(req, 12 * 60 * 60 * 1000));
    res.cookie('token', accessToken, cookieOpts(req, 30 * 60 * 1000));

    await AuditLog.create({
      user: user._id,
      action: 'login',
      entityType: 'user',
      entityId: user._id.toString(),
      entityName: user.name,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success'
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          preferences: user.preferences,
          mfa_enabled: user.mfa_enabled,
          isActive: user.isActive,
          allocatedProjects: user.allocatedProjects || []
        },
        accessToken,
        refreshToken,
        sessionId
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.sendLoginOtp = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account deactivated' });
    }

    if (user.isLocked()) {
      return res.status(401).json({
        success: false,
        message: 'Account is locked. Please try again later'
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      await user.incLoginAttempts();
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    await user.resetLoginAttempts();

    if (user.mfa_enabled) {
      const mfaToken = generateMfaToken(user._id);
      return res.status(200).json({
        success: true,
        message: 'MFA validation required',
        data: { mfaRequired: true, mfaToken }
      });
    }

    const recentOtp = await Otp.findOne({
      user: user._id,
      purpose: 'login',
      verified: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (recentOtp && recentOtp.resendCount >= MAX_RESENDS) {
      return res.status(429).json({
        success: false,
        message: 'Maximum OTP requests reached. Try again later.',
      });
    }

    if (recentOtp && recentOtp.lastResentAt) {
      const cooldown = (Date.now() - new Date(recentOtp.lastResentAt).getTime()) / 1000;
      if (cooldown < RESEND_COOLDOWN_SECONDS) {
        return res.status(429).json({
          success: false,
          message: `Please wait ${Math.ceil(RESEND_COOLDOWN_SECONDS - cooldown)}s before requesting a new OTP.`,
        });
      }
    }

    const otp = generateOtp();
    const otpHash = hashOtp(otp);

    if (recentOtp) {
      recentOtp.otpHash = otpHash;
      recentOtp.expiresAt = getExpiryDate();
      recentOtp.attempts = 0;
      recentOtp.resendCount += 1;
      recentOtp.lastResentAt = new Date();
      await recentOtp.save();
    } else {
      await Otp.create({
        user: user._id,
        otpHash,
        purpose: 'login',
        expiresAt: getExpiryDate(),
      });
    }

    await sendOtpMail({
      to: user.email,
      otp,
      name: user.name,
      purpose: 'login',
    }).catch(err => {
      console.error(`[Auth] Failed to send login OTP email to ${user.email}: ${err.message}`);
    });

    await AuditLog.create({
      user: user._id,
      action: 'login_otp_sent',
      entityType: 'user',
      entityId: user._id.toString(),
      entityName: user.name,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success',
    });

    res.status(200).json({
      success: true,
      message: 'OTP sent to your email',
      data: {
        otpRequired: true,
        maskedEmail: maskEmail(user.email),
        userId: user._id.toString(),
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.verifyLoginOtp = async (req, res, next) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({
        success: false,
        message: 'User ID and OTP are required',
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid session' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account is deactivated' });
    }

    const otpRecord = await Otp.findOne({
      user: user._id,
      purpose: 'login',
      verified: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'OTP expired or not found. Request a new one.',
      });
    }

    otpRecord.attempts += 1;
    await otpRecord.save();

    if (otpRecord.attempts > MAX_ATTEMPTS) {
      otpRecord.expiresAt = new Date();
      await otpRecord.save();
      return res.status(429).json({
        success: false,
        message: 'Too many invalid attempts. Request a new OTP.',
      });
    }

    if (!verifyOtp(otp, otpRecord.otpHash)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please try again.',
      });
    }

    otpRecord.verified = true;
    otpRecord.verifiedAt = new Date();
    await otpRecord.save();

    user.lastLogin = Date.now();
    await user.save();

    await enforceSessionLimit(user._id);
    const sessionId = await createSessionRecord(user._id, req);
    const accessToken = generateToken({ id: user._id.toString(), sessionId });
    const refreshToken = generateRefreshToken({ id: user._id.toString(), sessionId });

    res.cookie('refreshToken', refreshToken, cookieOpts(req, 12 * 60 * 60 * 1000));
    res.cookie('token', accessToken, cookieOpts(req, 30 * 60 * 1000));

    await AuditLog.create({
      user: user._id,
      action: 'login',
      entityType: 'user',
      entityId: user._id.toString(),
      entityName: user.name,
      details: { method: 'otp' },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success',
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          preferences: user.preferences,
          mfa_enabled: user.mfa_enabled,
          isActive: user.isActive,
          allocatedProjects: user.allocatedProjects || [],
        },
        accessToken,
        refreshToken,
        sessionId,
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.resendLoginOtp = async (req, res, next) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid session' });
    }

    const recentOtp = await Otp.findOne({
      user: user._id,
      purpose: 'login',
      verified: false,
    }).sort({ createdAt: -1 });

    if (recentOtp && recentOtp.resendCount >= MAX_RESENDS) {
      return res.status(429).json({
        success: false,
        message: 'Maximum OTP resends reached. Please login again.',
      });
    }

    if (recentOtp && recentOtp.lastResentAt) {
      const cooldown = (Date.now() - new Date(recentOtp.lastResentAt).getTime()) / 1000;
      if (cooldown < RESEND_COOLDOWN_SECONDS) {
        return res.status(429).json({
          success: false,
          message: `Please wait ${Math.ceil(RESEND_COOLDOWN_SECONDS - cooldown)}s`,
        });
      }
    }

    const otp = generateOtp();
    const otpHash = hashOtp(otp);

    if (recentOtp) {
      recentOtp.otpHash = otpHash;
      recentOtp.expiresAt = getExpiryDate();
      recentOtp.attempts = 0;
      recentOtp.resendCount += 1;
      recentOtp.lastResentAt = new Date();
      await recentOtp.save();
    } else {
      await Otp.create({
        user: user._id,
        otpHash,
        purpose: 'login',
        expiresAt: getExpiryDate(),
      });
    }

    await sendOtpMail({
      to: user.email,
      otp,
      name: user.name,
      purpose: 'login',
    }).catch(err => {
      console.error(`[Auth] Failed to resend login OTP email to ${user.email}: ${err.message}`);
    });

    res.status(200).json({
      success: true,
      message: 'OTP resent successfully',
      data: { maskedEmail: maskEmail(user.email) },
    });
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    let sessionId = req.body?.sessionId || req.query?.sessionId;
    let userId = null;

    if (!sessionId) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const decoded = require('../utils/jwt').decodeToken(authHeader.split(' ')[1]);
          sessionId = decoded?.sessionId || decoded?.sid;
          userId = decoded?.id || decoded?.userId;
        } catch (_) {}
      }
    }

    if (sessionId) {
      const session = await Session.findOne({ sessionId });
      if (session) {
        userId = userId || session.userId?.toString();
        session.status = 'inactive';
        await session.save();
      }
    }

    if (userId) {
      await Otp.deleteMany({ user: userId, purpose: 'login', verified: false });
      const user = await User.findById(userId);
      await AuditLog.create({
        user: userId,
        action: 'logout',
        entityType: 'user',
        entityId: userId?.toString(),
        entityName: user?.name || 'unknown',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        status: 'success'
      });
    }

    res.clearCookie('refreshToken');
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  }
};

exports.updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    await Session.updateMany({ userId: user._id, status: 'active' }, { status: 'inactive' });
    const sessionId = await createSessionRecord(user._id, req);
    const accessToken = generateToken({ id: user._id.toString(), sessionId });
    const refreshToken = generateRefreshToken({ id: user._id.toString(), sessionId });

    res.cookie('refreshToken', refreshToken, cookieOpts(req, 12 * 60 * 60 * 1000));
    res.cookie('token', accessToken, cookieOpts(req, 30 * 60 * 1000));

    await AuditLog.create({
      user: req.user._id,
      action: 'change_password',
      entityType: 'user',
      entityId: req.user._id.toString(),
      entityName: req.user.name,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success'
    });

    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
      data: { accessToken, refreshToken, sessionId }
    });
  } catch (error) {
    next(error);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, you will receive instructions to reset your password.',
      });
    }

    const smtp = getSmtpStatus();
    if (!smtp.configured) {
      const resetToken = user.getResetPasswordToken();
      await user.save({ validateBeforeSave: false });

      const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/+$/, '') || 'http://localhost:3000';
      const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;
      await sendPasswordResetMail({ to: user.email, name: user.name, resetUrl });
    } else {
      const recentOtp = await Otp.findOne({
        user: user._id,
        purpose: 'password_reset',
        verified: false,
        expiresAt: { $gt: new Date() },
      }).sort({ createdAt: -1 });

      if (recentOtp && recentOtp.resendCount >= MAX_RESENDS) {
        return res.status(429).json({
          success: false,
          message: 'Maximum OTP requests reached. Try again later.',
        });
      }

      if (recentOtp && recentOtp.lastResentAt) {
        const cooldown = (Date.now() - new Date(recentOtp.lastResentAt).getTime()) / 1000;
        if (cooldown < RESEND_COOLDOWN_SECONDS) {
          return res.status(429).json({
            success: false,
            message: `Please wait ${Math.ceil(RESEND_COOLDOWN_SECONDS - cooldown)}s`,
          });
        }
      }

      const otp = generateOtp();
      const otpHash = hashOtp(otp);

      if (recentOtp) {
        recentOtp.otpHash = otpHash;
        recentOtp.expiresAt = getExpiryDate();
        recentOtp.attempts = 0;
        recentOtp.resendCount += 1;
        recentOtp.lastResentAt = new Date();
        await recentOtp.save();
      } else {
        await Otp.create({
          user: user._id,
          otpHash,
          purpose: 'password_reset',
          expiresAt: getExpiryDate(),
        });
      }

      await sendOtpMail({
        to: user.email,
        otp,
        name: user.name,
        purpose: 'password_reset',
      }).catch(err => {
        console.error(`[Auth] Failed to send password reset OTP email to ${user.email}: ${err.message}`);
      });
    }

    res.status(200).json({
      success: true,
      message: 'If an account exists with this email, you will receive instructions to reset your password.',
      data: smtp.configured
        ? { otpRequired: true, maskedEmail: maskEmail(user.email), userId: user._id.toString() }
        : { otpRequired: false },
    });
  } catch (error) {
    next(error);
  }
};

exports.verifyForgotPasswordOtp = async (req, res, next) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({ success: false, message: 'User ID and OTP are required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid session' });
    }

    const otpRecord = await Otp.findOne({
      user: user._id,
      purpose: 'password_reset',
      verified: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'OTP expired or not found. Request a new one.',
      });
    }

    otpRecord.attempts += 1;
    await otpRecord.save();

    if (otpRecord.attempts > MAX_ATTEMPTS) {
      otpRecord.expiresAt = new Date();
      await otpRecord.save();
      return res.status(429).json({
        success: false,
        message: 'Too many invalid attempts. Request a new OTP.',
      });
    }

    if (!verifyOtp(otp, otpRecord.otpHash)) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    otpRecord.verified = true;
    otpRecord.verifiedAt = new Date();
    await otpRecord.save();

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordToken = hashedResetToken;
    user.resetPasswordExpire = new Date(Date.now() + 15 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: 'OTP verified. You can now reset your password.',
      data: { resetToken },
    });
  } catch (error) {
    next(error);
  }
};

exports.resetPasswordWithOtp = async (req, res, next) => {
  try {
    const { resetToken, password } = req.body;

    if (!resetToken || !password) {
      return res.status(400).json({ success: false, message: 'Reset token and new password required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    }).select('+password');

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    const isSame = await bcrypt.compare(password, user.password);
    if (isSame) {
      return res.status(400).json({
        success: false,
        message: 'New password cannot be the same as current password',
      });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    await Otp.deleteMany({ user: user._id, purpose: 'password_reset' });

    await AuditLog.create({
      user: user._id,
      action: 'reset_password',
      entityType: 'user',
      entityId: user._id.toString(),
      entityName: user.name,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success',
    });

    res.status(200).json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { password } = req.body;

    const hashedToken = crypto.createHash('sha256').update(req.params.resettoken).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    await AuditLog.create({
      user: user._id,
      action: 'reset_password',
      entityType: 'user',
      entityId: user._id.toString(),
      entityName: user.name,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success'
    });

    res.status(200).json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    next(error);
  }
};

exports.adminSetPassword = async (req, res, next) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({ email, deletedAt: null });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // VAPT cannot reset passwords for Admin or Super Admin
    const isVapt = req.user.role === 'vapt_analyst' || req.user.role === 'vapt_tl';
    if (isVapt && (user.role === 'admin' || user.role === 'super_admin')) {
      return res.status(403).json({
        success: false,
        message: 'VAPT users cannot reset passwords for Admin or Super Admin accounts'
      });
    }

    user.password = newPassword;
    await user.save();

    const smtp = getSmtpStatus();
    if (smtp.configured) {
      const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/+$/, '') || 'http://localhost:3000';
      const resetToken = user.getResetPasswordToken();
      await user.save({ validateBeforeSave: false });
      const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;
      await sendPasswordResetMail({ to: user.email, name: user.name, resetUrl }).catch(() => {});
    }

    await AuditLog.create({
      user: req.user._id,
      action: 'admin_set_password',
      entityType: 'user',
      entityId: user._id.toString(),
      entityName: user.name,
      details: { targetEmail: email },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success'
    });

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};

exports.setupMfa = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const secret = speakeasy.generateSecret({
      name: `VAPT Tracker (${user.email})`,
      issuer: 'VAPT Tracker'
    });

    user.mfa_secret = secret.base32;
    user.mfa_enabled = false;
    await user.save();

    const qrCodeDataUrl = await qrcode.toDataURL(secret.otpauth_url);

    res.status(200).json({
      success: true,
      message: 'MFA setup generated',
      data: { otpauthUrl: secret.otpauth_url, qrCodeDataUrl }
    });
  } catch (error) {
    next(error);
  }
};

exports.verifyMfaSetup = async (req, res, next) => {
  try {
    const { code } = req.body;
    const user = await User.findById(req.user._id);

    const verified = speakeasy.totp.verify({
      secret: user.mfa_secret,
      encoding: 'base32',
      token: code,
      window: Number(process.env.TOTP_WINDOW || 1)
    });

    if (!verified) {
      return res.status(400).json({ success: false, message: 'Invalid MFA code' });
    }

    const recoveryCodes = Array.from({ length: 8 }, () => crypto.randomBytes(5).toString('hex').toUpperCase());
    user.mfa_recovery_codes = await Promise.all(recoveryCodes.map((value) => bcrypt.hash(value, 12)));
    user.mfa_enabled = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'MFA enabled',
      data: { recoveryCodes }
    });
  } catch (error) {
    next(error);
  }
};

exports.validateMfa = async (req, res, next) => {
  try {
    const { mfaToken, code } = req.body;
    const decoded = verifyToken(mfaToken);

    if (decoded.purpose !== 'mfa_pending') {
      return res.status(401).json({ success: false, message: 'Invalid MFA token' });
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.mfa_enabled) {
      return res.status(401).json({ success: false, message: 'Invalid MFA session' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.mfa_secret,
      encoding: 'base32',
      token: code,
      window: Number(process.env.TOTP_WINDOW || 1)
    });

    if (!verified) {
      return res.status(401).json({ success: false, message: 'Invalid MFA code' });
    }

    await user.resetLoginAttempts();
    user.lastLogin = Date.now();
    await user.save();

    await enforceSessionLimit(user._id);
    const sessionId = await createSessionRecord(user._id, req);
    const accessToken = generateToken({ id: user._id.toString(), sessionId });
    const refreshToken = generateRefreshToken({ id: user._id.toString(), sessionId });

    res.cookie('refreshToken', refreshToken, cookieOpts(req, 12 * 60 * 60 * 1000));
    res.cookie('token', accessToken, cookieOpts(req, 30 * 60 * 1000));

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, preferences: user.preferences, mfa_enabled: user.mfa_enabled },
        accessToken,
        refreshToken,
        sessionId
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.disableMfa = async (req, res, next) => {
  try {
    const { code } = req.body;
    const user = await User.findById(req.user._id);

    const verified = speakeasy.totp.verify({
      secret: user.mfa_secret,
      encoding: 'base32',
      token: code,
      window: Number(process.env.TOTP_WINDOW || 1)
    });

    if (!verified) {
      return res.status(400).json({ success: false, message: 'Invalid MFA code' });
    }

    user.mfa_enabled = false;
    user.mfa_secret = null;
    user.mfa_recovery_codes = [];
    await user.save();

    res.status(200).json({ success: true, message: 'MFA disabled' });
  } catch (error) {
    next(error);
  }
};
