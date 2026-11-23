import { Router } from 'express';
import {
  register,
  login,
  googleAuth,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  updateProfile,
  changePassword,
} from '../controllers/auth.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { authRateLimiter, passwordResetRateLimiter } from '../middleware/rateLimiter.js';
import {
  validateBody,
  RegisterSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  UpdateProfileSchema,
  ChangePasswordSchema,
} from '../validators/index.js';

const router = Router();

router.post('/register', authRateLimiter, validateBody(RegisterSchema), register);
router.post('/login', authRateLimiter, validateBody(LoginSchema), login);
router.post('/google', authRateLimiter, googleAuth);
router.post('/logout', authenticateToken, logout);
router.get('/me', authenticateToken, getMe);
router.post('/forgot-password', passwordResetRateLimiter, validateBody(ForgotPasswordSchema), forgotPassword);
router.post('/reset-password', passwordResetRateLimiter, validateBody(ResetPasswordSchema), resetPassword);
router.put('/profile', authenticateToken, validateBody(UpdateProfileSchema), updateProfile);
router.put('/change-password', authenticateToken, validateBody(ChangePasswordSchema), changePassword);

export default router;

