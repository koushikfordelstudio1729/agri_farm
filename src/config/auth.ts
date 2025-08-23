import jwt from 'jsonwebtoken';
import { AuthConfig, JwtPayload, TokenPair } from '@/types/auth.types';
import { logger } from '@/utils/logger';

export const authConfig: AuthConfig = {
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-key',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
    accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  },
  otp: {
    length: parseInt(process.env.OTP_LENGTH || '6', 10),
    expiry: parseInt(process.env.OTP_EXPIRY || '300', 10), // 5 minutes
    maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '3', 10),
  },
  session: {
    secret: process.env.SESSION_SECRET || 'fallback-session-secret',
    maxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000', 10), // 24 hours
  },
  passwordPolicy: {
    minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10),
    maxLength: parseInt(process.env.PASSWORD_MAX_LENGTH || '128', 10),
    requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE === 'true',
    requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE === 'true',
    requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS === 'true',
    requireSpecialChars: process.env.PASSWORD_REQUIRE_SPECIAL === 'true',
  },
  lockout: {
    maxAttempts: parseInt(process.env.LOGIN_MAX_ATTEMPTS || '5', 10),
    lockoutTime: parseInt(process.env.LOGIN_LOCKOUT_TIME || '300000', 10), // 5 minutes
  },
  social: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
    },
    facebook: {
      appId: process.env.FACEBOOK_APP_ID || '',
      appSecret: process.env.FACEBOOK_APP_SECRET || '',
      callbackUrl: process.env.FACEBOOK_CALLBACK_URL || 'http://localhost:3000/api/auth/facebook/callback',
    },
  },
};

export const generateTokens = async (payload: JwtPayload): Promise<TokenPair> => {
  try {
    const accessToken = (jwt.sign as any)(
      payload,
      authConfig.jwt.secret,
      {
        expiresIn: authConfig.jwt.accessTokenExpiry,
        issuer: 'agri-farm-api',
        audience: 'agri-farm-app',
      }
    );

    const refreshToken = (jwt.sign as any)(
      { userId: payload.userId, tokenVersion: payload.tokenVersion },
      authConfig.jwt.refreshSecret,
      {
        expiresIn: authConfig.jwt.refreshTokenExpiry,
        issuer: 'agri-farm-api',
        audience: 'agri-farm-app',
      }
    );

    return { accessToken, refreshToken };
  } catch (error) {
    logger.error('Token generation failed', error instanceof Error ? error : new Error(String(error)));
    throw new Error('Failed to generate authentication tokens');
  }
};

export const verifyAccessToken = async (token: string): Promise<JwtPayload> => {
  try {
    const decoded = jwt.verify(token, authConfig.jwt.secret, {
      issuer: 'agri-farm-api',
      audience: 'agri-farm-app',
    }) as JwtPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Access token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid access token');
    }
    throw new Error('Token verification failed');
  }
};

export const verifyRefreshToken = async (token: string): Promise<{ userId: string; tokenVersion: number }> => {
  try {
    const decoded = jwt.verify(token, authConfig.jwt.refreshSecret, {
      issuer: 'agri-farm-api',
      audience: 'agri-farm-app',
    }) as { userId: string; tokenVersion: number };

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token');
    }
    throw new Error('Refresh token verification failed');
  }
};

export const getTokenExpirationTime = (token: string): Date | null => {
  try {
    const decoded = jwt.decode(token) as { exp?: number };
    if (decoded?.exp) {
      return new Date(decoded.exp * 1000);
    }
    return null;
  } catch {
    return null;
  }
};

export const validatePasswordStrength = (password: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  const { passwordPolicy } = authConfig;

  if (password.length < passwordPolicy.minLength) {
    errors.push(`Password must be at least ${passwordPolicy.minLength} characters long`);
  }

  if (password.length > passwordPolicy.maxLength) {
    errors.push(`Password must not exceed ${passwordPolicy.maxLength} characters`);
  }

  if (passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (passwordPolicy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (passwordPolicy.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (passwordPolicy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export default authConfig;