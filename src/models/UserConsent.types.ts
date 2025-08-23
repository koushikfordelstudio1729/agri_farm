import { Document } from 'mongoose';
import { DatabaseId } from '@/types/common.types';

export interface IUserConsent extends Document {
  _id: DatabaseId;
  userId: DatabaseId;
  consentType: 'terms_of_service' | 'privacy_policy' | 'marketing' | 'data_processing' | 'cookies' | 'push_notifications';
  version: string;
  isGranted: boolean;
  grantedAt?: Date;
  revokedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
  source: 'registration' | 'settings' | 'popup' | 'email' | 'api';
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserConsentMethods {
  grant(ipAddress?: string, userAgent?: string): Promise<void>;
  revoke(): Promise<void>;
  isValid(): boolean;
}

export interface IUserConsentStatics {
  findByUser(userId: DatabaseId): Promise<IUserConsent[]>;
  findByType(consentType: IUserConsent['consentType']): Promise<IUserConsent[]>;
  getConsentStats(): Promise<Record<string, { granted: number; revoked: number }>>;
  findExpired(): Promise<IUserConsent[]>;
}