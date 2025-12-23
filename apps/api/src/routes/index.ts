import express from 'express';
import { authRouter } from './auth.js';
import { promptsRouter } from './prompts.js';

export const apiRouter = express.Router();

apiRouter.get('/health', (_req: express.Request, res: express.Response) => {
  res.json({ ok: true });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/prompts', promptsRouter);
