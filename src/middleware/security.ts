import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import hpp from 'hpp';
import { securityUtils } from '@/utils/security';
import logger from '@/utils/logger';
import { BadRequestError, createErrorContext } from '@/utils/errors';

export interface SecurityOptions {
  enableHelmet?: boolean;
  enableHpp?: boolean;
  enableXssProtection?: boolean;
  enableSqlInjectionProtection?: boolean;
  enableContentTypeValidation?: boolean;
  enableRequestSizeLimit?: boolean;
  maxRequestSize?: string;
  trustedOrigins?: string[];
  trustProxy?: boolean;
  enableCSP?: boolean;
  cspDirectives?: Record<string, string | string[]>;
}

class SecurityMiddleware {
  // Basic security headers using helmet
  static helmet(options: Parameters<typeof helmet>[0] = {}) {
    const defaultOptions = {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      ...options,
    };

    return helmet(defaultOptions);
  }

  // HTTP Parameter Pollution protection
  static hpp(options: Parameters<typeof hpp>[0] = {}) {
    const defaultOptions = {
      whitelist: ['tags', 'categories', 'filters'],
      ...options,
    };

    return hpp(defaultOptions);
  }

  // XSS Protection
  static xssProtection() {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        // Sanitize query parameters
        for (const [key, value] of Object.entries(req.query)) {
          if (typeof value === 'string') {
            req.query[key] = securityUtils.sanitizeInput(value);
          }
        }

        // Sanitize body data
        if (req.body && typeof req.body === 'object') {
          req.body = this.sanitizeObject(req.body);
        }

        next();
      } catch (error) {
        logger.error('XSS protection error', error as Error);
        next(error);
      }
    };
  }

  // SQL Injection protection
  static sqlInjectionProtection() {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        // Check query parameters
        for (const [key, value] of Object.entries(req.query)) {
          if (typeof value === 'string' && !securityUtils.validateSqlInput(value)) {
            logger.warn('Potential SQL injection attempt detected in query', {
              key,
              value: value.substring(0, 100),
              ip: req.ip,
              userAgent: req.headers['user-agent'],
              endpoint: req.originalUrl,
            });

            throw new BadRequestError(
              'Invalid characters detected in request',
              createErrorContext(req)
            );
          }
        }

        // Check body data
        if (req.body && typeof req.body === 'object') {
          this.checkObjectForSqlInjection(req.body, req);
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  // Content type validation
  static contentTypeValidation(allowedTypes: string[] = ['application/json', 'multipart/form-data']) {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (req.method === 'GET' || req.method === 'DELETE') {
        return next(); // No body expected
      }

      const contentType = req.headers['content-type'];
      
      if (!contentType) {
        return next(new BadRequestError(
          'Content-Type header is required',
          createErrorContext(req)
        ));
      }

      const isAllowed = allowedTypes.some(type => contentType.includes(type));
      
      if (!isAllowed) {
        logger.warn('Invalid content type', {
          contentType,
          allowedTypes,
          ip: req.ip,
          endpoint: req.originalUrl,
        });

        return next(new BadRequestError(
          `Content-Type '${contentType}' is not allowed`,
          createErrorContext(req)
        ));
      }

      next();
    };
  }

  // Request size limiting
  static requestSizeLimit(limit: string = '10mb') {
    return (req: Request, res: Response, next: NextFunction): void => {
      const contentLength = req.headers['content-length'];
      
      if (contentLength) {
        const sizeInBytes = parseInt(contentLength, 10);
        const limitInBytes = this.parseSize(limit);
        
        if (sizeInBytes > limitInBytes) {
          logger.warn('Request size limit exceeded', {
            size: sizeInBytes,
            limit: limitInBytes,
            ip: req.ip,
            endpoint: req.originalUrl,
          });

          return next(new BadRequestError(
            `Request size exceeds limit of ${limit}`,
            createErrorContext(req)
          ));
        }
      }

      next();
    };
  }

  // Trusted origins validation
  static originValidation(trustedOrigins: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const origin = req.headers.origin;
      
      if (origin && !securityUtils.validateOrigin(origin, trustedOrigins)) {
        logger.warn('Untrusted origin detected', {
          origin,
          trustedOrigins,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        });

        return next(new BadRequestError(
          'Origin not allowed',
          createErrorContext(req)
        ));
      }

      next();
    };
  }

  // Secure context validation (HTTPS)
  static requireHttps() {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!securityUtils.isSecureContext(req)) {
        return next(new BadRequestError(
          'HTTPS is required',
          createErrorContext(req)
        ));
      }

      next();
    };
  }

  // API key validation
  static validateApiKey(headerName: string = 'x-api-key') {
    return (req: Request, res: Response, next: NextFunction): void => {
      const apiKey = req.headers[headerName.toLowerCase()] as string;
      
      if (!apiKey) {
        return next(new BadRequestError(
          'API key is required',
          createErrorContext(req)
        ));
      }

      if (!securityUtils.validateApiKeyFormat(apiKey)) {
        logger.warn('Invalid API key format', {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          endpoint: req.originalUrl,
        });

        return next(new BadRequestError(
          'Invalid API key format',
          createErrorContext(req)
        ));
      }

      // Add hashed API key to request for further validation
      (req as any).hashedApiKey = securityUtils.hashApiKey(apiKey);
      next();
    };
  }

  // CSRF protection
  static csrfProtection() {
    const tokens = new Map<string, { token: string; expires: number }>();

    return {
      generateToken: (req: Request, res: Response, next: NextFunction): void => {
        const token = securityUtils.generateCSRFToken();
        const sessionId = (req as any).sessionID || req.headers['x-session-id'] || 'default';
        
        tokens.set(sessionId, {
          token,
          expires: Date.now() + (30 * 60 * 1000), // 30 minutes
        });

        (req as any).csrfToken = token;
        res.setHeader('X-CSRF-Token', token);
        next();
      },

      validateToken: (req: Request, res: Response, next: NextFunction): void => {
        if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
          return next();
        }

        const sessionId = (req as any).sessionID || req.headers['x-session-id'] || 'default';
        const providedToken = req.headers['x-csrf-token'] as string || req.body._token;
        
        const sessionToken = tokens.get(sessionId);
        
        if (!sessionToken || sessionToken.expires < Date.now()) {
          tokens.delete(sessionId);
          return next(new BadRequestError(
            'CSRF token expired',
            createErrorContext(req)
          ));
        }

        if (!providedToken || !securityUtils.validateCSRFToken(providedToken, sessionToken.token)) {
          logger.warn('CSRF token validation failed', {
            sessionId,
            hasToken: !!providedToken,
            ip: req.ip,
            endpoint: req.originalUrl,
          });

          return next(new BadRequestError(
            'Invalid CSRF token',
            createErrorContext(req)
          ));
        }

        next();
      },
    };
  }

  // Comprehensive security middleware
  static comprehensive(options: SecurityOptions = {}) {
    const {
      enableHelmet = true,
      enableHpp = true,
      enableXssProtection = true,
      enableSqlInjectionProtection = true,
      enableContentTypeValidation = true,
      enableRequestSizeLimit = true,
      maxRequestSize = '10mb',
      trustedOrigins = [],
    } = options;

    const middlewares = [];

    if (enableHelmet) {
      middlewares.push(this.helmet());
    }

    if (enableHpp) {
      middlewares.push(this.hpp());
    }

    if (enableXssProtection) {
      middlewares.push(this.xssProtection());
    }

    if (enableSqlInjectionProtection) {
      middlewares.push(this.sqlInjectionProtection());
    }

    if (enableContentTypeValidation) {
      middlewares.push(this.contentTypeValidation());
    }

    if (enableRequestSizeLimit) {
      middlewares.push(this.requestSizeLimit(maxRequestSize));
    }

    if (trustedOrigins.length > 0) {
      middlewares.push(this.originValidation(trustedOrigins));
    }

    return middlewares;
  }

  // Private helper methods
  private static sanitizeObject(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return typeof obj === 'string' ? securityUtils.sanitizeInput(obj) : obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = this.sanitizeObject(value);
    }

    return sanitized;
  }

  private static checkObjectForSqlInjection(obj: any, req: Request): void {
    if (obj === null || typeof obj !== 'object') {
      if (typeof obj === 'string' && !securityUtils.validateSqlInput(obj)) {
        logger.warn('Potential SQL injection attempt detected in body', {
          value: obj.substring(0, 100),
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          endpoint: req.originalUrl,
        });

        throw new BadRequestError(
          'Invalid characters detected in request body',
          createErrorContext(req)
        );
      }
      return;
    }

    for (const value of Object.values(obj)) {
      this.checkObjectForSqlInjection(value, req);
    }
  }

  private static parseSize(size: string): number {
    const units: Record<string, number> = {
      b: 1,
      kb: 1024,
      mb: 1024 * 1024,
      gb: 1024 * 1024 * 1024,
    };

    const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)([a-z]+)$/);
    if (!match) {
      return parseInt(size, 10) || 0;
    }

    const value = parseFloat(match[1]);
    const unit = match[2];

    return Math.floor(value * (units[unit] || 1));
  }
}

export default SecurityMiddleware;