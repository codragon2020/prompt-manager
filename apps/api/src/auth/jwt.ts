import jwt from 'jsonwebtoken';
import { AppError } from '../errors.js';

export type JwtPayload = {
  sub: string;
  email: string;
};

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError({
      code: 'INTERNAL',
      status: 500,
      message: 'JWT_SECRET is not configured',
    });
  }
  return secret;
}

export function signJwt(payload: JwtPayload) {
  return jwt.sign(payload, getSecret(), { expiresIn: '12h' });
}

export function verifyJwt(token: string): JwtPayload {
  try {
    return jwt.verify(token, getSecret()) as JwtPayload;
  } catch {
    throw new AppError({
      code: 'UNAUTHORIZED',
      status: 401,
      message: 'Invalid or expired token',
    });
  }
}
