import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '@/models/User';
import { 
  AuthenticationError, 
  AuthorizationError,
  createErrorContext,
  ERROR_MESSAGES 
} from '@/utils/errors';
import { logger } from '@/utils/logger';
import { AuthTokenPayload, UserRole } from '@/types';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: UserRole;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
  };
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (!token) {
      throw new AuthenticationError(
        ERROR_MESSAGES.AUTH.TOKEN_REQUIRED,
        createErrorContext(req)
      );
    }

    // Verify JWT token
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not defined');
    }

    const decoded = jwt.verify(token, secret) as AuthTokenPayload;

    // Find user and check if account is active
    const user = await User.findActiveById(decoded.userId);
    if (!user) {
      throw new AuthenticationError(
        ERROR_MESSAGES.USER.NOT_FOUND,
        createErrorContext(req)
      );
    }

    // Check if account is locked
    if (user.isLocked()) {
      throw new AuthenticationError(
        ERROR_MESSAGES.AUTH.ACCOUNT_LOCKED,
        createErrorContext(req)
      );
    }

    // Add user info to request
    (req as AuthenticatedRequest).user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
    };

    // Update last login time
    user.lastLoginAt = new Date();
    await user.save();

    logger.info('User authenticated successfully', {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    next();
  } catch (error) {
    logger.warn('Authentication failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      endpoint: req.originalUrl,
      method: req.method,
    });

    if (error instanceof jwt.JsonWebTokenError) {
      next(new AuthenticationError(
        ERROR_MESSAGES.AUTH.TOKEN_INVALID,
        createErrorContext(req)
      ));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AuthenticationError(
        'Token has expired',
        createErrorContext(req)
      ));
    } else {
      next(error);
    }
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const user = (req as AuthenticatedRequest).user;
      
      if (!user) {
        throw new AuthenticationError(
          ERROR_MESSAGES.AUTH.TOKEN_REQUIRED,
          createErrorContext(req)
        );
      }

      if (!roles.includes(user.role)) {
        logger.warn('Authorization failed', {
          userId: user.id,
          userRole: user.role,
          requiredRoles: roles,
          endpoint: req.originalUrl,
          method: req.method,
        });

        throw new AuthorizationError(
          ERROR_MESSAGES.AUTH.INSUFFICIENT_PERMISSIONS,
          createErrorContext(req)
        );
      }

      logger.debug('Authorization successful', {
        userId: user.id,
        userRole: user.role,
        requiredRoles: roles,
      });

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const requireEmailVerification = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const user = (req as AuthenticatedRequest).user;
    
    if (!user) {
      throw new AuthenticationError(
        ERROR_MESSAGES.AUTH.TOKEN_REQUIRED,
        createErrorContext(req)
      );
    }

    if (!user.isEmailVerified) {
      logger.warn('Email verification required', {
        userId: user.id,
        email: user.email,
        endpoint: req.originalUrl,
      });

      throw new AuthenticationError(
        ERROR_MESSAGES.AUTH.EMAIL_NOT_VERIFIED,
        createErrorContext(req)
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const requirePhoneVerification = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const user = (req as AuthenticatedRequest).user;
    
    if (!user) {
      throw new AuthenticationError(
        ERROR_MESSAGES.AUTH.TOKEN_REQUIRED,
        createErrorContext(req)
      );
    }

    if (!user.isPhoneVerified) {
      logger.warn('Phone verification required', {
        userId: user.id,
        endpoint: req.originalUrl,
      });

      throw new AuthenticationError(
        ERROR_MESSAGES.AUTH.PHONE_NOT_VERIFIED,
        createErrorContext(req)
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const optionalAuthenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (!token) {
      // No token provided, continue without authentication
      return next();
    }

    // Verify JWT token
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not defined');
    }

    const decoded = jwt.verify(token, secret) as AuthTokenPayload;

    // Find user and check if account is active
    const user = await User.findActiveById(decoded.userId);
    if (user && !user.isLocked()) {
      // Add user info to request
      (req as AuthenticatedRequest).user = {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
      };

      // Update last login time
      user.lastLoginAt = new Date();
      await user.save();
    }

    next();
  } catch (error) {
    // If token is invalid, continue without authentication
    // Don't throw error for optional authentication
    logger.debug('Optional authentication failed, continuing without auth', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    next();
  }
};

export const isOwnerOrRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const user = (req as AuthenticatedRequest).user;
      const resourceUserId = req.params.userId || req.params.id;
      
      if (!user) {
        throw new AuthenticationError(
          ERROR_MESSAGES.AUTH.TOKEN_REQUIRED,
          createErrorContext(req)
        );
      }

      // Check if user is the owner of the resource
      const isOwner = user.id === resourceUserId;
      
      // Check if user has required role
      const hasRole = roles.includes(user.role);

      if (!isOwner && !hasRole) {
        logger.warn('Access denied - not owner or required role', {
          userId: user.id,
          userRole: user.role,
          resourceUserId,
          requiredRoles: roles,
          endpoint: req.originalUrl,
        });

        throw new AuthorizationError(
          ERROR_MESSAGES.AUTH.INSUFFICIENT_PERMISSIONS,
          createErrorContext(req)
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const checkAccountStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    
    if (!user) {
      throw new AuthenticationError(
        ERROR_MESSAGES.AUTH.TOKEN_REQUIRED,
        createErrorContext(req)
      );
    }

    // Refresh user data to check current status
    const currentUser = await User.findById(user.id);
    
    if (!currentUser) {
      throw new AuthenticationError(
        ERROR_MESSAGES.USER.NOT_FOUND,
        createErrorContext(req)
      );
    }

    if (!currentUser.isActive) {
      logger.warn('Access attempt with inactive account', {
        userId: user.id,
        endpoint: req.originalUrl,
      });

      throw new AuthenticationError(
        'Account is deactivated',
        createErrorContext(req)
      );
    }

    if (currentUser.isDeleted) {
      logger.warn('Access attempt with deleted account', {
        userId: user.id,
        endpoint: req.originalUrl,
      });

      throw new AuthenticationError(
        'Account has been deleted',
        createErrorContext(req)
      );
    }

    if (currentUser.isLocked()) {
      throw new AuthenticationError(
        ERROR_MESSAGES.AUTH.ACCOUNT_LOCKED,
        createErrorContext(req)
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Rate limiting middleware for authentication endpoints
export const authRateLimit = (maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) => {
  const attempts = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up old entries
    for (const [key, value] of attempts.entries()) {
      if (value.resetTime < windowStart) {
        attempts.delete(key);
      }
    }

    const currentAttempts = attempts.get(ip) || { count: 0, resetTime: now + windowMs };

    if (currentAttempts.count >= maxAttempts && currentAttempts.resetTime > now) {
      const timeUntilReset = Math.ceil((currentAttempts.resetTime - now) / 1000);
      
      logger.warn('Authentication rate limit exceeded', {
        ip,
        attempts: currentAttempts.count,
        maxAttempts,
        timeUntilReset,
        endpoint: req.originalUrl,
      });

      res.status(429).json({
        success: false,
        message: 'Too many authentication attempts. Please try again later.',
        error: 'RateLimitExceeded',
        retryAfter: timeUntilReset,
      });
      return;
    }

    // Increment attempts
    currentAttempts.count += 1;
    attempts.set(ip, currentAttempts);

    next();
  };
};

export default {
  authenticate,
  authorize,
  requireEmailVerification,
  requirePhoneVerification,
  optionalAuthenticate,
  isOwnerOrRole,
  checkAccountStatus,
  authRateLimit,
};