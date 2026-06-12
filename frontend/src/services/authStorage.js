const TOKEN_KEY = 'vapt_access_token';
const REFRESH_KEY = 'vapt_refresh_token';
const SESSION_ID_KEY = 'vapt_session_id';
const LAST_ACTIVITY_KEY = 'vapt_last_activity';
const SESSION_MARKER_KEY = 'vapt_session_active';
const BFR_UNLOAD_KEY = 'vapt_beforeunload_flag';

export const authStorage = {
  getAccessToken: () => sessionStorage.getItem(TOKEN_KEY),
  setAccessToken: (val) => sessionStorage.setItem(TOKEN_KEY, val),
  removeAccessToken: () => sessionStorage.removeItem(TOKEN_KEY),

  getRefreshToken: () => sessionStorage.getItem(REFRESH_KEY),
  setRefreshToken: (val) => sessionStorage.setItem(REFRESH_KEY, val),
  removeRefreshToken: () => sessionStorage.removeItem(REFRESH_KEY),

  getSessionId: () => sessionStorage.getItem(SESSION_ID_KEY),
  setSessionId: (val) => sessionStorage.setItem(SESSION_ID_KEY, val),
  removeSessionId: () => sessionStorage.removeItem(SESSION_ID_KEY),

  setLastActivity: (val) => localStorage.setItem(LAST_ACTIVITY_KEY, String(val)),
  getLastActivity: () => localStorage.getItem(LAST_ACTIVITY_KEY),
  removeLastActivity: () => localStorage.removeItem(LAST_ACTIVITY_KEY),

  setSessionActive: () => sessionStorage.setItem(SESSION_MARKER_KEY, '1'),
  getSessionActive: () => sessionStorage.getItem(SESSION_MARKER_KEY),
  removeSessionActive: () => sessionStorage.removeItem(SESSION_MARKER_KEY),

  setBeforeunloadFlag: () => sessionStorage.setItem(BFR_UNLOAD_KEY, Date.now().toString()),
  getBeforeunloadFlag: () => sessionStorage.getItem(BFR_UNLOAD_KEY),
  removeBeforeunloadFlag: () => sessionStorage.removeItem(BFR_UNLOAD_KEY),

  clearAll: () => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
    sessionStorage.removeItem(SESSION_ID_KEY);
    sessionStorage.removeItem(SESSION_MARKER_KEY);
    sessionStorage.removeItem(BFR_UNLOAD_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    localStorage.removeItem('vapt_session_active');
    localStorage.removeItem('vapt_user');
  }
};
