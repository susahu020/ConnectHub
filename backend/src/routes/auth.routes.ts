import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { authRateLimiter } from '../middleware/rateLimiter';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../utils/validation';
import {
  register,
  login,
  verifyEmail,
  refresh,
  logout,
  logoutAll,
  extendSession,
  forgotPassword,
  resetPassword,
  changePassword,
  verifyLogin2FA,
  setup2FA,
  activate2FA,
  disable2FA,
  sendContactMessage,
  initiateGoogleSso,
  googleSsoCallback,
} from '../controllers/auth.controller';

const router = Router();

// ==========================================
// AUTHENTICATION
// ==========================================
router.post('/auth/register', authRateLimiter, validate(registerSchema), register);
router.get('/auth/sso/google', initiateGoogleSso);
router.get('/auth/sso/google/callback', googleSsoCallback);
router.post('/auth/login', authRateLimiter, validate(loginSchema), login);
router.post('/auth/verify-email', authRateLimiter, validate(verifyEmailSchema), verifyEmail);
router.post('/auth/2fa/verify-login', authRateLimiter, verifyLogin2FA as any);
router.post('/auth/2fa/setup', authenticate as any, setup2FA as any);
router.post('/auth/2fa/activate', authenticate as any, activate2FA as any);
router.post('/auth/2fa/disable', authenticate as any, disable2FA as any);
router.post('/auth/refresh', refresh);
router.post('/auth/logout', authenticate as any, logout as any);
router.post('/auth/logout-all', authenticate as any, logoutAll as any);
router.post('/auth/extend-session', authenticate as any, extendSession as any);
router.post('/auth/forgot-password', authRateLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/auth/reset-password', authRateLimiter, validate(resetPasswordSchema), resetPassword);
router.post('/auth/change-password', authenticate as any, changePassword as any);
router.post('/auth/contact', authRateLimiter, sendContactMessage as any);

export default router;
