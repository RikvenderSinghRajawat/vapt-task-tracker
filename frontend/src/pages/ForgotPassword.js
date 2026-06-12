import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { userAPI } from '../services/restService';
import EKavachLogo from '../components/EKavachLogo';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await userAPI.resetPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    container: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      padding: '20px'
    },
    card: {
      background: '#1e293b',
      borderRadius: '16px',
      padding: '40px',
      width: '100%',
      maxWidth: '420px',
      border: '1px solid #334155',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
    },
    title: {
      color: '#f1f5f9',
      fontSize: '24px',
      fontWeight: 700,
      textAlign: 'center',
      marginTop: '24px',
      marginBottom: '8px'
    },
    subtitle: {
      color: '#94a3b8',
      fontSize: '14px',
      textAlign: 'center',
      marginBottom: '32px',
      lineHeight: 1.5
    },
    label: {
      color: '#94a3b8',
      fontSize: '13px',
      fontWeight: 500,
      marginBottom: '6px',
      display: 'block'
    },
    input: {
      width: '100%',
      padding: '12px 16px',
      borderRadius: '10px',
      border: '1px solid #334155',
      background: '#0f172a',
      color: '#f1f5f9',
      fontSize: '14px',
      outline: 'none',
      boxSizing: 'border-box',
      transition: 'border-color 0.2s'
    },
    submitBtn: {
      width: '100%',
      padding: '12px',
      borderRadius: '10px',
      border: 'none',
      background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
      color: '#fff',
      fontSize: '15px',
      fontWeight: 600,
      cursor: 'pointer',
      marginTop: '24px',
      opacity: loading ? 0.7 : 1
    },
    backLink: {
      display: 'block',
      textAlign: 'center',
      color: '#64748b',
      fontSize: '13px',
      marginTop: '20px',
      textDecoration: 'none'
    },
    error: {
      color: '#f87171',
      fontSize: '13px',
      textAlign: 'center',
      marginTop: '12px'
    },
    successBox: {
      textAlign: 'center',
      padding: '20px 0'
    },
    successIcon: {
      fontSize: '48px',
      marginBottom: '16px'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <EKavachLogo />
        <h1 style={styles.title}>Forgot Password</h1>
        
        {sent ? (
          <div style={styles.successBox}>
            <div style={styles.successIcon}>✅</div>
            <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.6 }}>
              If an account exists with that email, we've sent a password reset link.
              <br /><br />
              Please check your inbox and follow the instructions.
            </p>
            <Link to="/login" style={{ ...styles.backLink, color: '#60a5fa', marginTop: '24px' }}>
              Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p style={styles.subtitle}>
              Enter your email address and we'll send you a link to reset your password.
            </p>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              placeholder="Enter your email"
              required
            />
            {error && <div style={styles.error}>{error}</div>}
            <button type="submit" style={styles.submitBtn} disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}
        
        <Link to="/login" style={styles.backLink}>
          ← Back to Login
        </Link>
      </div>
    </div>
  );
};

export default ForgotPassword;
