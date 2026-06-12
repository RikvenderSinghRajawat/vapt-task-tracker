import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import LoginBrandPanel from '../components/branding/LoginBrandPanel';
import CyberThreatBackground from '../components/CyberThreatBackground';
import OtpInput from '../components/OtpInput';
import ForgotPasswordModal from '../components/ForgotPasswordModal';
import { colors, typography, transitions } from '../theme/designSystem';

const tagline = "Everything You Secure Starts Here";

const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
  </svg>
);

const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const EyeIcon = ({ closed }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {closed ? (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    ) : (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    )}
  </svg>
);

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const AlertTriangle = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.severity.high} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const keyframes = `
@keyframes shake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-5px); } 40% { transform: translateX(5px); } 60% { transform: translateX(-3px); } 80% { transform: translateX(3px); } }
@keyframes shine { 0% { left: -50%; } 100% { left: 150%; } }
`;

const inputSx = (focused, hasValue) => ({
  width: '100%',
  padding: '18px 18px 6px 42px',
  background: 'rgba(8, 12, 18, 0.85)',
  border: `1.5px solid ${focused ? colors.primary[400] : hasValue ? `${colors.primary[400]}50` : 'rgba(48, 54, 61, 0.6)'}`,
  borderRadius: '10px',
  outline: 'none',
  color: '#FFFFFF',
  fontSize: '0.875rem',
  fontFamily: typography.fontFamily.sans,
  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
  boxSizing: 'border-box',
  lineHeight: 1.5,
  boxShadow: focused ? `0 0 0 2px ${colors.primary[400]}18, 0 0 20px ${colors.primary[400]}06, inset 0 0 20px rgba(0,0,0,0.3)` : 'inset 0 0 20px rgba(0,0,0,0.3)',
});

const Login = () => {
  const navigate = useNavigate();
  const { login, verifyOtp, resendOtp, cancelOtp, isAuthenticated, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [showOtpStep, setShowOtpStep] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpMaskedEmail, setOtpMaskedEmail] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpExpiry, setOtpExpiry] = useState(300);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const cooldownRef = useRef(null);
  const expiryRef = useRef(null);
  const pwRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated && !authLoading) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
      if (expiryRef.current) clearInterval(expiryRef.current);
    };
  }, []);

  const startCooldown = useCallback(() => {
    setResendCooldown(30);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const startOtpExpiry = useCallback(() => {
    setOtpExpiry(300);
    if (expiryRef.current) clearInterval(expiryRef.current);
    expiryRef.current = setInterval(() => {
      setOtpExpiry(prev => {
        if (prev <= 1) {
          clearInterval(expiryRef.current);
          setOtpError('OTP expired. Please login again.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handleChange = useCallback((e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  const checkCapsLock = useCallback((e) => {
    if (e.getModifierState) setCapsLock(e.getModifierState('CapsLock'));
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    setOtpError('');
    setLoading(true);
    try {
      const result = await login(formData.email, formData.password, null, null, false);
      if (result.success) {
        if (result.otpRequired) {
          setOtpMaskedEmail(result.maskedEmail);
          setShowOtpStep(true);
          startOtpExpiry();
          startCooldown();
        } else {
          navigate('/dashboard', { replace: true });
        }
      } else {
        setError(result.message);
      }
    } catch (err) {
      let msg = 'Login failed. Please try again.';
      if (err.response?.data?.message) msg = err.response.data.message;
      else if (err.message === 'Failed to fetch') msg = 'Could not connect to the server.';
      else if (err.message) msg = err.message;
      setError(msg);
    }
    setLoading(false);
  }, [formData, login, isAuthenticated, navigate, startCooldown, startOtpExpiry]);

  const handleOtpComplete = useCallback(async (otp) => {
    if (!otp || otp.length !== 6) return;
    setOtpError('');
    setOtpLoading(true);
    const result = await verifyOtp(otp);
    if (result.success) {
      navigate('/dashboard', { replace: true });
    } else {
      setOtpError(result.message || 'Invalid OTP');
      setOtpLoading(false);
    }
  }, [verifyOtp]);

  const handleResendOtp = useCallback(async () => {
    if (resendCooldown > 0) return;
    setOtpError('');
    setOtpLoading(true);
    const result = await resendOtp();
    setOtpLoading(false);
    if (result.success) {
      startOtpExpiry();
      startCooldown();
    } else {
      setOtpError(result.message || 'Failed to resend OTP');
    }
  }, [resendCooldown, resendOtp, startCooldown, startOtpExpiry]);

  const handleBackToLogin = useCallback(() => {
    cancelOtp();
    setShowOtpStep(false);
    setOtpError('');
    setOtpMaskedEmail('');
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    if (expiryRef.current) clearInterval(expiryRef.current);
  }, [cancelOtp]);

  const emF = focused === 'email', emV = !!formData.email;
  const pwF = focused === 'password', pwV = !!formData.password;

  return (
    <div style={{
      minHeight: '100vh', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center',
      background: colors.background.primary, overflow: 'hidden', position: 'relative',
      fontFamily: typography.fontFamily.sans,
    }}>
      <style>{keyframes}</style>

      <CyberThreatBackground />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'relative', zIndex: 2,
          width: 400, maxWidth: '90vw',
          background: 'rgba(8, 12, 18, 0.88)',
          backdropFilter: 'blur(28px)',
          border: `1px solid rgba(48, 54, 61, 0.5)`,
          borderRadius: '16px',
          padding: '40px 36px',
          boxShadow: `0 32px 64px rgba(0,0,0,0.5), 0 0 0 1px ${colors.primary[400]}08, 0 0 40px ${colors.primary[400]}04`,
        }}
      >
        <div style={{
          position: 'absolute', inset: -1,
          borderRadius: '17px', padding: 1,
          background: `linear-gradient(135deg, ${colors.primary[400]}50, transparent 30%, transparent 70%, ${colors.primary[500]}20)`,
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude',
          WebkitMaskComposite: 'xor',
          pointerEvents: 'none',
        }} />

        <AnimatePresence mode="wait">
          {!showOtpStep ? (
            <motion.div
              key="login-form"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.25 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
            >
              <LoginBrandPanel />

              <div style={{ textAlign: 'center' }}>
                <span style={{ color: colors.primary[300], fontSize: '0.6875rem', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, opacity: 0.9 }}>
                  {tagline}
                </span>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -8, height: 0 }}
                    transition={{ duration: 0.25 }}
                    style={{ padding: '10px 14px', background: `${colors.severity.critical}12`, border: `1px solid ${colors.severity.critical}30`, borderRadius: '10px', color: colors.severity.critical, fontSize: '0.8125rem', textAlign: 'center', animation: 'shake 0.4s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    <AlertTriangle /> {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: emF ? colors.primary[300] : 'rgba(255,255,255,0.35)', transition: 'color 0.2s ease', zIndex: 1, pointerEvents: 'none' }}>
                    <MailIcon />
                  </div>
                  <input type="email" name="email" required autoComplete="email" value={formData.email} onChange={handleChange} onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} style={inputSx(emF, emV)} />
                  <motion.label initial={false} animate={{ y: emF || emV ? -22 : 0, scale: emF || emV ? 0.82 : 1, opacity: emF || emV ? 1 : 0 }} transition={{ duration: 0.18, ease: 'easeOut' }} style={{ position: 'absolute', left: 42, top: '50%', marginTop: 0, color: emF ? colors.primary[300] : 'rgba(255,255,255,0.5)', fontSize: '0.8125rem', fontWeight: 500, pointerEvents: 'none', transformOrigin: 'left center', lineHeight: 1, whiteSpace: 'nowrap' }}>
                    Email address
                  </motion.label>
                </div>

                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: pwF ? colors.primary[300] : 'rgba(255,255,255,0.35)', transition: 'color 0.2s ease', zIndex: 1, pointerEvents: 'none' }}>
                    <LockIcon />
                  </div>
                  <input ref={pwRef} type={showPassword ? 'text' : 'password'} name="password" required autoComplete="current-password" value={formData.password} onChange={handleChange} onFocus={() => setFocused('password')} onBlur={() => setFocused(null)} onKeyUp={checkCapsLock} style={{ ...inputSx(pwF, pwV), paddingRight: 40 }} />
                  <motion.label initial={false} animate={{ y: pwF || pwV ? -22 : 0, scale: pwF || pwV ? 0.82 : 1, opacity: pwF || pwV ? 1 : 0 }} transition={{ duration: 0.18, ease: 'easeOut' }} style={{ position: 'absolute', left: 42, top: '50%', marginTop: 0, color: pwF ? colors.primary[300] : 'rgba(255,255,255,0.5)', fontSize: '0.8125rem', fontWeight: 500, pointerEvents: 'none', transformOrigin: 'left center', lineHeight: 1, whiteSpace: 'nowrap' }}>
                    Password
                  </motion.label>
                  <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex={-1} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: 4, display: 'flex', alignItems: 'center', zIndex: 1, transition: transitions.premium }} onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.65)'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}>
                    <EyeIcon closed={!showPassword} />
                  </button>
                </div>

                <AnimatePresence>
                  {capsLock && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: colors.severity.high, paddingLeft: 4 }}>
                      <AlertTriangle /> Caps Lock is ON
                    </motion.div>
                  )}
                </AnimatePresence>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'rgba(255,255,255,0.55)', fontSize: '0.8125rem', userSelect: 'none' }}>
                    <div onClick={() => setRemember(!remember)} style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, background: remember ? colors.primary[500] : 'transparent', border: `1.5px solid ${remember ? colors.primary[500] : colors.border.default}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: transitions.premium, cursor: 'pointer' }}>
                      {remember && <span style={{ color: '#fff', display: 'flex' }}><CheckIcon /></span>}
                    </div>
                    Remember me
                  </label>
                  <div onClick={() => setShowForgotPassword(true)} style={{ color: colors.primary[400], textDecoration: 'none', fontSize: '0.8125rem', fontWeight: 500, transition: transitions.premium, cursor: 'pointer', background: 'none', border: 'none' }}>
                    Forgot Password?
                  </div>
                </div>

                <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '10px', marginTop: 14 }}>
                  <motion.button type="submit" disabled={loading} whileHover={!loading ? { scale: 1.01, y: -1 } : {}} whileTap={!loading ? { scale: 0.98 } : {}} style={{
                    width: '100%', padding: '14px 20px',
                    background: `linear-gradient(135deg, ${colors.primary[500]} 0%, ${colors.primary[700]} 100%)`,
                    border: 'none', borderRadius: '10px', color: '#fff', fontSize: '0.8125rem',
                    fontWeight: 600, letterSpacing: '0.04em', cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1, transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    fontFamily: typography.fontFamily.sans, position: 'relative', overflow: 'hidden',
                    boxShadow: !loading ? `0 4px 16px ${colors.primary[500]}25` : 'none',
                  }}>
                    <div style={{ position: 'absolute', top: 0, bottom: 0, width: '40%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)', animation: loading ? 'none' : 'shine 2.5s ease-in-out infinite', pointerEvents: 'none' }} />
                    <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      {loading ? (
                        <>
                          <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.6s linear infinite', display: 'inline-block' }} />
                          Signing in...
                        </>
                      ) : 'Sign In'}
                    </span>
                  </motion.button>
                </div>

                <div style={{ textAlign: 'center', marginTop: 2 }}>
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6875rem', letterSpacing: '0.05em' }}>
                    Press <span style={{ color: 'rgba(255,255,255,0.5)' }}>Enter</span> to sign in
                  </span>
                </div>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="otp-step"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.25 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 20, minHeight: 360 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={handleBackToLogin} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(48,54,61,0.4)', borderRadius: '8px', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94a3b8', fontSize: '14px', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#f1f5f9'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#94a3b8'; }}
                >
                  <ArrowLeftIcon />
                </button>
                <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 500 }}>Back to login</span>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 52, height: 52, borderRadius: '16px', background: 'rgba(56, 189, 248, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <ShieldIcon />
                </div>
                <h2 style={{ color: '#f1f5f9', fontSize: '1rem', fontWeight: 600, margin: '0 0 4px' }}>Verify Your Identity</h2>
                <p style={{ color: '#94a3b8', fontSize: '0.8125rem', margin: 0 }}>
                  We sent a code to <span style={{ color: '#38bdf8', fontWeight: 500 }}>{otpMaskedEmail}</span>
                </p>
              </div>

              <div style={{ padding: '16px 0' }}>
                <OtpInput
                  length={6}
                  error={!!otpError}
                  disabled={otpLoading}
                  onComplete={handleOtpComplete}
                />
              </div>

              {otpError && (
                <p style={{ color: '#ef4444', fontSize: '0.75rem', margin: '-8px 0 0', textAlign: 'center', animation: 'shake 0.4s ease' }}>{otpError}</p>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
                <button onClick={handleResendOtp} disabled={resendCooldown > 0 || otpLoading} style={{ background: 'none', border: 'none', color: resendCooldown > 0 ? '#475569' : '#38bdf8', fontSize: '0.8125rem', cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer', fontWeight: 500, padding: 0 }}>
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                </button>
                <span style={{ color: otpExpiry < 60 ? '#ef4444' : '#64748b', fontSize: '0.75rem', fontFamily: "'JetBrains Mono', monospace" }}>
                  {formatTime(otpExpiry)}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <ForgotPasswordModal open={showForgotPassword} onClose={() => setShowForgotPassword(false)} />

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px rgba(8, 12, 18, 0.95) inset !important;
          -webkit-text-fill-color: #FFFFFF !important;
          caret-color: #FFFFFF !important;
          background-color: rgba(8, 12, 18, 0.95) !important;
          background-clip: content-box !important;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>
    </div>
  );
};

export default Login;
