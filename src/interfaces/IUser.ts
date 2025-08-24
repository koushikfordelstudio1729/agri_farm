import type { Document, Model } from 'mongoose';
import type { 
  UserProfile, 
  UserPreferences, 
  UserStats, 
  ExpertProfile,
  UserRole,
  LanguageCode,
  LocationData,
  ContactInfo,
  Address
} from '@/types';

export interface IUser extends Document {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  countryCode?: string;
  profileImage?: string;
  role: UserRole;
  
  // Verification status
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  phoneVerificationToken?: string;
  phoneVerificationExpires?: Date;
  
  // Password reset
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  
  // Refresh tokens
  refreshTokens: Array<{
    token: string;
    tokenId: string;
    createdAt: Date;
    expiresAt: Date;
    lastUsed: Date;
    deviceInfo?: {
      userAgent?: string;
      ip?: string;
    };
  }>;
  
  // User preferences
  preferredLanguage: LanguageCode;
  location?: LocationData;
  bio?: string;
  expertise?: string[];
  farmingExperience?: number;
  cropsOfInterest?: string[];
  farmSize?: number;
  farmType?: 'organic' | 'conventional' | 'hydroponic' | 'greenhouse';
  contactInfo?: ContactInfo;
  address?: Address;
  timezone?: string;
  
  // Account status
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  lastLoginAt?: Date;
  
  // Security
  failedLoginAttempts: number;
  lockUntil?: Date;
  
  // Consent tracking
  consents: Array<{
    type: 'terms' | 'privacy' | 'marketing';
    granted: boolean;
    version: string;
    timestamp: Date;
    ipAddress?: string;
  }>;
  
  // Social accounts
  socialAccounts?: Array<{
    provider: 'google' | 'facebook' | 'apple';
    providerId: string;
    email?: string;
    connectedAt: Date;
  }>;
  
  // Preferences
  preferences: UserPreferences;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Virtual fields
  fullName: string;
  isAccountLocked: boolean;
  
  // Instance methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateEmailVerificationToken(): string;
  generatePasswordResetToken(): string;
  generatePhoneVerificationToken(): string;
  toProfileJSON(): UserProfile;
  toStatsJSON(): UserStats;
  createPasswordResetToken(): string;
  createEmailVerificationToken(): string;
  createPhoneVerificationToken(): string;
  incrementLoginAttempts(): Promise<void>;
  resetLoginAttempts(): Promise<void>;
  isLocked(): boolean;
  
}

export interface IUserModel extends Model<IUser> {
  findByEmail(email: string): Promise<IUser | null>;
  findByPhone(phone: string, countryCode: string): Promise<IUser | null>;
  findActiveById(id: string): Promise<IUser | null>;
  createWithHashedPassword(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    countryCode?: string;
  }): Promise<IUser>;
}