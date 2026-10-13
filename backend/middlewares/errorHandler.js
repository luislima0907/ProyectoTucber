import { toAppError, AppError } from '../utils/AppError.js';

function buildPayload(appErr) {
  const error = { code: appErr.code, message: appErr.message };
  if (appErr.fields) error.fields = appErr.fields;
  return { error };
}

function logSafe(req, appErr) {
  const line = {
    level: 'error',
    code: appErr.code,
    status: appErr.statusCode,
    method: req?.method,
    path: req?.originalUrl ?? req?.url,
  };
  console.error(JSON.stringify(line));
}

export function notFoundHandler(req, _res, next) {
  next(AppError.notFound());
}

export function errorHandler(err, req, res, _next) {
  if (res.headersSent) return _next(err);

  const appErr = toAppError(err);

  if (appErr.retryAfterSec != null) {
    res.setHeader('Retry-After', String(appErr.retryAfterSec));
  }

  logSafe(req, appErr);
  return res.status(appErr.statusCode).json(buildPayload(appErr));
}
