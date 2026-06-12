import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { colors, borderRadius, transitions } from '../theme/designSystem';

const OtpInput = ({ length = 6, onComplete, onOtpChange, error, disabled }) => {
  const [otp, setOtp] = useState(Array(length).fill(''));
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (inputRefs.current[0]) inputRefs.current[0].focus();
  }, []);

  const handleChange = useCallback((index, value) => {
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    const otpStr = newOtp.join('');
    if (onOtpChange) onOtpChange(otpStr);

    if (value && index < length - 1) {
      setActiveIndex(index + 1);
      inputRefs.current[index + 1]?.focus();
    }

    if (otpStr.length === length && otpStr.split('').every(d => d !== '')) {
      if (onComplete) onComplete(otpStr);
    }
  }, [otp, length, onComplete, onOtpChange]);

  const handleKeyDown = useCallback((index, e) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        setActiveIndex(index - 1);
        inputRefs.current[index - 1]?.focus();
        if (onOtpChange) onOtpChange(newOtp.join(''));
      } else {
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
        if (onOtpChange) onOtpChange(newOtp.join(''));
      }
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      setActiveIndex(index - 1);
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < length - 1) {
      setActiveIndex(index + 1);
      inputRefs.current[index + 1]?.focus();
    }
  }, [otp, onOtpChange]);

  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text/plain').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;

    const newOtp = Array(length).fill('');
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i];
    }
    setOtp(newOtp);

    const otpStr = newOtp.join('');
    if (onOtpChange) onOtpChange(otpStr);

    const nextIndex = Math.min(pasted.length, length - 1);
    setActiveIndex(nextIndex);
    inputRefs.current[nextIndex]?.focus();

    if (pasted.length === length) {
      if (onComplete) onComplete(otpStr);
    }
  }, [length, onComplete, onOtpChange]);

  const handleFocus = useCallback((index) => {
    setActiveIndex(index);
  }, []);

  return (
    <div style={{
      display: 'flex',
      gap: '10px',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
    }}>
      {otp.map((digit, index) => (
        <motion.div
          key={index}
          animate={error ? { x: [0, -4, 4, -2, 2, 0] } : {}}
          transition={{ duration: 0.4 }}
          style={{ position: 'relative' }}
        >
          <input
            ref={el => inputRefs.current[index] = el}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={1}
            value={digit}
            onChange={e => handleChange(index, e.target.value)}
            onKeyDown={e => handleKeyDown(index, e)}
            onPaste={index === 0 ? handlePaste : undefined}
            onFocus={() => handleFocus(index)}
            disabled={disabled}
            style={{
              width: '48px',
              height: '56px',
              textAlign: 'center',
              fontSize: '1.375rem',
              fontFamily: "'JetBrains Mono', 'Courier New', monospace",
              fontWeight: 600,
              color: colors.text.primary,
              background: digit
                ? `${colors.primary[500]}14`
                : colors.background.tertiary,
              border: `2px solid ${
                error
                  ? colors.severity.critical
                  : digit
                  ? `${colors.primary[500]}80`
                  : activeIndex === index
                  ? `${colors.primary[500]}99`
                  : colors.border.subtle
              }`,
              borderRadius: borderRadius.lg,
              outline: 'none',
              transition: transitions.premium,
              caretColor: 'transparent',
              cursor: disabled ? 'not-allowed' : 'text',
              opacity: disabled ? 0.5 : 1,
              boxShadow: activeIndex === index
                ? `0 0 0 3px ${colors.primary[500]}18, 0 0 15px ${colors.primary[500]}08`
                : 'none',
            }}
          />
          {activeIndex === index && !digit && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
              style={{
                position: 'absolute',
                bottom: '14px',
                left: '50%',
                width: '20px',
                height: '2px',
                background: colors.primary[400],
                borderRadius: '1px',
                transform: 'translateX(-50%)',
              }}
            />
          )}
        </motion.div>
      ))}
    </div>
  );
};

export default OtpInput;
