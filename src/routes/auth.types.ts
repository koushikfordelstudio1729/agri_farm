import type { Router } from 'express';
import type { 
  RegisterCredentials,
  LoginCredentials,
  PhoneLoginCredentials,
  OtpVerificationData,
  PasswordResetRequest,
  PasswordResetConfirm,
  ChangePasswordRequest,
  EmailVerificationRequest,
  PhoneVerificationRequest
} from '@/types';

// Route path constants
export const AUTH_ROUTES = {
  REGISTER: '/register',
  LOGIN: '/login',
  PHONE_AUTH: '/phone/auth',
  VERIFY_OTP: '/phone/verify',
  REFRESH: '/refresh',
  LOGOUT: '/logout',
  PASSWORD_RESET: '/password/reset',
  PASSWORD_RESET_CONFIRM: '/password/reset/confirm',
  PASSWORD_CHANGE: '/password/change',
  EMAIL_VERIFY: '/email/verify',
  EMAIL_RESEND: '/email/resend',
  PHONE_VERIFY: '/phone/verify-token',
  PHONE_RESEND: '/phone/resend',
  GOOGLE_AUTH: '/google',
  GOOGLE_CALLBACK: '/google/callback',
  FACEBOOK_AUTH: '/facebook',
  FACEBOOK_CALLBACK: '/facebook/callback',
  ME: '/me',
  SESSIONS: '/sessions',
} as const;

// Validation schemas
export interface RegisterValidationSchema {
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

export interface LoginValidationSchema {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface PhoneAuthValidationSchema {
  phone: string;
  countryCode: string;
}

export interface OtpValidationSchema {
  phone: string;
  countryCode: string;
  otp: string;
  verificationType: 'registration' | 'login' | 'phone_update' | 'password_reset';
}

export interface RefreshTokenValidationSchema {
  refreshToken: string;
}

export interface PasswordResetValidationSchema {
  email: string;
}

export interface PasswordResetConfirmValidationSchema {
  token: string;
  newPassword: string;
}

export interface ChangePasswordValidationSchema {
  currentPassword: string;
  newPassword: string;
}

export interface EmailVerificationValidationSchema {
  token: string;
}

export interface PhoneVerificationValidationSchema {
  phone: string;
  countryCode: string;
}

export interface ResendVerificationValidationSchema {
  email?: string;
  phone?: string;
  countryCode?: string;
  type: 'email' | 'phone';
}

// Rate limiting configurations
export interface AuthRateLimits {
  register: {
    windowMs: number;
    max: number;
  };
  login: {
    windowMs: number;
    max: number;
  };
  phoneAuth: {
    windowMs: number;
    max: number;
  };
  otpVerify: {
    windowMs: number;
    max: number;
  };
  passwordReset: {
    windowMs: number;
    max: number;
  };
  emailResend: {
    windowMs: number;
    max: number;
  };
}

// Route configuration
export interface AuthRouteConfig {
  router: Router;
  rateLimits: AuthRateLimits;
  validationRules: {
    [key: string]: any;
  };
}

// Middleware types for auth routes
export type AuthRouteHandler = (
  req: any,
  res: any,
  next: any
) => Promise<void> | void;

export interface AuthRouteMiddleware {
  rateLimiter: AuthRouteHandler;
  validator: AuthRouteHandler;
  sanitizer: AuthRouteHandler;
}