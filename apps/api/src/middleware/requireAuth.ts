import type express from 'express';
import { AppError } from '../errors.js';
import { verifyJwt } from '../auth/jwt.js';

export type AuthUser = {
  id: string;
  email: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function requireAuth(
  req: express.Request,
  _res: express.Response,
  next: express.NextFunction,
) {
  const header = req.header('authorization');
  if (!header || !header.toLowerCase().startsWith('bearer ')) {
    return next(
      new AppError({
        code: 'UNAUTHORIZED',
        status: 401,
        message: 'Missing Authorization bearer token',
      }),
    );
  }

  const token = header.slice('bearer '.length).trim();
  const payload = verifyJwt(token);
  req.user = { id: payload.sub, email: payload.email };
  return next();
}
