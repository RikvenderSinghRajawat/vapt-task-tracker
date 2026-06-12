import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Box, Typography, TextField, Button, InputAdornment, IconButton
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { userAPI } from '../services/restService';
import EKavachLogo from '../components/EKavachLogo';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      await userAPI.updatePasswordDirect(token, password);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', p: '20px' }}>
        <Box sx={{ background: '#1e293b', borderRadius: '16px', p: 4, width: '100%', maxWidth: '420px', border: '1px solid #334155', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', textAlign: 'center' }}>
          <Box sx={{ fontSize: '48px', mb: 2 }}>✅</Box>
          <Typography variant="h5" sx={{ color: '#f1f5f9', fontWeight: 700, mb: 2 }}>Password Reset!</Typography>
          <Typography sx={{ color: '#94a3b8', mb: 3 }}>Your password has been successfully reset.</Typography>
          <Button variant="contained" onClick={() => navigate('/login')} sx={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
            Sign in with your new password →
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', p: '20px' }}>
      <Box sx={{ background: '#1e293b', borderRadius: '16px', p: 4, width: '100%', maxWidth: '420px', border: '1px solid #334155', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
        <EKavachLogo />
        <Typography variant="h5" sx={{ color: '#f1f5f9', fontWeight: 700, textAlign: 'center', mt: 3, mb: 1 }}>
          Reset Password
        </Typography>
        <Typography sx={{ color: '#94a3b8', textAlign: 'center', mb: 3, fontSize: '14px' }}>
          Enter your new password below.
        </Typography>
        <Box component="form" onSubmit={handleSubmit}>
          <TextField fullWidth label="New Password" type={showPwd ? 'text' : 'password'} value={password}
            onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" required
            sx={{ mb: 2, '& input': { color: '#f1f5f9' }, '& label': { color: '#94a3b8' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#334155' } }}
            InputProps={{ endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowPwd(!showPwd)} edge="end" size="small" sx={{ color: '#64748b' }}>{showPwd ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment> }}
          />
          <TextField fullWidth label="Confirm Password" type={showPwd ? 'text' : 'password'} value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm your new password" required
            error={confirmPassword !== '' && password !== confirmPassword}
            helperText={confirmPassword !== '' && password !== confirmPassword ? 'Passwords do not match' : ''}
            sx={{ mb: 2, '& input': { color: '#f1f5f9' }, '& label': { color: '#94a3b8' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#334155' } }}
          />
          {error && <Typography sx={{ color: '#f87171', fontSize: '13px', textAlign: 'center', mb: 2 }}>{error}</Typography>}
          <Button type="submit" fullWidth variant="contained" disabled={loading}
            sx={{ py: 1.5, background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </Button>
        </Box>
        <Button onClick={() => navigate('/login')} sx={{ display: 'block', textAlign: 'center', color: '#64748b', fontSize: '13px', mt: 2, textTransform: 'none', width: '100%' }}>
          ← Back to Login
        </Button>
      </Box>
    </Box>
  );
};

export default ResetPassword;
