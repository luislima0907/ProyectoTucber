// BE-04: autorización por rol. Debe usarse después de requireAuth.
// Nunca lee rol del body, solo de req.user (JWT validado + DB).
import { AppError } from '../utils/AppError.js';

export function requireRole(...allowedRoles) {
  if (allowedRoles.length === 0) {
    throw new Error('requireRole necesita al menos un rol permitido.');
  }
  return (req, _res, next) => {
    try {
      if (!req?.user || typeof req.user.id !== 'number' || typeof req.user.rol !== 'string') {
        throw AppError.unauthenticated('Sesión requerida. Inicia sesión de nuevo.');
      }
      if (!allowedRoles.includes(req.user.rol)) {
        throw AppError.forbidden('No tienes permiso para esta acción.');
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
}
