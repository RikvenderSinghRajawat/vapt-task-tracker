import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Divider,
  Switch,
  FormControlLabel,
  Grid,
  Alert,
  InputAdornment,
  IconButton
} from '@mui/material';
import { Visibility, VisibilityOff, LockReset as LockResetIcon, Key as KeyIcon, Add as AddIcon, Delete as DeleteIcon, ContentCopy as CopyIcon } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { userAPI, apiKeyAPI } from '../services/api';
import { AUTH_CONFIG } from '../config/api.config';
import { authStorage } from '../services/authStorage';
import { API_BASE_URL } from '../config/apiBaseResolver';
import { colors, borderRadius, shadows } from '../theme/designSystem';
import { glassStyles, gradients } from '../theme/premiumTheme';

const API_BASE = API_BASE_URL;

const Settings = () => {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [mfaMessage, setMfaMessage] = useState('');
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false });
  
  const [apiKeys, setApiKeys] = useState([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState(null);

  const fetchApiKeys = async () => {
    try {
      const response = await apiKeyAPI.getApiKeys();
      setApiKeys(response || []);
    } catch (error) {
      console.error('Error fetching API keys:', error);
    }
  };

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const handleCreateApiKey = async () => {
    if (!newKeyName.trim()) return;
    try {
      const response = await apiKeyAPI.createApiKey({ name: newKeyName });
      setGeneratedKey(response.key);
      setNewKeyName('');
      fetchApiKeys();
      showToast('API key generated successfully', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const handleDeleteApiKey = async (id) => {
    try {
      await apiKeyAPI.deleteApiKey(id);
      fetchApiKeys();
      showToast('API key deleted', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard', 'info');
  };

  const authRequest = async (path, body = {}) => {
    const response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStorage.getAccessToken()}`
      },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Request failed');
    return data;
  };

  const handleSetupMfa = async () => {
    try {
      const response = await authRequest('/auth/mfa/setup');
      setQrCodeDataUrl(response.data.qrCodeDataUrl);
      setMfaMessage('Scan the QR code and enter a code to verify setup.');
    } catch (error) {
      setMfaMessage(error.message);
    }
  };

  const handleVerifyMfa = async () => {
    try {
      const response = await authRequest('/auth/mfa/verify-setup', { code: mfaCode });
      setRecoveryCodes(response.data.recoveryCodes || []);
      updateUser({ mfa_enabled: true });
      setMfaMessage('MFA enabled. Store your recovery codes securely.');
    } catch (error) {
      setMfaMessage(error.message);
    }
  };

  const handleDisableMfa = async () => {
    try {
      await authRequest('/auth/mfa/disable', { code: mfaCode });
      updateUser({ mfa_enabled: false });
      setQrCodeDataUrl('');
      setRecoveryCodes([]);
      setMfaMessage('MFA disabled.');
    } catch (error) {
      setMfaMessage(error.message);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Profile Settings
              </Typography>
              <TextField
                fullWidth
                label="Full Name"
                margin="normal"
                defaultValue="John Doe"
              />
              <TextField
                fullWidth
                label="Email"
                margin="normal"
                defaultValue="john@example.com"
              />
              <TextField
                fullWidth
                label="Phone"
                margin="normal"
                defaultValue="+1 234 567 8900"
              />
              <TextField
                fullWidth
                label="Department"
                margin="normal"
                defaultValue="Security"
              />
              <Button variant="contained" sx={{ mt: 2 }}>
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <LockResetIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Change Password
              </Typography>
              <TextField
                fullWidth
                label="Current Password"
                type={showPassword.current ? 'text' : 'password'}
                margin="normal"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword({...showPassword, current: !showPassword.current})} edge="end" size="small">
                        {showPassword.current ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                label="New Password"
                type={showPassword.new ? 'text' : 'password'}
                margin="normal"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                helperText="Minimum 6 characters"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword({...showPassword, new: !showPassword.new})} edge="end" size="small">
                        {showPassword.new ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                label="Confirm New Password"
                type={showPassword.confirm ? 'text' : 'password'}
                margin="normal"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                error={passwordForm.confirmPassword !== '' && passwordForm.newPassword !== passwordForm.confirmPassword}
                helperText={
                  passwordForm.confirmPassword !== '' && passwordForm.newPassword !== passwordForm.confirmPassword
                    ? 'Passwords do not match'
                    : ''
                }
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword({...showPassword, confirm: !showPassword.confirm})} edge="end" size="small">
                        {showPassword.confirm ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                variant="contained"
                sx={{ mt: 2 }}
                disabled={passwordLoading || !passwordForm.currentPassword || !passwordForm.newPassword || passwordForm.newPassword !== passwordForm.confirmPassword || passwordForm.newPassword.length < 6}
                onClick={async () => {
                  setPasswordLoading(true);
                  try {
                    await userAPI.updatePassword(passwordForm.currentPassword, passwordForm.newPassword);
                    showToast('Password updated successfully', 'success');
                    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  } catch (err) {
                    showToast(err.message || 'Failed to update password', 'error');
                  } finally {
                    setPasswordLoading(false);
                  }
                }}
              >
                {passwordLoading ? 'Updating...' : 'Update Password'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Notifications
              </Typography>
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Email Notifications"
              />
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="In-App Notifications"
              />
              <FormControlLabel
                control={<Switch />}
                label="Slack Notifications"
              />
              <Divider sx={{ my: 2 }} />
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Finding Assignment Alerts"
              />
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Status Change Alerts"
              />
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="SLA Warning Alerts"
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Preferences
              </Typography>
              <FormControlLabel
                control={<Switch />}
                label="Dark Mode"
              />
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Compact View"
              />
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Show Tooltips"
              />
              <Divider sx={{ my: 2 }} />
              <TextField
                fullWidth
                select
                label="Language"
                margin="normal"
                defaultValue="en"
                SelectProps={{ native: true }}
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
              </TextField>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Multi-Factor Authentication
              </Typography>
              {mfaMessage && <Alert severity="info" sx={{ mb: 2 }}>{mfaMessage}</Alert>}
              <Typography variant="body2" sx={{ mb: 2 }}>
                Status: {user?.mfa_enabled ? 'Enabled' : 'Disabled'}
              </Typography>
              {qrCodeDataUrl && (
                <Box sx={{ mb: 2 }}>
                  <img src={qrCodeDataUrl} alt="MFA QR code" style={{ maxWidth: 180 }} />
                </Box>
              )}
              <TextField
                fullWidth
                label="Authenticator Code"
                margin="normal"
                value={mfaCode}
                onChange={(event) => setMfaCode(event.target.value)}
              />
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                {!user?.mfa_enabled && <Button variant="contained" onClick={handleSetupMfa}>Setup MFA</Button>}
                {!user?.mfa_enabled && qrCodeDataUrl && <Button variant="outlined" onClick={handleVerifyMfa}>Verify</Button>}
                {user?.mfa_enabled && <Button variant="outlined" color="error" onClick={handleDisableMfa}>Disable MFA</Button>}
              </Box>
              {recoveryCodes.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2">Recovery Codes</Typography>
                  {recoveryCodes.map((code) => (
                    <Typography key={code} variant="body2" sx={{ fontFamily: 'monospace' }}>{code}</Typography>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Card sx={{ ...glassStyles.card }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <KeyIcon color="primary" /> API Key Management
              </Typography>
              <Typography variant="body2" sx={{ color: colors.text.tertiary, mb: 3 }}>
                Generate API keys to integrate external tools with eKavach.
              </Typography>

              {generatedKey && (
                <Alert 
                  severity="success" 
                  sx={{ mb: 3, bgcolor: 'rgba(52, 211, 153, 0.1)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.2)' }}
                  action={
                    <Button color="inherit" size="small" onClick={() => setGeneratedKey(null)}>
                      Done
                    </Button>
                  }
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>New API Key Generated:</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <code style={{ background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '4px' }}>{generatedKey}</code>
                    <IconButton size="small" onClick={() => copyToClipboard(generatedKey)} sx={{ color: '#34d399' }}>
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Typography variant="caption" sx={{ mt: 1, display: 'block', fontWeight: 600 }}>
                    Copy this key now. You will not be able to see it again!
                  </Typography>
                </Alert>
              )}

              <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
                <TextField
                  size="small"
                  label="Key Name"
                  placeholder="e.g., CI/CD Pipeline"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  sx={{ flexGrow: 1 }}
                />
                <Button 
                  variant="contained" 
                  startIcon={<AddIcon />}
                  onClick={handleCreateApiKey}
                  sx={{ background: gradients.primary, fontWeight: 700 }}
                >
                  Generate Key
                </Button>
              </Box>

              <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.05)' }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {apiKeys.length === 0 ? (
                  <Typography variant="body2" sx={{ color: colors.text.tertiary, textAlign: 'center', py: 2 }}>
                    No API keys generated yet.
                  </Typography>
                ) : (
                  apiKeys.map((key) => (
                    <Box 
                      key={key._id} 
                      sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        p: 2,
                        borderRadius: borderRadius.md,
                        bgcolor: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.05)'
                      }}
                    >
                      <Box>
                        <Typography variant="subtitle2" sx={{ color: colors.text.primary, fontWeight: 700 }}>{key.name}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="caption" sx={{ color: colors.text.tertiary, fontFamily: 'monospace' }}>{key.key}</Typography>
                          <Typography variant="caption" sx={{ color: colors.text.tertiary }}>• Created {new Date(key.createdAt).toLocaleDateString()}</Typography>
                        </Box>
                      </Box>
                      <IconButton size="small" color="error" onClick={() => handleDeleteApiKey(key._id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  ))
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Settings;
