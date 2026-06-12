import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authStorage } from '../services/authStorage';

const MAX_INACTIVE_MS = 12 * 60 * 60 * 1000;

export const useBrowserCloseHandler = () => {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      authStorage.setSessionActive();
      authStorage.setLastActivity(Date.now());
      return;
    }

    const lastActivity = authStorage.getLastActivity();
    if (lastActivity) {
      const elapsed = Date.now() - Number(lastActivity);
      if (elapsed > MAX_INACTIVE_MS) {
        authStorage.clearAll();
        return;
      }
    }

    const flag = authStorage.getBeforeunloadFlag();
    if (flag) {
      authStorage.removeBeforeunloadFlag();
      return;
    }

    if (!authStorage.getSessionActive()) {
      authStorage.clearAll();
    }
  }, [isAuthenticated]);
};

export default useBrowserCloseHandler;
