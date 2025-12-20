import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/requireAuth';
import { validateBody, validateQuery } from '../middleware/validate';
import {
  createPrompt,
  exportPromptBundle,
  getActivePromptVersion,
  getPromptDetail,
  importPromptBundle,
  listPrompts,
  publishPromptVersion,
  softDeletePrompt,
  updatePrompt,
  createPromptVersion,
} from '../services/prompts';

export const promptsRouter = express.Router();

const listQuery = z.object({
  q: z.string().optional(),
  tag: z.string().optional(),
  env: z.string().optional(),
  sort: z.enum(['updatedAt', 'createdAt']).optional().default('updatedAt'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

promptsRouter.get('/', validateQuery(listQuery), async (req, res, next) => {
  try {
    const data = await listPrompts(req.query as any);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

promptsRouter.get('/:promptId', async (req, res, next) => {
  try {
    const data = await getPromptDetail(req.params.promptId);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

promptsRouter.get('/:promptId/active', async (req, res, next) => {
  try {
    const env = String(req.query.env || 'prod');
    const data = await getActivePromptVersion(req.params.promptId, env);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

const createBody = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  ownerTeam: z.string().optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
  tags: z.array(z.string().min(1)).optional().default([]),
  initialVersion: z.object({
    content: z.string().min(1),
    modelName: z.string().optional(),
    temperature: z.number().optional(),
    maxTokens: z.number().int().optional(),
    topP: z.number().optional(),
    notes: z.string().optional(),
    variables: z
      .array(
        z.object({
          name: z.string().min(1),
          type: z.enum(['STRING', 'NUMBER', 'BOOLEAN', 'JSON']),
          required: z.boolean().optional().default(false),
          defaultValue: z.string().optional(),
        }),
      )
      .optional()
      .default([]),
  }),
});

promptsRouter.post(
  '/',
  requireAuth,
  validateBody(createBody),
  async (req, res, next) => {
    try {
      const data = await createPrompt(req.user!, req.body as any);
      res.status(201).json(data);
    } catch (err) {
      next(err);
    }
  },
);

const updateBody = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  ownerTeam: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
  tags: z.array(z.string().min(1)).optional(),
});

promptsRouter.patch(
  '/:promptId',
  requireAuth,
  validateBody(updateBody),
  async (req, res, next) => {
    try {
      const data = await updatePrompt(
        req.user!,
        req.params.promptId,
        req.body as any,
      );
      res.json(data);
    } catch (err) {
      next(err);
    }
  },
);

promptsRouter.delete('/:promptId', requireAuth, async (req, res, next) => {
  try {
    await softDeletePrompt(req.user!, req.params.promptId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

const newVersionBody = z.object({
  fromVersionId: z.string().optional(),
  content: z.string().min(1).optional(),
  modelName: z.string().optional(),
  temperature: z.number().optional(),
  maxTokens: z.number().int().optional(),
  topP: z.number().optional(),
  notes: z.string().optional(),
  variables: z
    .array(
      z.object({
        name: z.string().min(1),
        type: z.enum(['STRING', 'NUMBER', 'BOOLEAN', 'JSON']),
        required: z.boolean().optional().default(false),
        defaultValue: z.string().optional(),
      }),
    )
    .optional(),
});

promptsRouter.post(
  '/:promptId/versions',
  requireAuth,
  validateBody(newVersionBody),
  async (req, res, next) => {
    try {
      const data = await createPromptVersion(
        req.user!,
        req.params.promptId,
        req.body as any,
      );
      res.status(201).json(data);
    } catch (err) {
      next(err);
    }
  },
);

const publishBody = z.object({
  env: z.string().min(1),
  promptVersionId: z.string().min(1),
  notes: z.string().optional(),
});

promptsRouter.post(
  '/:promptId/publish',
  requireAuth,
  validateBody(publishBody),
  async (req, res, next) => {
    try {
      const data = await publishPromptVersion(
        req.user!,
        req.params.promptId,
        req.body as any,
      );
      res.status(201).json(data);
    } catch (err) {
      next(err);
    }
  },
);

promptsRouter.get('/:promptId/export', async (req, res, next) => {
  try {
    const data = await exportPromptBundle(req.params.promptId);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

const importBody = z.object({
  bundle: z.any(),
  mode: z.enum(['create', 'merge']).optional().default('merge'),
});

promptsRouter.post(
  '/import',
  requireAuth,
  validateBody(importBody),
  async (req, res, next) => {
    try {
      const data = await importPromptBundle(req.user!, req.body as any);
      res.status(201).json(data);
    } catch (err) {
      next(err);
    }
  },
);
