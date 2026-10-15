// BE-04: verificación de correo. Debe usarse después de requireAuth.
// Lee el estado actual en el servidor (tabla usuarios), no del JWT ni del body.
// No bloquea login: solo se monta en rutas de solicitar viajes / ofrecerse conductor.
import { pool } from '../infrastructure/db/db.js';
import { AppError } from '../utils/AppError.js';

export async function requireVerified(req, _res, next) {
  try {
    if (!req?.user || typeof req.user.id !== 'number') {
      throw AppError.unauthenticated('Sesión requerida. Inicia sesión de nuevo.');
    }

    let rows;
    try {
      const result = await pool.query('SELECT correoVerificado FROM usuarios WHERE idUsuario = $1', [
        req.user.id,
      ]);
      rows = result.rows;
    } catch {
      throw AppError.unauthenticated('No se pudo validar la sesión. Inicia sesión de nuevo.');
    }

    const row = rows?.[0];
    if (!row) {
      throw AppError.unauthenticated('Sesión no válida. Inicia sesión de nuevo.');
    }

    const verified = row.correoVerificado ?? row.correoverificado;
    if (verified !== true) {
      throw AppError.forbidden(
        'Verificación pendiente: no puedes realizar ni aceptar viajes hasta completar la verificación.'
      );
    }

    return next();
  } catch (err) {
    return next(err);
  }
}
