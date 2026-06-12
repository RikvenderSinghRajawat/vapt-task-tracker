class ActivityTracker {
  constructor() {
    this.lastActivityTime = Date.now();
    this.inactivityTimeout = 20 * 60 * 1000;
    this.warningLeadMs = 5 * 60 * 1000;
    this.inactivityTimerId = null;
    this.warningTimerId = null;
    this.gracePeriodTimer = null;
    this.eventListeners = [];
    this.isWarningActive = false;
    this.onWarning = null;
    this.onLogout = null;
  }

  initialize(onWarningCallback, onLogoutCallback, inactivityTimeoutMs) {
    this.inactivityTimeout = inactivityTimeoutMs || 20 * 60 * 1000;
    this.warningLeadMs = 1 * 60 * 1000;
    this.onWarning = onWarningCallback || null;
    this.onLogout = onLogoutCallback || null;

    this.attachEventListeners();
    this.startInactivityTimer();
  }

  attachEventListeners() {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    const handler = () => this.recordActivity();

    events.forEach((eventType) => {
      document.addEventListener(eventType, handler, true);
      this.eventListeners.push({
        element: document,
        type: eventType,
        handler,
      });
    });
  }

  recordActivity() {
    const now = Date.now();
    const timeSinceLastActivity = now - this.lastActivityTime;

    if (timeSinceLastActivity > 1000) {
      this.lastActivityTime = now;
      this.resetInactivityTimer();
      this.isWarningActive = false;
    }
  }

  resetInactivityTimer() {
    if (this.inactivityTimerId) clearTimeout(this.inactivityTimerId);
    if (this.warningTimerId) clearTimeout(this.warningTimerId);

    const warningDelay = this.inactivityTimeout - this.warningLeadMs;

    this.warningTimerId = setTimeout(() => {
      if (!this.isWarningActive) {
        this.isWarningActive = true;
        if (this.onWarning) {
          this.onWarning();
        }
      }
    }, warningDelay);

    this.inactivityTimerId = setTimeout(() => {
      if (this.onLogout) {
        this.onLogout();
      }
    }, this.inactivityTimeout);
  }

  startInactivityTimer() {
    if (this.gracePeriodTimer) clearTimeout(this.gracePeriodTimer);
    this.gracePeriodTimer = setTimeout(() => {
      this.resetInactivityTimer();
    }, 5000);
  }

  extendSession() {
    this.lastActivityTime = Date.now();
    this.isWarningActive = false;
    this.resetInactivityTimer();
  }

  pause() {
    if (this.inactivityTimerId) clearTimeout(this.inactivityTimerId);
    if (this.warningTimerId) clearTimeout(this.warningTimerId);
  }

  resume() {
    this.lastActivityTime = Date.now();
    this.startInactivityTimer();
  }

  getTimeRemaining() {
    const timeRemaining = this.inactivityTimeout - (Date.now() - this.lastActivityTime);
    return Math.max(0, Math.floor(timeRemaining / 1000));
  }

  destroy() {
    if (this.inactivityTimerId) clearTimeout(this.inactivityTimerId);
    if (this.warningTimerId) clearTimeout(this.warningTimerId);
    if (this.gracePeriodTimer) clearTimeout(this.gracePeriodTimer);

    this.eventListeners.forEach(({ element, type, handler }) => {
      element.removeEventListener(type, handler, true);
    });
    this.eventListeners = [];
  }
}

export const activityTracker = new ActivityTracker();
