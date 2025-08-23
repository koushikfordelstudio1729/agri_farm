import { Document } from 'mongoose';
import { DatabaseId } from '@/types/common.types';

export interface ISocialAccount extends Document {
  _id: DatabaseId;
  userId: DatabaseId;
  provider: 'google' | 'facebook' | 'twitter' | 'apple' | 'linkedin';
  providerId: string;
  email?: string;
  displayName?: string;
  profileImage?: string;
  profileData: {
    firstName?: string;
    lastName?: string;
    locale?: string;
    timezone?: string;
    verified?: boolean;
    gender?: string;
    birthday?: string;
    location?: string;
  };
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: Date;
  scope?: string[];
  isActive: boolean;
  lastUsed?: Date;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    country?: string;
    city?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ISocialAccountMethods {
  updateTokens(accessToken: string, refreshToken?: string, expiresIn?: number): Promise<void>;
  updateProfileData(data: Partial<ISocialAccount['profileData']>): Promise<void>;
  deactivate(): Promise<void>;
  reactivate(): Promise<void>;
  updateLastUsed(metadata?: ISocialAccount['metadata']): Promise<void>;
  isTokenExpired(): boolean;
}

export interface ISocialAccountStatics {
  findByUserId(userId: DatabaseId): Promise<ISocialAccount[]>;
  findByProvider(provider: ISocialAccount['provider'], providerId: string): Promise<ISocialAccount | null>;
  findByEmail(email: string, provider?: ISocialAccount['provider']): Promise<ISocialAccount[]>;
  getProviderStats(): Promise<{
    totalAccounts: number;
    activeAccounts: number;
    accountsByProvider: Record<string, number>;
    recentConnections: number;
  }>;
  cleanup(inactiveDays: number): Promise<number>;
}

export interface CreateSocialAccountData {
  userId: DatabaseId;
  provider: ISocialAccount['provider'];
  providerId: string;
  email?: string;
  displayName?: string;
  profileImage?: string;
  profileData?: ISocialAccount['profileData'];
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: Date;
  scope?: string[];
  metadata?: ISocialAccount['metadata'];
}

export interface UpdateSocialAccountData {
  email?: string;
  displayName?: string;
  profileImage?: string;
  profileData?: Partial<ISocialAccount['profileData']>;
  isActive?: boolean;
}