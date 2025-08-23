import { Document } from 'mongoose';
import { DatabaseId } from '@/types/common.types';

export interface IOTPAttempt extends Document {
  _id: DatabaseId;
  phone: string;
  countryCode: string;
  attemptType: 'registration' | 'login' | 'phone_update' | 'password_reset';
  attempts: number;
  lastAttempt: Date;
  blocked: boolean;
  blockedUntil?: Date;
  metadata?: {
    ip: string;
    userAgent?: string;
    sessionId?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IOTPAttemptMethods {
  incrementAttempt(): Promise<void>;
  isBlocked(): boolean;
  block(durationMinutes?: number): Promise<void>;
  unblock(): Promise<void>;
  reset(): Promise<void>;
}

export interface IOTPAttemptStatics {
  findByPhone(phone: string, countryCode: string): Promise<IOTPAttempt | null>;
  createOrUpdate(phone: string, countryCode: string, attemptType: IOTPAttempt['attemptType'], metadata?: IOTPAttempt['metadata']): Promise<IOTPAttempt>;
  cleanup(olderThanDays: number): Promise<number>;
  getAttemptStats(dateRange?: { from: Date; to: Date }): Promise<{
    totalAttempts: number;
    blockedNumbers: number;
    attemptsByType: Record<string, number>;
  }>;
}

export interface CreateOTPAttemptData {
  phone: string;
  countryCode: string;
  attemptType: IOTPAttempt['attemptType'];
  metadata?: IOTPAttempt['metadata'];
}