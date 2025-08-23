import { Document } from 'mongoose';
import { DatabaseId } from '@/types/common.types';

export interface IPhoneVerification extends Document {
  _id: DatabaseId;
  userId?: DatabaseId;
  phone: string;
  countryCode: string;
  otp: string;
  hashedOtp: string;
  purpose: 'registration' | 'login' | 'phone_update' | 'password_reset' | 'account_verification';
  verified: boolean;
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: Date;
  expiresAt: Date;
  verifiedAt?: Date;
  ipAddress: string;
  userAgent: string;
  metadata?: {
    deviceId?: string;
    sessionId?: string;
    referrer?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IPhoneVerificationMethods {
  isExpired(): boolean;
  canRetry(): boolean;
  incrementAttempts(): Promise<void>;
  verify(inputOtp: string): Promise<boolean>;
  markAsVerified(): Promise<void>;
  extend(minutes?: number): Promise<void>;
  generateNewOtp(): Promise<string>;
}

export interface IPhoneVerificationStatics {
  findByPhone(phone: string, countryCode: string): Promise<IPhoneVerification | null>;
  findActiveByPhone(phone: string, countryCode: string): Promise<IPhoneVerification | null>;
  createVerification(data: CreatePhoneVerificationData): Promise<IPhoneVerification>;
  cleanupExpired(): Promise<number>;
  getVerificationStats(timeframe?: 'day' | 'week' | 'month'): Promise<PhoneVerificationStats>;
  blockPhone(phone: string, countryCode: string, reason: string): Promise<void>;
  unblockPhone(phone: string, countryCode: string): Promise<void>;
  isPhoneBlocked(phone: string, countryCode: string): Promise<boolean>;
}

export interface CreatePhoneVerificationData {
  userId?: DatabaseId;
  phone: string;
  countryCode: string;
  purpose: IPhoneVerification['purpose'];
  expirationMinutes?: number;
  ipAddress: string;
  userAgent: string;
  metadata?: IPhoneVerification['metadata'];
}

export interface PhoneVerificationStats {
  totalVerifications: number;
  successfulVerifications: number;
  failedVerifications: number;
  successRate: number;
  averageAttempts: number;
  topCountries: Array<{
    countryCode: string;
    count: number;
  }>;
  purposeBreakdown: Record<IPhoneVerification['purpose'], number>;
}

export interface PhoneVerificationFilters {
  userId?: DatabaseId;
  phone?: string;
  countryCode?: string;
  purpose?: IPhoneVerification['purpose'];
  verified?: boolean;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export interface PhoneBlockList extends Document {
  _id: DatabaseId;
  phone: string;
  countryCode: string;
  reason: string;
  blockedBy: DatabaseId;
  blockedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}