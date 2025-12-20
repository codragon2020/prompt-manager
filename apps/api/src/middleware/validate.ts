import type express from 'express';
import type { ZodSchema } from 'zod';
import { AppError } from '../errors';

export function validateBody<T>(schema: ZodSchema<T>) {
  return (
    req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return next(
        new AppError({
          code: 'BAD_REQUEST',
          status: 400,
          message: 'Invalid request body',
          details: parsed.error.flatten(),
        }),
      );
    }
    req.body = parsed.data;
    return next();
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (
    req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      return next(
        new AppError({
          code: 'BAD_REQUEST',
          status: 400,
          message: 'Invalid query parameters',
          details: parsed.error.flatten(),
        }),
      );
    }
    req.query = parsed.data as any;
    return next();
  };
}
