export interface OtpServiceConfig {
  defaultLength: number;
  expiryMinutes: number;
  maxAttempts: number;
  resendCooldownSeconds: number;
  enableAlphanumeric: boolean;
}

export type OtpMethod = 'sms' | 'email' | 'call';
export type OtpType = 'verification' | 'login' | 'password_reset' | 'phone_change' | 'two_factor';

export interface OtpGenerateOptions {
  identifier: string; // phone number or email
  method: OtpMethod;
  type: OtpType;
  length?: number;
  expiryMinutes?: number;
  language?: string;
  template?: string;
}

export interface OtpGenerateResult {
  success: boolean;
  expiryTime?: Date;
  method?: OtpMethod;
  identifier?: string;
  messageId?: string;
  error?: string;
  waitTimeSeconds?: number;
}

export interface OtpVerifyOptions {
  identifier: string;
  otp: string;
  method: OtpMethod;
  type?: OtpType;
}

export interface OtpVerifyResult {
  success: boolean;
  verified?: boolean;
  error?: string;
  attemptsRemaining?: number;
  lockoutTime?: Date;
}

export interface OtpTemplate {
  subject: string;
  html: string;
  text?: string;
}

export interface OtpAttempt {
  identifier: string;
  otp: string;
  method: OtpMethod;
  success: boolean;
  attemptedAt: Date;
  ipAddress: string;
  userAgent: string;
}

export interface OtpRateLimit {
  identifier: string;
  method: OtpMethod;
  attempts: number;
  lastAttempt: Date;
  lockedUntil?: Date;
}

export interface OtpStatistics {
  identifier: string;
  method: OtpMethod;
  totalSent: number;
  totalVerified: number;
  successRate: number;
  averageAttempts: number;
  lastActivity: Date;
}

export interface StoredOtp {
  _id: string;
  identifier: string;
  otp: string;
  method: OtpMethod;
  type: OtpType;
  expiresAt: Date;
  isUsed: boolean;
  attempts: number;
  createdAt: Date;
  usedAt?: Date;
}