import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export interface AppConfig {
  port: number;
  nodeEnv: string;
  databaseUrl: string;
  corsOrigin: string;
  sessionSecret: string;
  sessionMaxAgeMs: number;
  // SMTP config for OTP email delivery
  smtpHost?: string;
  smtpPort: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom: string;
  // OTP settings
  otpExpiryMinutes: number;
  otpMaxAttempts: number;
  otpResendCooldownSeconds: number;
  // Local dev OTP logging (ONLY when NODE_ENV=development and SMTP is unconfigured)
  localOtpLog: boolean;
}

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  sessionSecret: process.env.SESSION_SECRET || 'change-me-in-production-stocksense-secret',
  sessionMaxAgeMs: parseInt(process.env.SESSION_MAX_AGE_MS || '86400000', 10), // 24h default

  smtpHost: process.env.SMTP_HOST,
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  smtpFrom: process.env.SMTP_FROM || 'noreply@stocksense.local',

  otpExpiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '15', 10),
  otpMaxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10),
  otpResendCooldownSeconds: parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || '60', 10),

  // Log OTPs to server console ONLY in development when SMTP is not configured
  localOtpLog: process.env.NODE_ENV === 'development' && !process.env.SMTP_HOST,
};
