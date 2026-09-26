import { Router } from 'express';
import {
  signup,
  login,
  logout,
  getMe,
  requestPasswordReset,
  verifyOtp,
  resetPassword,
} from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication requests. Please wait 15 minutes before trying again.' },
});

router.post('/signup', authLimiter, signup);
router.post('/login', authLimiter, login);
router.post('/logout', logout);
router.get('/me', requireAuth, getMe);

// OTP Flow
router.post('/reset-password/request', authLimiter, requestPasswordReset);
router.post('/reset-password/verify', authLimiter, verifyOtp);
router.post('/reset-password/reset', authLimiter, resetPassword);

export default router;
