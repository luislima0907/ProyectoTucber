import jwt from 'jsonwebtoken';
import { AppError } from './AppError.js';

export const SESSION_COOKIE_NAME = 'tucber_session';

export function getSessionCookieName() {
  const name = process.env.SESSION_COOKIE_NAME;
  return typeof name === 'string' && name.trim().length > 0 ? name : SESSION_COOKIE_NAME;
}

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (typeof secret !== 'string' || secret.trim().length === 0) {
    throw AppError.internal('Configuración de autenticación incompleta.');
  }
  return secret;
}

const ALLOWED_ROLES = new Set(['cliente', 'conductor']);

export function signSessionToken({ idUsuario, rol, idSesion }) {
  const id = Number(idUsuario);
  if (!Number.isInteger(id) || id <= 0) {
    throw AppError.internal('Identidad de sesión inválida.');
  }
  if (!ALLOWED_ROLES.has(rol)) {
    throw AppError.internal('Rol de sesión inválido.');
  }
  if (typeof idSesion !== 'string' || idSesion.trim().length === 0) {
    throw AppError.internal('Identificador de sesión inválido.');
  }

  return jwt.sign({ sub: id, rol, sid: idSesion }, getSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '12h',
  });
}

export function verifySessionToken(token) {
  if (typeof token !== 'string' || token.trim().length === 0) {
    throw AppError.unauthenticated('Sesión requerida. Inicia sesión de nuevo.');
  }

  let payload;
  try {
    payload = jwt.verify(token, getSecret());
  } catch (err) {
    if (err?.name === 'TokenExpiredError') {
      throw AppError.unauthenticated('Sesión vencida. Inicia sesión de nuevo.');
    }
    throw AppError.unauthenticated('Sesión inválida. Inicia sesión de nuevo.');
  }

  const idUsuario = Number(payload?.sub);
  const { rol, sid } = payload ?? {};
  if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
    throw AppError.unauthenticated('Sesión inválida. Inicia sesión de nuevo.');
  }
  if (!ALLOWED_ROLES.has(rol)) {
    throw AppError.unauthenticated('Sesión inválida. Inicia sesión de nuevo.');
  }
  if (typeof sid !== 'string' || sid.trim().length === 0) {
    throw AppError.unauthenticated('Sesión inválida. Inicia sesión de nuevo.');
  }

  return { idUsuario, rol, idSesion: sid };
}
