import express from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../db.js';
import { AppError } from '../errors.js';
import { signJwt } from '../auth/jwt.js';
import { validateBody } from '../middleware/validate.js';

export const authRouter = express.Router();

const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post('/login', validateBody(loginBody), async (req, res, next) => {
  try {
    const { email, password } = req.body as z.infer<typeof loginBody>;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError({
        code: 'UNAUTHORIZED',
        status: 401,
        message: 'Invalid credentials',
      });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new AppError({
        code: 'UNAUTHORIZED',
        status: 401,
        message: 'Invalid credentials',
      });
    }

    const token = signJwt({ sub: user.id, email: user.email });
    res.json({ token });
  } catch (err) {
    next(err);
  }
});
