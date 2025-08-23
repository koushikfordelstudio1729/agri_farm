import { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { securityUtils } from '@/utils/security';
import logger from '@/utils/logger';

export interface CorsOptions {
  origins?: string[] | string | boolean;
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
  preflightContinue?: boolean;
  optionsSuccessStatus?: number;
  dynamicOrigin?: (req: Request) => string[] | boolean;
  logCorsRequests?: boolean;
}

class CorsMiddleware {
  // Basic CORS middleware with default settings
  static basic(options: CorsOptions = {}) {
    const {
      origins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders = [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-HTTP-Method-Override',
        'Accept',
        'Accept-Encoding',
        'Accept-Language',
        'Connection',
        'Host',
        'Origin',
        'Referer',
        'User-Agent',
        'x-api-key',
        'x-client-id',
        'x-request-id',
      ],
      exposedHeaders = [
        'X-Total-Count',
        'X-Page-Count',
        'X-Per-Page',
        'X-Rate-Limit-Remaining',
        'X-Rate-Limit-Reset',
        'X-Response-Time',
      ],
      credentials = true,
      maxAge = 86400, // 24 hours
      optionsSuccessStatus = 200,
      logCorsRequests = true,
    } = options;

    const corsOptions: cors.CorsOptions = {
      origin: (origin, callback) => {
        // Handle dynamic origins
        if (options.dynamicOrigin) {
          const allowedOrigins = options.dynamicOrigin({} as Request);
          if (typeof allowedOrigins === 'boolean') {
            return callback(null, allowedOrigins);
          }
          if (Array.isArray(allowedOrigins)) {
            const allowed = !origin || allowedOrigins.includes(origin);
            return callback(null, allowed);
          }
        }

        // Handle static origins
        if (typeof origins === 'boolean') {
          return callback(null, origins);
        }

        if (typeof origins === 'string') {
          return callback(null, origins === origin);
        }

        if (Array.isArray(origins)) {
          const allowed = !origin || origins.includes(origin) || origins.includes('*');
          
          if (logCorsRequests) {
            logger.debug('CORS origin check', {
              origin,
              allowed,
              allowedOrigins: origins,
            });
          }

          return callback(null, allowed);
        }

        callback(null, false);
      },
      methods,
      allowedHeaders,
      exposedHeaders,
      credentials,
      maxAge,
      optionsSuccessStatus,
    };

    return cors(corsOptions);
  }

  // Development CORS (allows all origins)
  static development() {
    return this.basic({
      origins: true,
      credentials: true,
      logCorsRequests: true,
    });
  }

  // Production CORS (strict origin checking)
  static production(allowedOrigins: string[]) {
    return this.basic({
      origins: allowedOrigins,
      credentials: true,
      logCorsRequests: false, // Reduce logging in production
    });
  }

  // API-specific CORS
  static api(options: CorsOptions = {}) {
    return this.basic({
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-API-Key',
        'X-Client-ID',
        'X-Request-ID',
        'Accept',
        'Origin',
      ],
      exposedHeaders: [
        'X-Total-Count',
        'X-Rate-Limit-Remaining',
        'X-Rate-Limit-Reset',
        'X-Response-Time',
      ],
      ...options,
    });
  }

  // Mobile app CORS
  static mobile(appOrigins: string[]) {
    return this.basic({
      origins: appOrigins,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      credentials: false, // Mobile apps typically don't need credentials
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-API-Key',
        'X-Device-ID',
        'X-App-Version',
      ],
    });
  }

  // Custom CORS with origin validation
  static custom(originValidator: (origin: string, req: Request) => boolean) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const origin = req.headers.origin;
      
      if (req.method === 'OPTIONS') {
        // Handle preflight
        const allowed = !origin || originValidator(origin, req);
        
        if (allowed) {
          res.header('Access-Control-Allow-Origin', origin || '*');
          res.header('Access-Control-Allow-Credentials', 'true');
          res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
          res.header('Access-Control-Allow-Headers', 
            'Content-Type,Authorization,X-Requested-With,X-HTTP-Method-Override');
          res.header('Access-Control-Max-Age', '86400');
          
          logger.debug('CORS preflight handled', { origin, allowed });
          
          return res.status(200).end();
        } else {
          logger.warn('CORS preflight rejected', { origin });
          return res.status(403).json({ error: 'Origin not allowed' });
        }
      }

      // Handle actual request
      if (origin) {
        const allowed = originValidator(origin, req);
        
        if (allowed) {
          res.header('Access-Control-Allow-Origin', origin);
          res.header('Access-Control-Allow-Credentials', 'true');
          
          logger.debug('CORS request allowed', { origin });
        } else {
          logger.warn('CORS request rejected', { origin });
          return res.status(403).json({ error: 'Origin not allowed' });
        }
      }

      next();
    };
  }

  // Domain-based CORS
  static domainBased(allowedDomains: string[]) {
    return this.custom((origin, req) => {
      if (!origin) return true; // Allow requests without origin (e.g., mobile apps)
      
      try {
        const url = new URL(origin);
        return allowedDomains.includes(url.hostname);
      } catch {
        return false;
      }
    });
  }

  // Environment-based CORS
  static environment() {
    const env = process.env.NODE_ENV;
    
    switch (env) {
      case 'development':
        return this.development();
      
      case 'staging':
        return this.basic({
          origins: process.env.STAGING_ORIGINS?.split(',') || ['https://staging.example.com'],
          logCorsRequests: true,
        });
      
      case 'production':
        return this.production(
          process.env.PRODUCTION_ORIGINS?.split(',') || ['https://example.com']
        );
      
      default:
        return this.basic();
    }
  }

  // CORS with security checks
  static secure(options: CorsOptions & { validateReferer?: boolean } = {}) {
    const { validateReferer = true, ...corsOptions } = options;
    
    return (req: Request, res: Response, next: NextFunction): void => {
      const origin = req.headers.origin;
      const referer = req.headers.referer;
      const clientInfo = securityUtils.extractClientInfo(req);

      // Validate referer header if enabled
      if (validateReferer && referer && origin) {
        try {
          const originUrl = new URL(origin);
          const refererUrl = new URL(referer);
          
          if (originUrl.hostname !== refererUrl.hostname) {
            logger.warn('CORS security: Origin/Referer mismatch', {
              origin,
              referer,
              ip: clientInfo.ip,
              userAgent: clientInfo.userAgent,
            });
            
            return res.status(403).json({ error: 'Security violation detected' });
          }
        } catch (error) {
          logger.warn('CORS security: Invalid origin/referer URLs', {
            origin,
            referer,
            error: (error as Error).message,
          });
        }
      }

      // Apply basic CORS
      const basicCors = this.basic(corsOptions);
      basicCors(req, res, next);
    };
  }

  // CORS middleware with logging and analytics
  static withAnalytics() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const origin = req.headers.origin;
      const method = req.method;
      const startTime = Date.now();
      
      // Log CORS request
      logger.debug('CORS request', {
        origin,
        method,
        path: req.path,
        headers: {
          origin: req.headers.origin,
          referer: req.headers.referer,
          'user-agent': req.headers['user-agent'],
        },
      });

      // Measure CORS processing time
      res.on('finish', () => {
        const processingTime = Date.now() - startTime;
        
        logger.info('CORS request completed', {
          origin,
          method,
          path: req.path,
          statusCode: res.statusCode,
          processingTime,
        });
      });

      // Apply basic CORS
      const basicCors = this.basic();
      basicCors(req, res, next);
    };
  }

  // CORS preflight cache optimization
  static optimized(maxAge: number = 86400) {
    const preflightCache = new Map<string, { timestamp: number; response: any }>();
    
    return (req: Request, res: Response, next: NextFunction): void => {
      if (req.method === 'OPTIONS') {
        const cacheKey = `${req.headers.origin || 'no-origin'}:${req.path}`;
        const cached = preflightCache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp) < maxAge * 1000) {
          // Return cached preflight response
          Object.entries(cached.response).forEach(([header, value]) => {
            res.header(header, value as string);
          });
          
          logger.debug('CORS preflight served from cache', { cacheKey });
          return res.status(200).end();
        }
      }

      const basicCors = this.basic({ maxAge });
      basicCors(req, res, (err) => {
        if (!err && req.method === 'OPTIONS') {
          // Cache preflight response
          const cacheKey = `${req.headers.origin || 'no-origin'}:${req.path}`;
          const response = {
            'Access-Control-Allow-Origin': res.getHeader('Access-Control-Allow-Origin'),
            'Access-Control-Allow-Methods': res.getHeader('Access-Control-Allow-Methods'),
            'Access-Control-Allow-Headers': res.getHeader('Access-Control-Allow-Headers'),
            'Access-Control-Max-Age': res.getHeader('Access-Control-Max-Age'),
          };
          
          preflightCache.set(cacheKey, {
            timestamp: Date.now(),
            response,
          });
        }
        
        next(err);
      });
    };
  }
}

export default CorsMiddleware;