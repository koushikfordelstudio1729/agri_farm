import type { Request, Response } from 'express';
import type {
  LoginCredentials,
  RegisterCredentials,
  PhoneLoginCredentials,
  OtpVerificationData,
  AuthResponse,
  AuthTokens,
  PasswordResetRequest,
  PasswordResetConfirm,
  ChangePasswordRequest,
  EmailVerificationRequest,
  PhoneVerificationRequest,
  SocialAuthProfile,
  DatabaseId,
  ApiResponse,
  TypedResponse
} from '@/types';

// Request interfaces
export interface RegisterRequest extends Request {
  body: RegisterCredentials;
}

export interface LoginRequest extends Request {
  body: LoginCredentials;
}

export interface PhoneAuthRequest extends Request {
  body: PhoneLoginCredentials;
}

export interface VerifyOtpRequest extends Request {
  body: OtpVerificationData;
}

export interface RefreshTokenRequest extends Request {
  body: {
    refreshToken: string;
  };
}

export interface PasswordResetEmailRequest extends Request {
  body: PasswordResetRequest;
}

export interface PasswordResetConfirmRequest extends Request {
  body: PasswordResetConfirm;
}

export interface ChangePasswordAuthRequest extends Request {
  body: ChangePasswordRequest;
  user: {
    id: DatabaseId;
    email: string;
  };
}

export interface EmailVerifyRequest extends Request {
  body: EmailVerificationRequest;
}

export interface PhoneVerifyRequest extends Request {
  body: PhoneVerificationRequest;
}

export interface ResendVerificationRequest extends Request {
  body: {
    email?: string;
    phone?: string;
    countryCode?: string;
    type: 'email' | 'phone';
  };
}

export interface SocialAuthCallbackRequest extends Request {
  user?: SocialAuthProfile;
}

export interface LogoutRequest extends Request {
  body: {
    refreshToken?: string;
    allDevices?: boolean;
  };
  user: {
    id: DatabaseId;
  };
}

// Response interfaces
export interface AuthSuccessResponse extends ApiResponse<AuthResponse> {}

export interface TokensResponse extends ApiResponse<AuthTokens> {}

export interface VerificationResponse extends ApiResponse<{
  message: string;
  resendAvailableAt?: Date;
}> {}

export interface PasswordResetResponse extends ApiResponse<{
  message: string;
  resetTokenSent: boolean;
}> {}

// Controller method types
export type RegisterController = (
  req: RegisterRequest,
  res: TypedResponse<AuthResponse>
) => Promise<void>;

export type LoginController = (
  req: LoginRequest,
  res: TypedResponse<AuthResponse>
) => Promise<void>;

export type PhoneAuthController = (
  req: PhoneAuthRequest,
  res: TypedResponse<{ message: string; otpSent: boolean }>
) => Promise<void>;

export type VerifyOtpController = (
  req: VerifyOtpRequest,
  res: TypedResponse<AuthResponse>
) => Promise<void>;

export type RefreshTokenController = (
  req: RefreshTokenRequest,
  res: TypedResponse<AuthTokens>
) => Promise<void>;

export type LogoutController = (
  req: LogoutRequest,
  res: TypedResponse<{ message: string }>
) => Promise<void>;

export type PasswordResetEmailController = (
  req: PasswordResetEmailRequest,
  res: TypedResponse<{ message: string }>
) => Promise<void>;

export type PasswordResetConfirmController = (
  req: PasswordResetConfirmRequest,
  res: TypedResponse<{ message: string }>
) => Promise<void>;

export type ChangePasswordController = (
  req: ChangePasswordAuthRequest,
  res: TypedResponse<{ message: string }>
) => Promise<void>;

export type EmailVerificationController = (
  req: EmailVerifyRequest,
  res: TypedResponse<{ message: string }>
) => Promise<void>;

export type PhoneVerificationController = (
  req: PhoneVerifyRequest,
  res: TypedResponse<{ message: string }>
) => Promise<void>;

export type ResendVerificationController = (
  req: ResendVerificationRequest,
  res: TypedResponse<{ message: string; resendAvailableAt?: Date }>
) => Promise<void>;

export type SocialAuthController = (
  req: SocialAuthCallbackRequest,
  res: TypedResponse<AuthResponse>
) => Promise<void>;

// Service response types
export interface AuthServiceResult {
  success: boolean;
  user?: any;
  tokens?: AuthTokens;
  message?: string;
  error?: string;
}

export interface OtpServiceResult {
  success: boolean;
  otpSent: boolean;
  message: string;
  resendAvailableAt?: Date;
  error?: string;
}

export interface PasswordResetResult {
  success: boolean;
  resetTokenSent: boolean;
  message: string;
  error?: string;
}