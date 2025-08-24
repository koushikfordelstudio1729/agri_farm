import { Document, Types } from 'mongoose';

export interface IEmailVerification extends Document {
  userId?: Types.ObjectId;
  email: string;
  otp?: string;
  hashedOtp: string;
  purpose: 'registration' | 'login' | 'email_update' | 'password_reset' | 'account_verification';
  verified: boolean;
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: Date;
  expiresAt: Date;
  verifiedAt?: Date;
  ipAddress: string;
  userAgent: string;
  metadata: {
    deviceId?: string;
    sessionId?: string;
    referrer?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IEmailVerificationMethods {
  isExpired(): boolean;
  canRetry(): boolean;
  incrementAttempts(): Promise<void>;
  verify(inputOtp: string): Promise<boolean>;
  markAsVerified(): Promise<void>;
  extend(minutes?: number): Promise<void>;
  generateNewOtp(): Promise<string>;
}

export interface IEmailVerificationStatics {
  findByEmail(email: string): Promise<IEmailVerification & IEmailVerificationMethods | null>;
  findActiveByEmail(email: string): Promise<IEmailVerification & IEmailVerificationMethods | null>;
  createVerification(data: CreateEmailVerificationData): Promise<IEmailVerification & IEmailVerificationMethods>;
  cleanupExpired(): Promise<number>;
  getVerificationStats(timeframe?: 'day' | 'week' | 'month'): Promise<EmailVerificationStats>;
  blockEmail(email: string, reason: string): Promise<void>;
  unblockEmail(email: string): Promise<void>;
  isEmailBlocked(email: string): Promise<boolean>;
}

export interface CreateEmailVerificationData {
  userId?: Types.ObjectId;
  email: string;
  purpose: 'registration' | 'login' | 'email_update' | 'password_reset' | 'account_verification';
  expirationMinutes?: number;
  ipAddress: string;
  userAgent: string;
  metadata?: {
    deviceId?: string;
    sessionId?: string;
    referrer?: string;
  };
}

export interface EmailVerificationStats {
  totalVerifications: number;
  successfulVerifications: number;
  failedVerifications: number;
  successRate: number;
  averageAttempts: number;
  topDomains: Array<{ domain: string; count: number }>;
  purposeBreakdown: Record<string, number>;
}

export interface EmailBlockList extends Document {
  email: string;
  domain?: string;
  reason: string;
  blockedBy?: Types.ObjectId;
  blockedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}