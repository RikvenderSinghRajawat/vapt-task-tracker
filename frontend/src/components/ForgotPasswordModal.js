import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import OtpInput from './OtpInput';
import { colors, typography, transitions, shadows, borderRadius, componentStyles } from '../theme/designSystem';


const MailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
  </svg>
);

const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
  </svg>
);

const steps = ['email', 'otp', 'password', 'done'];

const ForgotPasswordModal = ({ open, onClose }) => {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpExpiry, setOtpExpiry] = useState(300);
  const cooldownRef = useRef(null);
  const expiryRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setStep('email');
      setEmail('');
      setUserId('');
      setResetToken('');
      setMaskedEmail('');
      setPassword('');
      setConfirmPassword('');
      setError('');
      setOtpError('');
      setResendCooldown(0);
      setOtpExpiry(300);
      if (cooldownRef.current) clearInterval(cooldownRef.current);
      if (expiryRef.current) clearInterval(expiryRef.current);
    }
  }, [open]);

  const startCooldown = useCallback(() => {
    setResendCooldown(30);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleBackToEmail = useCallback(() => {
    setStep('email');
    setOtpError('');
    setError('');
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    if (expiryRef.current) clearInterval(expiryRef.current);
    setResendCooldown(0);
    setOtpExpiry(300);
  }, []);

  const startOtpExpiry = useCallback(() => {
    setOtpExpiry(300);
    if (expiryRef.current) clearInterval(expiryRef.current);
    expiryRef.current = setInterval(() => {
      setOtpExpiry(prev => {
        if (prev <= 1) {
          clearInterval(expiryRef.current);
          setError('OTP expired. Please request a new one.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleSendOtp = useCallback(async (e) => {
    e?.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgotpassword', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.message || 'Failed to send OTP');
        setLoading(false);
        return;
      }

      if (json.data?.otpRequired) {
        setUserId(json.data.userId);
        setMaskedEmail(json.data.maskedEmail);
        setStep('otp');
        startOtpExpiry();
        startCooldown();
      } else {
        setStep('done');
        setTimeout(() => onClose(), 3000);
      }
    } catch (err) {
      setError('Could not connect to server');
      setLoading(false);
    }
    setLoading(false);
  }, [email, startCooldown, startOtpExpiry, onClose]);

  const handleVerifyOtp = useCallback(async (otp) => {
    if (!otp || otp.length !== 6) return;
    setOtpError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-forgot-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, otp }),
      });
      const json = await res.json();

      if (!res.ok) {
        setOtpError(json.message || 'Invalid OTP');
        setLoading(false);
        return;
      }

      setResetToken(json.data.resetToken);
      setStep('password');
    } catch (err) {
      setOtpError('Could not verify OTP');
      setLoading(false);
    }
    setLoading(false);
  }, [userId]);

  const handleResendOtp = useCallback(async () => {
    if (resendCooldown > 0) return;
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgotpassword', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.message || 'Failed to resend OTP');
        setLoading(false);
        return;
      }

      startOtpExpiry();
      startCooldown();
    } catch (err) {
      setError('Could not connect to server');
    }
    setLoading(false);
  }, [email, resendCooldown, startCooldown, startOtpExpiry]);

  const handleResetPassword = useCallback(async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, password }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.message || 'Failed to reset password');
        setLoading(false);
        return;
      }

      setStep('done');
      setTimeout(() => onClose(), 2500);
    } catch (err) {
      setError('Could not connect to server');
    }
    setLoading(false);
  }, [resetToken, password, confirmPassword, onClose]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
      if (expiryRef.current) clearInterval(expiryRef.current);
    };
  }, []);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
          style={{
            background: colors.background.secondary,
            border: `1px solid ${colors.border.default}`,
            borderRadius: borderRadius.xl,
            padding: '32px',
            width: '100%',
            maxWidth: '420px',
            position: 'relative',
            boxShadow: shadows.elevated,
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              width: '32px',
              height: '32px',
              borderRadius: borderRadius.lg,
              border: `1px solid ${colors.border.subtle}`,
              background: colors.background.tertiary,
              color: colors.text.tertiary,
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: transitions.premium,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = colors.background.hover; e.currentTarget.style.color = colors.text.primary; }}
            onMouseLeave={e => { e.currentTarget.style.background = colors.background.tertiary; e.currentTarget.style.color = colors.text.tertiary; }}
          >✕</button>

          {step === 'email' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: borderRadius.xl,
                  background: `${colors.primary[500]}12`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 12px',
                }}>
                  <LockIcon />
                </div>
                <h2 style={{ color: colors.text.primary, fontSize: '1.125rem', fontWeight: 700, margin: '0 0 4px', letterSpacing: typography.tracking.tight }}>Forgot Password?</h2>
                <p style={{ color: colors.text.tertiary, fontSize: '0.8125rem', margin: 0 }}>Enter your email and we'll send an OTP to reset your password.</p>
              </div>

                <form onSubmit={handleSendOtp}>
                <div style={{ position: 'relative', marginBottom: '16px' }}>
                  <div style={{ position: 'absolute', left: '14px', top: '17px', color: colors.text.tertiary, zIndex: 1 }}>
                    <MailIcon />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Registered email address"
                    required
                    style={{
                      ...componentStyles.input,
                      padding: '14px 14px 14px 42px',
                    }}
                  />
                </div>

                {error && (
                  <p style={{ color: colors.severity.critical, fontSize: '0.75rem', margin: '0 0 12px', textAlign: 'center' }}>{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || !email}
                  style={{
                    ...componentStyles.button.primary,
                    opacity: (loading || !email) ? 0.5 : 1,
                    cursor: (loading || !email) ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'Sending...' : 'Send OTP'}
                </button>
              </form>
            </motion.div>
          )}

          {step === 'otp' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '20px' }}>
                <button onClick={handleBackToEmail} style={{ background: colors.background.tertiary, border: `1px solid ${colors.border.subtle}`, borderRadius: borderRadius.lg, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: colors.text.tertiary, fontSize: '14px', transition: transitions.premium }}
                  onMouseEnter={e => { e.currentTarget.style.background = colors.background.hover; e.currentTarget.style.color = colors.text.primary; }}
                  onMouseLeave={e => { e.currentTarget.style.background = colors.background.tertiary; e.currentTarget.style.color = colors.text.tertiary; }}
                >
                  <ArrowLeftIcon />
                </button>
                <span style={{ color: colors.text.tertiary, fontSize: '0.75rem', fontWeight: 500 }}>Back</span>
              </div>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: borderRadius.xl,
                  background: `${colors.primary[500]}12`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 12px',
                }}>
                  <MailIcon />
                </div>
                <h2 style={{ color: colors.text.primary, fontSize: '1.125rem', fontWeight: 700, margin: '0 0 4px', letterSpacing: typography.tracking.tight }}>Check Your Email</h2>
                <p style={{ color: colors.text.tertiary, fontSize: '0.8125rem', margin: 0 }}>
                  We sent a 6-digit code to <span style={{ color: colors.primary[400], fontWeight: 600 }}>{maskedEmail}</span>
                </p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <OtpInput
                  length={6}
                  error={!!otpError}
                  disabled={loading}
                  onComplete={handleVerifyOtp}
                />
              </div>

              {otpError && (
                <p style={{ color: colors.severity.critical, fontSize: '0.75rem', margin: '0 0 12px', textAlign: 'center' }}>{otpError}</p>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <button
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || loading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: resendCooldown > 0 ? colors.text.muted : colors.primary[400],
                    fontSize: '0.8125rem',
                    cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                    fontWeight: 500,
                    transition: transitions.premium,
                  }}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                </button>
                <span style={{
                  color: otpExpiry < 60 ? colors.severity.critical : colors.text.tertiary,
                  fontSize: '0.75rem',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 500,
                }}>
                  {formatTime(otpExpiry)}
                </span>
              </div>
            </motion.div>
          )}

          {step === 'password' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: borderRadius.xl,
                  background: `${colors.primary[500]}12`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 12px',
                }}>
                  <LockIcon />
                </div>
                <h2 style={{ color: colors.text.primary, fontSize: '1.125rem', fontWeight: 700, margin: '0 0 4px', letterSpacing: typography.tracking.tight }}>Set New Password</h2>
                <p style={{ color: colors.text.tertiary, fontSize: '0.8125rem', margin: 0 }}>Must be at least 6 characters.</p>
              </div>

              <form onSubmit={handleResetPassword}>
                <div style={{ position: 'relative', marginBottom: '14px' }}>
                  <div style={{ position: 'absolute', left: '14px', top: '15px', color: colors.text.tertiary, zIndex: 1 }}>
                    <LockIcon />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="New password"
                    required
                    minLength={6}
                    style={{
                      ...componentStyles.input,
                      padding: '13px 40px 13px 42px',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute', right: '10px', top: '12px',
                      background: 'none', border: 'none', color: colors.text.tertiary,
                      cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500,
                    }}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>

                <div style={{ position: 'relative', marginBottom: '16px' }}>
                  <div style={{ position: 'absolute', left: '14px', top: '15px', color: colors.text.tertiary, zIndex: 1 }}>
                    <LockIcon />
                  </div>
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                    minLength={6}
                    style={{
                      ...componentStyles.input,
                      padding: '13px 40px 13px 42px',
                      border: `1.5px solid ${
                        confirmPassword && password !== confirmPassword
                          ? colors.severity.critical
                          : confirmPassword && password === confirmPassword
                          ? `${colors.severity.low}80`
                          : colors.border.subtle
                      }`,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    style={{
                      position: 'absolute', right: '10px', top: '12px',
                      background: 'none', border: 'none', color: colors.text.tertiary,
                      cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500,
                    }}
                  >
                    {showConfirm ? 'Hide' : 'Show'}
                  </button>
                </div>

                {error && (
                  <p style={{ color: colors.severity.critical, fontSize: '0.75rem', margin: '0 0 12px', textAlign: 'center' }}>{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || !password || !confirmPassword || password !== confirmPassword}
                  style={{
                    ...componentStyles.button.primary,
                    opacity: (loading || !password || !confirmPassword || password !== confirmPassword) ? 0.5 : 1,
                    cursor: (loading || !password || !confirmPassword || password !== confirmPassword) ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            </motion.div>
          )}

          {step === 'done' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', damping: 20, stiffness: 200 }}
              style={{ textAlign: 'center', padding: '16px 0' }}
            >
              <div style={{ marginBottom: '16px' }}>
                <CheckCircleIcon />
              </div>
              <h2 style={{ color: colors.text.primary, fontSize: '1.125rem', fontWeight: 700, margin: '0 0 4px', letterSpacing: typography.tracking.tight }}>{resetToken ? 'Password Reset Successful' : 'Check Your Email'}</h2>
              <p style={{ color: colors.text.tertiary, fontSize: '0.8125rem', margin: 0 }}>
                {resetToken ? 'You can now login with your new password.' : 'If an account exists with this email, you will receive instructions to reset your password.'}
              </p>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ForgotPasswordModal;
