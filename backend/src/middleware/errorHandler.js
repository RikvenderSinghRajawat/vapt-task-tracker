'use strict';

/**
 * Centralised error handler – never swallows errors, always sends a
 * structured JSON response with meaningful status code + message.
 */
const errorHandler = (err, req, res, next) => {
  const requestId = res.locals?.requestId || req?.id || 'unknown';

  let statusCode = 500;
  let message     = 'Internal server error';
  let extra       = {};

  // ── Identification ─────────────────────────────────────────────────────

  if (err?.name === 'CastError') {
    // Mongoose failed to cast the argument — almost always a bad ObjectId
    statusCode = 400;
    message   = `Invalid identifier: ${err.value}`;
    extra     = { path: err.path };
  } else if (err?.code === 11000) {
    // Duplicate-key
    statusCode   = 409;
    const field  = Object.keys(err.keyValue || err.keyPattern || {})[0] || 'field';
    message      = `${field} already exists`;
  } else if (err?.name === 'ValidationError') {
    statusCode = 422;
    message    = Object.values(err.errors || {}).map(e => e.message).join(', ') || 'Validation failed';
    extra      = { errors: err.errors };
  } else if (err?.name === 'JsonWebTokenError') {
    statusCode = 401;
    message    = err.message || 'Invalid authentication token';
  } else if (err?.name === 'TokenExpiredError') {
    statusCode = 401;
    message    = 'Authentication token expired';
  } else if (err instanceof SyntaxError || err instanceof URIError) {
    statusCode = 400;
    message    = 'Malformed JSON request body';
  } else if (err?.code === 'ECONNREFUSED' || err?.code === 'ETIMEDOUT') {
    statusCode = 503;
    message    = 'Database unavailable';
    extra      = { details: err.message };
  }

  const responseBody = {
    success:  false,
    message,
    status:   statusCode,
    requestId,
    ...(Object.keys(extra).length && { details: extra })
  };

  if (process.env.NODE_ENV === 'development' || process.env.LOG_ERRORS === 'true') {
    responseBody.stack = err?.stack;
    responseBody.name  = err?.name;
  }

  console.error(`[Error ${requestId}] ${statusCode}:`, message, err?.message || '');
  res.status(statusCode).json(responseBody);
};

module.exports = errorHandler;
