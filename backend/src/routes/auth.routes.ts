import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/auth.service.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

const loginSchema = {
  body: z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
  }),
};

const refreshSchema = {
  body: z.object({
    refresh_token: z.string().min(1, 'Refresh token is required'),
  }),
};

router.post(
  '/login',
  validate(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, password } = req.body;
      const result = await AuthService.login(username, password);
      res.status(200).json({
        success: true,
        access_token: result.accessToken,
        refresh_token: result.refreshToken,
        user: result.user,
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/refresh',
  validate(refreshSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refresh_token } = req.body;
      const result = await AuthService.refreshToken(refresh_token);
      res.status(200).json({
        success: true,
        access_token: result.accessToken,
      });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/me',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await AuthService.getMe(req.user!.id);
      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
