import { Document } from 'mongoose';
import { UserRole, LanguageCode, DatabaseId } from '@/types/common.types';

export interface IUser extends Document {
  _id: DatabaseId;
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  countryCode?: string;
  profileImage?: string;
  role: UserRole;
  
  // Verification status
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  emailVerifiedAt?: Date;
  phoneVerifiedAt?: Date;
  
  // Preferences
  language: LanguageCode;
  timezone: string;
  units: {
    temperature: 'celsius' | 'fahrenheit';
    area: 'hectares' | 'acres';
    weight: 'kg' | 'pounds';
  };
  
  // Profile information
  location?: {
    address: string;
    city: string;
    state: string;
    country: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  
  // Agricultural information
  farmingExperience?: number; // years
  farmSize?: number; // in hectares
  primaryCrops: string[];
  farmingType: 'organic' | 'conventional' | 'sustainable' | 'mixed';
  
  // Account status
  isActive: boolean;
  isBlocked: boolean;
  blockedReason?: string;
  blockedAt?: Date;
  blockedBy?: DatabaseId;
  
  // Security
  tokenVersion: number;
  lastLoginAt?: Date;
  lastLoginIP?: string;
  failedLoginAttempts: number;
  accountLockedUntil?: Date;
  
  // Privacy and consent
  acceptedTermsAt: Date;
  acceptedPrivacyAt: Date;
  marketingConsent: boolean;
  dataProcessingConsent: boolean;
  
  // Subscription and limits
  subscriptionTier: 'free' | 'premium' | 'expert';
  subscriptionExpiresAt?: Date;
  dailyDiagnosisCount: number;
  dailyDiagnosisLimit: number;
  lastDiagnosisReset: Date;
  
  // Social features
  followersCount: number;
  followingCount: number;
  postsCount: number;
  likesReceived: number;
  reputation: number;
  
  // Metadata
  onboardingCompleted: boolean;
  lastActiveAt: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserMethods {
  comparePassword(password: string): Promise<boolean>;
  generateAuthTokens(): Promise<{ accessToken: string; refreshToken: string }>;
  incrementTokenVersion(): Promise<void>;
  isAccountLocked(): boolean;
  incrementFailedLoginAttempts(): Promise<void>;
  resetFailedLoginAttempts(): Promise<void>;
  canMakeDiagnosis(): boolean;
  incrementDiagnosisCount(): Promise<void>;
  resetDailyLimits(): Promise<void>;
  updateLastActive(): Promise<void>;
  getPublicProfile(): Partial<IUser>;
  toSafeObject(): Partial<IUser>;
}

export interface IUserStatics {
  findByEmail(email: string): Promise<IUser | null>;
  findByPhone(phone: string, countryCode?: string): Promise<IUser | null>;
  findActive(): Promise<IUser[]>;
  findByRole(role: UserRole): Promise<IUser[]>;
  searchUsers(query: string, filters?: UserSearchFilters): Promise<IUser[]>;
  getUserStats(): Promise<UserStats>;
  cleanupInactiveUsers(days: number): Promise<number>;
}

export interface UserSearchFilters {
  role?: UserRole;
  isVerified?: boolean;
  location?: {
    country?: string;
    state?: string;
    city?: string;
  };
  farmingType?: IUser['farmingType'];
  subscriptionTier?: IUser['subscriptionTier'];
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  verifiedUsers: number;
  usersByRole: Record<UserRole, number>;
  usersBySubscription: Record<IUser['subscriptionTier'], number>;
  newUsersThisMonth: number;
  averageSessionDuration: number;
  topCountries: Array<{
    country: string;
    count: number;
  }>;
}

export interface CreateUserData {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  countryCode?: string;
  language?: LanguageCode;
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
  marketingConsent?: boolean;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  countryCode?: string;
  profileImage?: string;
  language?: LanguageCode;
  timezone?: string;
  units?: IUser['units'];
  location?: IUser['location'];
  farmingExperience?: number;
  farmSize?: number;
  primaryCrops?: string[];
  farmingType?: IUser['farmingType'];
  marketingConsent?: boolean;
}

export interface UserLoginData {
  email?: string;
  phone?: string;
  countryCode?: string;
  password?: string;
  provider?: 'email' | 'phone' | 'google' | 'facebook';
  rememberMe?: boolean;
}

export interface UserRegistrationData extends CreateUserData {
  profileImage?: string;
  referralCode?: string;
  source?: 'web' | 'mobile' | 'api';
}