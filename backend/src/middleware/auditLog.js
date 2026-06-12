const AuditLog = require('../models/AuditLog');

const safeJson = (val, maxLen = 2000) => {
  try {
    const s = typeof val === 'string' ? val : JSON.stringify(val);
    if (s.length > maxLen) return s.slice(0, maxLen) + '…';
    return s;
  } catch {
    return undefined;
  }
};

const auditLog = (action, entityType = 'other') => {
  return async (req, res, next) => {
    if (!req.user) return next();

    const entityId =
      req.params?.id ||
      req.params?.projectId ||
      req.params?.findingId ||
      req.params?.reportId ||
      req.params?.userId ||
      undefined;

    const entityName =
      req.body?.name ||
      req.body?.title ||
      req.body?.projectName ||
      req.body?.findingTitle ||
      req.body?.reportName ||
      req.body?.username ||
      (entityId ? String(entityId) : undefined);

    const baseLog = {
      user: req.user._id,
      action,
      entityType,
      entityId: entityId ? String(entityId) : undefined,
      entityName,
      details: {
        method: req.method,
        path: req.originalUrl || req.path,
        // Avoid storing huge bodies
        body: req.body ? req.body : undefined,
        params: req.params || undefined,
      },
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('User-Agent'),
      status: 'pending',
    };

    const enrichFailure = (log, errOrMessage) => {
      log.status = 'failure';
      if (errOrMessage instanceof Error) {
        log.errorMessage = errOrMessage.message;
      } else if (typeof errOrMessage === 'string') {
        log.errorMessage = errOrMessage;
      } else {
        log.errorMessage = safeJson(errOrMessage);
      }
    };

    // Track whether we already logged to prevent close event duplicates
    let auditLogged = false;

    // Capture completion regardless of whether controller calls res.send() or errors.
    res.on('finish', () => {
      if (auditLogged) return;
      auditLogged = true;
      // finish => response was sent
      const statusCode = res.statusCode;
      const log = { ...baseLog };

      log.status = statusCode < 400 ? 'success' : 'failure';
      if (statusCode >= 400) {
        log.errorMessage = log.errorMessage || `HTTP ${statusCode}`;
      }

      AuditLog.create(log).catch((err) => console.error('Audit log error:', err));
    });

    // If response is closed early or finish didn't fire, write failure log.
    res.on('close', () => {
      if (auditLogged) return;
      auditLogged = true;
      if (res.statusCode < 400) return;
      // In case 'finish' did not run or was not captured, ensure a failure record.
      const log = { ...baseLog };
      enrichFailure(log, `Response closed early (HTTP ${res.statusCode})`);
      AuditLog.create(log).catch((err) => console.error('Audit log error:', err));
    });

    next();
  };
};

module.exports = auditLog;

