export const ERROR_CODES = Object.freeze({
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  OFFER_EXPIRED: 'OFFER_EXPIRED',
  RATE_LIMITED: 'RATE_LIMITED',
  PIN_LOCKED: 'PIN_LOCKED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
});

const ALLOWED_STATUS = new Set([400, 401, 403, 404, 409, 429, 500]);

const DB_DUPLICATE_CODES = new Set(['23505']);

function sanitizeFields(fields) {
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return undefined;
  const clean = {};
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value !== 'string' || value.length === 0) continue;
    clean[key] = value.slice(0, 200);
  }
  return Object.keys(clean).length > 0 ? clean : undefined;
}

export class AppError extends Error {
  constructor({ statusCode = 500, code = ERROR_CODES.INTERNAL_ERROR, message, fields, retryAfterSec }) {
    super(message);
    this.name = 'AppError';
    this.statusCode = ALLOWED_STATUS.has(statusCode) ? statusCode : 500;
    this.code = typeof code === 'string' && code.length > 0 ? code : ERROR_CODES.INTERNAL_ERROR;
    this.fields = sanitizeFields(fields);
    this.retryAfterSec = typeof retryAfterSec === 'number' ? retryAfterSec : undefined;
    this.isOperational = this.statusCode !== 500;
  }

  static validation(fields, message = 'Datos inválidos. Revisa los campos marcados.') {
    return new AppError({ statusCode: 400, code: ERROR_CODES.VALIDATION_ERROR, message, fields });
  }

  static unauthenticated(message = 'Sesión requerida. Inicia sesión de nuevo.') {
    return new AppError({ statusCode: 401, code: ERROR_CODES.UNAUTHENTICATED, message });
  }

  static forbidden(message = 'No tienes permiso para esta acción.') {
    return new AppError({ statusCode: 403, code: ERROR_CODES.FORBIDDEN, message });
  }

  static notFound(message = 'Recurso no disponible.') {
    return new AppError({ statusCode: 404, code: ERROR_CODES.NOT_FOUND, message });
  }

  static conflict(code = ERROR_CODES.CONFLICT, message = 'Conflicto de estado. Vuelve a intentarlo.') {
    return new AppError({ statusCode: 409, code, message });
  }

  static emailTaken(message = 'Ese correo ya está registrado.') {
    return new AppError({ statusCode: 409, code: ERROR_CODES.EMAIL_TAKEN, message });
  }

  static offerExpired(message = 'La oferta ya venció o fue retirada. Busca de nuevo.') {
    return new AppError({ statusCode: 409, code: ERROR_CODES.OFFER_EXPIRED, message });
  }

  static rateLimited(retryAfterSec = 30, message) {
    return new AppError({
      statusCode: 429,
      code: ERROR_CODES.RATE_LIMITED,
      message: message ?? `Demasiados intentos. Intenta en ${retryAfterSec} segundos.`,
      retryAfterSec,
    });
  }

  static pinLocked(retryAfterSec = 60) {
    return new AppError({
      statusCode: 429,
      code: ERROR_CODES.PIN_LOCKED,
      message: `PIN bloqueado temporalmente. Intenta en ${retryAfterSec} segundos.`,
      retryAfterSec,
    });
  }

  static internal(message = 'Ocurrió un error inesperado. Intenta de nuevo.') {
    const err = new AppError({ statusCode: 500, code: ERROR_CODES.INTERNAL_ERROR, message });
    err.isOperational = false;
    return err;
  }
}

export function toAppError(err) {
  if (err instanceof AppError) return err;

  const dbCode = err?.code ?? err?.originalError?.code;
  if (DB_DUPLICATE_CODES.has(String(dbCode))) {
    return AppError.emailTaken();
  }

  return AppError.internal();
}
