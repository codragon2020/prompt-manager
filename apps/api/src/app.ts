import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { apiRouter } from './routes/index.js';
import { toAppError } from './errors';

export function createApp() {
  const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

  const corsOrigin = (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const app = express();

  app.use(
    cors({
      origin: corsOrigin,
      credentials: true,
    }),
  );
  app.use(helmet());
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 120,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(pinoHttp({ logger }));

  app.get('/health', (_req: express.Request, res: express.Response) => {
    res.json({ ok: true });
  });

  app.use('/api', apiRouter);

  app.use((req: express.Request, res: express.Response) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `No route for ${req.method} ${req.path}`,
      },
    });
  });

  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      const appErr = toAppError(err);
      logger.error({ err }, appErr.message);
      res.status(appErr.status).json({
        error: {
          code: appErr.code,
          message: appErr.message,
          details: appErr.details,
        },
      });
    },
  );

  return app;
}
