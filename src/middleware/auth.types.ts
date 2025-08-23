import { Request } from 'express';
import { UserRole } from '@/types/common.types';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
    tokenVersion: number;
  };
  id?: string;
}

export interface AuthMiddlewareOptions {
  required?: boolean;
  roles?: UserRole[];
  permissions?: string[];
  verifyEmail?: boolean;
  verifyPhone?: boolean;
}

export interface JwtAuthOptions {
  secret: string;
  algorithms?: string[];
  issuer?: string;
  audience?: string;
  ignoreExpiration?: boolean;
}

export interface ApiKeyAuthOptions {
  header?: string;
  query?: string;
  validApiKeys: string[];
  rateLimits?: {
    windowMs: number;
    maxRequests: number;
  };
}

export interface SessionAuthOptions {
  secret: string;
  resave?: boolean;
  saveUninitialized?: boolean;
  cookie?: {
    secure?: boolean;
    httpOnly?: boolean;
    maxAge?: number;
    sameSite?: 'strict' | 'lax' | 'none' | boolean;
  };
  store?: any;
}

export interface RolePermission {
  role: UserRole;
  permissions: string[];
  description: string;
}

export interface PermissionCheck {
  resource: string;
  action: string;
  condition?: (user: any, resource: any) => boolean;
}

export type AuthStrategy = 
  | 'jwt' 
  | 'session' 
  | 'api-key' 
  | 'oauth' 
  | 'basic';

export interface AuthConfig {
  strategy: AuthStrategy;
  options: JwtAuthOptions | SessionAuthOptions | ApiKeyAuthOptions;
  fallbackStrategies?: AuthStrategy[];
}