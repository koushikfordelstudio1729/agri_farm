import type { UserRole, DatabaseId } from './common.types';

export interface AuthTokenPayload {
  userId: DatabaseId;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  userId: DatabaseId;
  tokenId: string;
  iat: number;
  exp: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  countryCode?: string;
  preferredLanguage?: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  marketingConsent?: boolean;
}

export interface PhoneLoginCredentials {
  phone: string;
  countryCode: string;
}

export interface OtpVerificationData {
  phone: string;
  countryCode: string;
  otp: string;
  verificationType: 'registration' | 'login' | 'phone_update' | 'password_reset';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface AuthResponse {
  user: {
    id: DatabaseId;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
    profileImage?: string;
  };
  tokens: AuthTokens;
}

export interface SocialAuthProfile {
  provider: 'google' | 'facebook' | 'apple';
  providerId: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
  isEmailVerified: boolean;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface EmailVerificationRequest {
  token: string;
}

export interface PhoneVerificationRequest {
  phone: string;
  countryCode: string;
}

export interface AccountLinkingRequest {
  linkingToken: string;
  provider: 'phone' | 'google' | 'facebook';
  credentials?: LoginCredentials | PhoneLoginCredentials;
}

export interface TwoFactorSetupRequest {
  method: 'sms' | 'email' | 'authenticator';
  phone?: string;
}

export interface TwoFactorVerificationRequest {
  code: string;
  method: 'sms' | 'email' | 'authenticator';
}

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  platform: string;
  browser?: string;
  ipAddress: string;
  userAgent: string;
}

export interface AuthSession {
  id: string;
  userId: DatabaseId;
  deviceInfo: DeviceInfo;
  isActive: boolean;
  lastActivity: Date;
  createdAt: Date;
}

export interface AuthUser {
  user: {
    id: DatabaseId;
    email: string;
    role: UserRole;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
  };
  sessionId?: string;
  deviceInfo?: DeviceInfo;
}

export type AuthProvider = 'email' | 'phone' | 'google' | 'facebook' | 'apple';

export interface AuthAttempt {
  id: string;
  userId?: DatabaseId;
  email?: string;
  phone?: string;
  provider: AuthProvider;
  success: boolean;
  failureReason?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

export interface AccountLockInfo {
  isLocked: boolean;
  lockReason?: string;
  lockedAt?: Date;
  lockExpiresAt?: Date;
  failedAttempts: number;
  maxAttempts: number;
}

// Additional types needed by config/auth.ts
export interface AuthConfig {
  jwt: {
    secret: string;
    refreshSecret: string;
    accessTokenExpiry: string;
    refreshTokenExpiry: string;
  };
  bcrypt: {
    saltRounds: number;
  };
  otp: {
    length: number;
    expiry: number;
    maxAttempts: number;
  };
  session: {
    secret: string;
    maxAge: number;
  };
  passwordPolicy: {
    minLength: number;
    maxLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
  };
  lockout: {
    maxAttempts: number;
    lockoutTime: number;
  };
  social: {
    google: {
      clientId: string;
      clientSecret: string;
      callbackUrl: string;
    };
    facebook: {
      appId: string;
      appSecret: string;
      callbackUrl: string;
    };
  };
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  tokenVersion: number;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}