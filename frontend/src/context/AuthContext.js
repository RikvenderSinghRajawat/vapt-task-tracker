import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import LoginLoadingScreen from '../components/LoginLoadingScreen';
import InactivityWarningDialog from '../components/InactivityWarningDialog';
import { activityTracker } from '../services/activityTracker';
import { authStorage } from '../services/authStorage';
import { request as authFetch, refreshAccessToken, resetLogoutState } from '../services/api';

const AuthContext = createContext(null);
const PROACTIVE_REFRESH_MS = 15 * 60 * 1000;
const LAST_ACTIVITY_KEY = 'vapt_last_activity';
const MAX_STALE_MS = 12 * 60 * 60 * 1000;
const INACTIVITY_TIMEOUT_MS = 20 * 60 * 1000;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showLoginLoading, setShowLoginLoading] = useState(false);
  const [loginLoadingType, setLoginLoadingType] = useState('login');
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const [inactivityTimeRemaining, setInactivityTimeRemaining] = useState(300);
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpData, setOtpData] = useState(null);
  const inactivityCountdownRef = useRef(null);
  const activityTrackerInitializedRef = useRef(false);
  const initializedRef = useRef(false);
  const loginLoadingTimerRef = useRef(null);
  const refreshIntervalRef = useRef(null);
  const isLoggingOutRef = useRef(false);

  const startActivityTracking = () => {
    if (activityTrackerInitializedRef.current) return;
    activityTrackerInitializedRef.current = true;
    activityTracker.initialize(
      () => { setShowInactivityWarning(true); startInactivityCountdown(); },
      () => handleInactivityLogout(),
      INACTIVITY_TIMEOUT_MS
    );
  };

  const stopActivityTracking = () => {
    if (!activityTrackerInitializedRef.current) return;
    activityTrackerInitializedRef.current = false;
    activityTracker.destroy();
    if (inactivityCountdownRef.current) {
      clearInterval(inactivityCountdownRef.current);
      inactivityCountdownRef.current = null;
    }
  };

  const startProactiveRefresh = () => {
    stopProactiveRefresh();
    refreshIntervalRef.current = setInterval(async () => {
      try {
        await refreshAccessToken();
      } catch (_) {}
    }, PROACTIVE_REFRESH_MS);
  };

  const stopProactiveRefresh = () => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  };

  const loadCurrentUser = async () => {
    const token = authStorage.getAccessToken();
    const refreshToken = authStorage.getRefreshToken();

    if (!token && !refreshToken) {
      setLoading(false);
      return;
    }

    const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (lastActivity && Date.now() - Number(lastActivity) > MAX_STALE_MS) {
      authStorage.clearAll();
      setLoading(false);
      return;
    }

    const flag = authStorage.getBeforeunloadFlag();
    if (flag) {
      authStorage.removeBeforeunloadFlag();
    } else {
      if (!authStorage.getSessionActive()) {
        authStorage.clearAll();
        setLoading(false);
        return;
      }
    }

    try {
      const data = await authFetch('/auth/me');
      if (!data?.email) throw new Error('Empty user payload');
      setUser({ uid: data.id || data._id, id: data.id || data._id, ...data });
      setIsAuthenticated(true);
      localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
      authStorage.setSessionActive();
      startActivityTracking();
      startProactiveRefresh();
    } catch (error) {
      const storedRefresh = authStorage.getRefreshToken();
      if (storedRefresh) {
        try {
          const rData = await refreshAccessToken();
          if (rData) {
            const meData = await authFetch('/auth/me');
            if (meData?.email) {
              setUser({ uid: meData.id || meData._id, id: meData.id || meData._id, ...meData });
              setIsAuthenticated(true);
              localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
              authStorage.setSessionActive();
              startActivityTracking();
              startProactiveRefresh();
              setLoading(false);
              return;
            }
          }
        } catch (_) {}
      }
      authStorage.clearAll();
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    loadCurrentUser();
  }, []);

  useEffect(() => () => { stopActivityTracking(); stopProactiveRefresh(); }, []);

  useEffect(() => {
    const handleTokensCleared = () => {
      if (isLoggingOutRef.current) return;
      stopActivityTracking();
      stopProactiveRefresh();
      authStorage.clearAll();
      setUser(null);
      setIsAuthenticated(false);
      setShowInactivityWarning(false);
    };
    window.addEventListener('auth:tokens-cleared', handleTokensCleared);

    const handleStorageChange = (e) => {
      if (e.key === 'vapt_access_token' && !e.newValue && e.storageArea === sessionStorage) {
        stopActivityTracking();
        stopProactiveRefresh();
        setUser(null);
        setIsAuthenticated(false);
        setShowInactivityWarning(false);
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('auth:tokens-cleared', handleTokensCleared);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const performCleanLogin = async (response) => {
    const { accessToken, refreshToken, sessionId, user: nextUser } = response || {};
    if (accessToken) authStorage.setAccessToken(accessToken);
    if (refreshToken) authStorage.setRefreshToken(refreshToken);
    if (sessionId) authStorage.setSessionId(sessionId);
    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    authStorage.setSessionActive();
    resetLogoutState();

    const merged = { uid: nextUser?.id || nextUser?._id, id: nextUser?.id || nextUser?._id, ...nextUser };
    setUser(merged);
    setIsAuthenticated(true);
    startActivityTracking();
    startProactiveRefresh();
  };

  const login = async (email, password, mfaCode, mfaToken, skipOtp) => {
    if (loginLoadingTimerRef.current) clearTimeout(loginLoadingTimerRef.current);
    setShowLoginLoading(true);
    setLoginLoadingType('login');

    stopActivityTracking();
    stopProactiveRefresh();
    authStorage.clearAll();
    setUser(null);
    setIsAuthenticated(false);
    resetLogoutState();

    try {
      const response = mfaToken
        ? await authFetch('/auth/mfa/validate', { method: 'POST', body: { mfaToken, code: mfaCode }, noAuth: true })
        : await authFetch('/auth/login', { method: 'POST', body: { email, password, ...(skipOtp ? { skipOtp: true } : {}) }, noAuth: true });

      if (response?.mfaRequired) {
        setShowLoginLoading(false);
        return { success: true, mfaRequired: true, mfaToken: response.mfaToken };
      }

      if (response?.otpRequired) {
        setShowLoginLoading(false);
        setOtpRequired(true);
        setOtpData({
          userId: response.userId,
          maskedEmail: response.maskedEmail,
          email,
        });
        return { success: true, otpRequired: true, maskedEmail: response.maskedEmail };
      }

      await performCleanLogin(response);

      if (loginLoadingTimerRef.current) clearTimeout(loginLoadingTimerRef.current);
      loginLoadingTimerRef.current = setTimeout(() => {
        setShowLoginLoading(false);
        loginLoadingTimerRef.current = null;
      }, 4000);
      return { success: true };
    } catch (error) {
      setShowLoginLoading(false);
      return { success: false, message: error.message || 'Login failed' };
    }
  };

  const verifyOtp = async (otp) => {
    if (!otpData?.userId || !otp) return { success: false, message: 'Invalid OTP' };
    try {
      setShowLoginLoading(true);
      setLoginLoadingType('login');

      stopActivityTracking();
      stopProactiveRefresh();
      authStorage.clearAll();
      setUser(null);
      setIsAuthenticated(false);
      resetLogoutState();

      const response = await authFetch('/auth/verify-login-otp', {
        method: 'POST',
        body: { userId: otpData.userId, otp },
        noAuth: true
      });

      await performCleanLogin(response);
      setOtpRequired(false);
      setOtpData(null);

      if (loginLoadingTimerRef.current) clearTimeout(loginLoadingTimerRef.current);
      loginLoadingTimerRef.current = setTimeout(() => {
        setShowLoginLoading(false);
        loginLoadingTimerRef.current = null;
      }, 4000);
      return { success: true };
    } catch (error) {
      setShowLoginLoading(false);
      return { success: false, message: error.message || 'OTP verification failed' };
    }
  };

  const resendOtp = async () => {
    if (!otpData?.userId) return { success: false };
    try {
      const response = await authFetch('/auth/resend-login-otp', {
        method: 'POST',
        body: { userId: otpData.userId },
        noAuth: true
      });
      return { success: true, maskedEmail: response.maskedEmail };
    } catch (error) {
      return { success: false, message: error.message || 'Failed to resend OTP' };
    }
  };

  const cancelOtp = () => {
    setOtpRequired(false);
    setOtpData(null);
  };

  const googleSignIn = async () => ({ success: false, message: 'Google sign-in is disabled. Use your local VAPT Tracker credentials.' });

  const register = async (userData) => {
    try {
      const data = await authFetch('/users', { method: 'POST', body: JSON.stringify(userData) });
      return { success: true, data };
    } catch (error) { return { success: false, message: error.message || 'Registration failed' }; }
  };

  const logout = async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;

    if (loginLoadingTimerRef.current) clearTimeout(loginLoadingTimerRef.current);
    stopActivityTracking();
    stopProactiveRefresh();
    const sessionId = authStorage.getSessionId();
    try {
      await authFetch('/auth/logout', {
        method: 'POST',
        body: { sessionId }
      }).catch(() => {});
    } catch (_) {}
    authStorage.clearAll();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:tokens-cleared'));
    }
    setShowInactivityWarning(false);
    setUser(null);
    setIsAuthenticated(false);
    setShowLoginLoading(false);

    isLoggingOutRef.current = false;
  };

  const handleInactivityLogout = async () => {
    setShowInactivityWarning(false);
    if (inactivityCountdownRef.current) {
      clearInterval(inactivityCountdownRef.current);
      inactivityCountdownRef.current = null;
    }
    await logout();
  };

  const startInactivityCountdown = () => {
    if (inactivityCountdownRef.current) clearInterval(inactivityCountdownRef.current);
    let seconds = 300;
    setInactivityTimeRemaining(seconds);
    inactivityCountdownRef.current = setInterval(() => {
      seconds = Math.max(0, seconds - 1);
      setInactivityTimeRemaining(seconds);
      if (seconds <= 0) {
        clearInterval(inactivityCountdownRef.current);
        inactivityCountdownRef.current = null;
        handleInactivityLogout();
      }
    }, 1000);
  };

  const handleExtendSession = () => {
    setShowInactivityWarning(false);
    if (inactivityCountdownRef.current) {
      clearInterval(inactivityCountdownRef.current);
      inactivityCountdownRef.current = null;
    }
    activityTracker.extendSession();
    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
  };

  const updateUser = (userData) => setUser(cur => ({ ...cur, ...userData }));

  const canAccessProject = (projectId) => {
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'vapt_analyst') return true;
    if (user.role === 'project_manager') {
      return (user.allocatedProjects || []).includes(projectId) ||
             (user.managedProjects || []).includes(projectId) ||
             (user.managerOfProjects || []).includes(projectId);
    }
    return (user.allocatedProjects || []).includes(projectId);
  };
  const hasFullAccess = () => user?.role === 'admin' || user?.role === 'vapt_analyst' || user?.isSuperUser;
  const isProjectManager = () => user?.role === 'project_manager';
  const getAllocatedProjectIds = () => user?.allocatedProjects || [];
  const filterProjectsByAllocation = (projects) => {
    if (!user || !projects) return [];
    if (hasFullAccess()) return projects;
    return projects.filter(p => canAccessProject(p.id || p._id));
  };
  const canDeleteUser = (target) => Boolean(user && target?.email !== 'admin@example.com' && (user.role === 'admin' || user.role === 'vapt_analyst' || user.role === 'vapt_tl') && target?.role !== 'admin' && target?.role !== 'super_admin');

  return (
    <AuthContext.Provider value={{
      user, isAuthenticated, loading, login, googleSignIn, register, logout,
      updateUser, canAccessProject, hasFullAccess, isProjectManager,
      getAllocatedProjectIds, filterProjectsByAllocation, canDeleteUser, showLoginLoading,
      otpRequired, otpData, verifyOtp, resendOtp, cancelOtp
    }}>
      {children}
      <LoginLoadingScreen isLoading={showLoginLoading} type={loginLoadingType} />
      <InactivityWarningDialog
        open={showInactivityWarning}
        onExtend={handleExtendSession}
        onLogout={handleInactivityLogout}
        timeRemaining={inactivityTimeRemaining}
      />
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
