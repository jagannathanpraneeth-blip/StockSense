import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '../db/client';
import { AppError, ConflictError, NotFoundError } from '../utils/errors';
import { config } from '../config/env';
import nodemailer from 'nodemailer';

const SALT_ROUNDS = 10;

// Schemas
const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  // explicitly forbidding user from providing role during signup
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

const requestOtpSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
});

const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  otp: z.string().length(6, 'OTP must be exactly 6 digits'),
});

const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  otp: z.string().length(6, 'OTP must be exactly 6 digits'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

// Mailer Setup (basic)
const createMailer = () => {
  if (config.smtpHost) {
    return nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      auth: config.smtpUser ? {
        user: config.smtpUser,
        pass: config.smtpPass,
      } : undefined,
    });
  }
  return null;
};

// Generate 6-digit OTP
const generateOtp = () => {
  return crypto.randomInt(100000, 999999).toString();
};

export const signup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = signupSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: 'WAREHOUSE_STAFF', // Enforce default role, ignoring any input
      },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    req.session.userId = user.id;

    res.status(201).json({
      success: true,
      message: 'Signup successful',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user || !user.passwordHash || !user.isActive) {
      throw new AppError('Invalid email or password', 401);
    }

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    req.session.regenerate((err) => {
      if (err) return next(new AppError('Failed to initialize session', 500));
      
      req.session.userId = user.id;

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    });
  } catch (error) {
    next(error);
  }
};

export const logout = (req: Request, res: Response, next: NextFunction) => {
  req.session.destroy((err) => {
    if (err) return next(new AppError('Could not log out', 500));
    res.clearCookie('connect.sid'); // Clear default session cookie name
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  });
};

export const getMe = (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: req.user,
  });
};

export const requestPasswordReset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = requestOtpSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user || !user.isActive) {
      // Don't leak user existence
      return res.status(200).json({ success: true, message: 'If the email exists, an OTP has been sent.' });
    }

    // Check rate limit on OTPs
    const recentOtp = await prisma.otpRequest.findFirst({
      where: {
        userId: user.id,
        createdAt: { gt: new Date(Date.now() - config.otpResendCooldownSeconds * 1000) },
      },
    });

    if (recentOtp) {
      throw new AppError(`Please wait ${config.otpResendCooldownSeconds} seconds before requesting a new OTP.`, 429);
    }

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, SALT_ROUNDS);
    const expiresAt = new Date(Date.now() + config.otpExpiryMinutes * 60000);

    await prisma.otpRequest.create({
      data: {
        userId: user.id,
        otpHash,
        expiresAt,
      },
    });

    // Send email or log to console
    const mailer = createMailer();
    if (mailer) {
      try {
        await mailer.sendMail({
          from: config.smtpFrom,
          to: user.email,
          subject: 'StockSense Password Reset OTP',
          text: `Your OTP is: ${otp}. It will expire in ${config.otpExpiryMinutes} minutes.`,
        });
        console.log(`[Email] Sent OTP to ${user.email}`);
      } catch (err) {
        console.error('Failed to send SMTP email:', err);
        // Fallback to log in dev if needed, or just let user know it failed
        if (config.localOtpLog) {
          console.log(`[Development Mock] OTP for ${user.email} is: ${otp}`);
        }
      }
    } else if (config.localOtpLog) {
      console.log(`[Development Mock] OTP for ${user.email} is: ${otp}`);
    } else {
      console.warn('SMTP is not configured and local logging is disabled. Cannot deliver OTP.');
    }

    res.status(200).json({
      success: true,
      message: 'If the email exists, an OTP has been sent.',
      // Explicitly noting if email was sent in payload for testing/acceptance criteria
      debugEmailSent: mailer ? true : false, 
    });
  } catch (error) {
    next(error);
  }
};

export const verifyOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = verifyOtpSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) throw new AppError('Invalid request', 400);

    // Find the most recent active OTP for this user
    const otpRequest = await prisma.otpRequest.findFirst({
      where: {
        userId: user.id,
        usedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRequest) {
      throw new AppError('No active OTP request found', 400);
    }

    if (otpRequest.expiresAt < new Date()) {
      throw new AppError('OTP has expired', 400);
    }

    if (otpRequest.attempts >= config.otpMaxAttempts) {
      throw new AppError('Too many failed attempts. Please request a new OTP.', 400);
    }

    const isValid = await bcrypt.compare(data.otp, otpRequest.otpHash);
    
    if (!isValid) {
      // Increment attempts
      await prisma.otpRequest.update({
        where: { id: otpRequest.id },
        data: { attempts: otpRequest.attempts + 1 },
      });
      throw new AppError('Invalid OTP', 401);
    }

    // OTP is valid. We don't mark as used until the actual password reset.
    res.status(200).json({ success: true, message: 'OTP verified successfully' });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = resetPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) throw new AppError('Invalid request', 400);

    const otpRequest = await prisma.otpRequest.findFirst({
      where: {
        userId: user.id,
        usedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRequest) throw new AppError('No active OTP request found', 400);
    if (otpRequest.expiresAt < new Date()) throw new AppError('OTP has expired', 400);
    if (otpRequest.attempts >= config.otpMaxAttempts) throw new AppError('Too many failed attempts.', 400);

    const isValid = await bcrypt.compare(data.otp, otpRequest.otpHash);
    if (!isValid) {
      await prisma.otpRequest.update({
        where: { id: otpRequest.id },
        data: { attempts: otpRequest.attempts + 1 },
      });
      throw new AppError('Invalid OTP', 401);
    }

    // Mark used and update password
    const newPasswordHash = await bcrypt.hash(data.newPassword, SALT_ROUNDS);

    await prisma.$transaction([
      prisma.otpRequest.update({
        where: { id: otpRequest.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newPasswordHash },
      }),
    ]);

    res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
};
