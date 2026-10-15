// BE-04: autenticación. Uso: rutas públicas = sin requireAuth,
// rutas protegidas = con requireAuth. No lee id/rol del body, solo del JWT + DB.
import { pool } from '../infrastructure/db/db.js';
import { AppError } from '../utils/AppError.js';
import { verifySessionToken, getSessionCookieName } from '../utils/jwt.js';

function getCookie(req, name) {
  const header = req?.headers?.cookie;
  if (typeof header !== 'string' || header.length === 0) return null;
  const parts = header.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    if (key !== name) continue;
    const raw = part.slice(idx + 1).trim();
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return null;
}

export async function requireAuth(req, _res, next) {
  try {
    const token = getCookie(req, getSessionCookieName());
    if (!token) {
      throw AppError.unauthenticated('Sesión requerida. Inicia sesión de nuevo.');
    }

    const identity = verifySessionToken(token);

    let rows;
    try {
      const result = await pool.query(
        'SELECT idSesion, idUsuario, expiresAt, revokedAt FROM sesiones WHERE idSesion = $1',
        [identity.idSesion]
      );
      rows = result.rows;
    } catch {
      throw AppError.unauthenticated('No se pudo validar la sesión. Inicia sesión de nuevo.');
    }

    const row = rows?.[0];
    if (!row) {
      throw AppError.unauthenticated('Sesión no válida. Inicia sesión de nuevo.');
    }

    const rowIdUsuario = Number(row.idUsuario ?? row.idusuario);
    const revokedAt = row.revokedAt ?? row.revokedat ?? null;
    const expiresAt = row.expiresAt ?? row.expiresat ?? null;

    if (!Number.isInteger(rowIdUsuario) || rowIdUsuario !== identity.idUsuario) {
      throw AppError.unauthenticated('Sesión no válida. Inicia sesión de nuevo.');
    }
    if (revokedAt !== null && revokedAt !== undefined) {
      throw AppError.unauthenticated('Sesión revocada. Inicia sesión de nuevo.');
    }
    if (!expiresAt || new Date(expiresAt).getTime() <= Date.now()) {
      throw AppError.unauthenticated('Sesión vencida. Inicia sesión de nuevo.');
    }

    req.user = Object.freeze({ id: identity.idUsuario, rol: identity.rol, sid: identity.idSesion });
    return next();
  } catch (err) {
    return next(err);
  }
}
