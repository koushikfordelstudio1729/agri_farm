import { Request, Response, NextFunction } from 'express';
import { RateLimitError } from '@/utils/errors';
import { logger } from '@/utils/logger';
import {
  RateLimitOptions,
  RateLimitStore,
  RateLimitInfo,
  MemoryStore,
  RateLimitMiddleware,
  CreateRateLimitOptions,
  RateLimitPresets,
} from './rateLimit.types';

// Default memory store implementation
class DefaultMemoryStore implements MemoryStore {
  public hits = new Map<string, RateLimitInfo>();
  public resetTime: NodeJS.Timeout | null = null;

  async get(key: string): Promise<RateLimitInfo | undefined> {
    return this.hits.get(key);
  }

  async set(key: string, value: RateLimitInfo, windowMs: number): Promise<void> {
    this.hits.set(key, value);
    this.scheduleReset(key, windowMs);
  }

  async increment(key: string, windowMs: number): Promise<RateLimitInfo> {
    const now = Date.now();
    const existing = this.hits.get(key);

    if (existing && (now - existing.firstRequest) < windowMs) {
      existing.count++;
      this.hits.set(key, existing);
      return existing;
    }

    const newInfo: RateLimitInfo = {
      count: 1,
      resetTime: now + windowMs,
      firstRequest: now,
    };

    this.hits.set(key, newInfo);
    this.scheduleReset(key, windowMs);
    return newInfo;
  }

  async decrement(key: string): Promise<void> {
    const existing = this.hits.get(key);
    if (existing && existing.count > 0) {
      existing.count--;
      this.hits.set(key, existing);
    }
  }

  async resetAll(): Promise<void> {
    this.hits.clear();
    if (this.resetTime) {
      clearTimeout(this.resetTime);
      this.resetTime = null;
    }
  }

  private scheduleReset(key: string, windowMs: number): void {
    setTimeout(() => {
      this.hits.delete(key);
    }, windowMs);
  }
}

export class RateLimiter {
  private static defaultStore = new DefaultMemoryStore();

  public static create(options: CreateRateLimitOptions): RateLimitMiddleware {
    const {
      windowMs,
      maxRequests,
      message = 'Too many requests from this IP, please try again later.',
      standardHeaders = true,
      legacyHeaders = false,
      skipSuccessfulRequests = false,
      skipFailedRequests = false,
      keyGenerator = (req: Request) => req.ip || 'unknown',
      skip = () => false,
      handler,
      onLimitReached,
      store = this.defaultStore,
    } = options;

    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        // Check if request should be skipped
        if (skip(req, res)) {
          return next();
        }

        const key = keyGenerator(req);
        const rateLimitInfo = await store.increment(key, windowMs);
        const isLimitExceeded = rateLimitInfo.count > maxRequests;

        // Set rate limit headers
        if (standardHeaders) {
          res.set({
            'RateLimit-Limit': maxRequests.toString(),
            'RateLimit-Remaining': Math.max(0, maxRequests - rateLimitInfo.count).toString(),
            'RateLimit-Reset': new Date(rateLimitInfo.resetTime).toISOString(),
            'RateLimit-Policy': `${maxRequests};w=${Math.floor(windowMs / 1000)}`,
          });
        }

        if (legacyHeaders) {
          res.set({
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': Math.max(0, maxRequests - rateLimitInfo.count).toString(),
            'X-RateLimit-Reset': Math.ceil(rateLimitInfo.resetTime / 1000).toString(),
          });
        }

        if (isLimitExceeded) {
          // Log rate limit exceeded
          logger.warn('Rate limit exceeded', {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            endpoint: req.originalUrl,
            method: req.method,
            key,
            count: rateLimitInfo.count,
            limit: maxRequests,
            windowMs,
          });

          // Call onLimitReached callback
          if (onLimitReached) {
            onLimitReached(req, res);
          }

          // Use custom handler or default
          if (handler) {
            return handler(req, res, next);
          }

          // Set Retry-After header
          const retryAfterSeconds = Math.ceil((rateLimitInfo.resetTime - Date.now()) / 1000);
          res.set('Retry-After', retryAfterSeconds.toString());

          throw new RateLimitError(message, retryAfterSeconds);
        }

        // Handle skip options
        const originalEnd = res.end;
        res.end = function(chunk?: any, encoding?: any): Response {
          const statusCode = res.statusCode;
          const shouldDecrement = 
            (skipSuccessfulRequests && statusCode >= 200 && statusCode < 300) ||
            (skipFailedRequests && statusCode >= 400);

          if (shouldDecrement) {
            store.decrement(key).catch(error => {
              logger.error('Failed to decrement rate limit counter', error);
            });
          }

          return originalEnd.call(this, chunk, encoding);
        };

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  // Preset configurations
  public static presets: RateLimitPresets = {
    strict: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 10,
    },
    moderate: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
    },
    lenient: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 1000,
    },
    api: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 60,
      keyGenerator: (req: Request) => {
        const apiKey = req.headers['x-api-key'] || req.headers['authorization'];
        return apiKey ? `api:${apiKey}` : `ip:${req.ip}`;
      },
    },
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5,
      skipSuccessfulRequests: true,
      message: 'Too many authentication attempts, please try again later.',
    },
    upload: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 10,
      message: 'Upload limit reached, please try again later.',
    },
    search: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 30,
      message: 'Search rate limit exceeded, please slow down.',
    },
  };

  // Helper methods to create common rate limiters
  public static strict(options: Partial<RateLimitOptions> = {}): RateLimitMiddleware {
    return this.create({ ...this.presets.strict, ...options });
  }

  public static moderate(options: Partial<RateLimitOptions> = {}): RateLimitMiddleware {
    return this.create({ ...this.presets.moderate, ...options });
  }

  public static lenient(options: Partial<RateLimitOptions> = {}): RateLimitMiddleware {
    return this.create({ ...this.presets.lenient, ...options });
  }

  public static api(options: Partial<RateLimitOptions> = {}): RateLimitMiddleware {
    return this.create({ ...this.presets.api, ...options });
  }

  public static auth(options: Partial<RateLimitOptions> = {}): RateLimitMiddleware {
    return this.create({ ...this.presets.auth, ...options });
  }

  public static upload(options: Partial<RateLimitOptions> = {}): RateLimitMiddleware {
    return this.create({ ...this.presets.upload, ...options });
  }

  public static search(options: Partial<RateLimitOptions> = {}): RateLimitMiddleware {
    return this.create({ ...this.presets.search, ...options });
  }

  // Per-user rate limiting
  public static perUser(options: RateLimitOptions): RateLimitMiddleware {
    return this.create({
      ...options,
      keyGenerator: (req: Request) => {
        const user = (req as any).user;
        return user?.id ? `user:${user.id}` : `ip:${req.ip}`;
      },
    });
  }

  // Per-endpoint rate limiting
  public static perEndpoint(options: RateLimitOptions): RateLimitMiddleware {
    return this.create({
      ...options,
      keyGenerator: (req: Request) => {
        const user = (req as any).user;
        const endpoint = `${req.method}:${req.route?.path || req.path}`;
        return user?.id ? `user:${user.id}:${endpoint}` : `ip:${req.ip}:${endpoint}`;
      },
    });
  }

  // Dynamic rate limiting based on user tier
  public static dynamic(baseOptions: RateLimitOptions): RateLimitMiddleware {
    return this.create({
      ...baseOptions,
      maxRequests: baseOptions.maxRequests, // Will be overridden per request
      keyGenerator: (req: Request) => {
        const user = (req as any).user;
        return user?.id ? `user:${user.id}` : `ip:${req.ip}`;
      },
      skip: (req: Request) => {
        const user = (req as any).user;
        // Skip rate limiting for premium users or admins
        return user?.subscriptionTier === 'premium' || user?.role === 'admin';
      },
    });
  }

  // Get rate limit metrics (for monitoring)
  public static async getMetrics(store: RateLimitStore = this.defaultStore): Promise<any> {
    // This would require additional tracking in the store
    // Implementation depends on store type (memory, redis, etc.)
    return {
      message: 'Metrics not available for this store type',
    };
  }

  // Reset all rate limits (for testing or maintenance)
  public static async resetAll(store: RateLimitStore = this.defaultStore): Promise<void> {
    await store.resetAll();
    logger.info('All rate limits reset');
  }
}

// Export convenience function
export const rateLimitMiddleware = (options: CreateRateLimitOptions): RateLimitMiddleware => {
  return RateLimiter.create(options);
};

// Export presets for easy access
export const {
  strict: strictRateLimit,
  moderate: moderateRateLimit,
  lenient: lenientRateLimit,
  api: apiRateLimit,
  auth: authRateLimit,
  upload: uploadRateLimit,
  search: searchRateLimit,
} = RateLimiter;

export default RateLimiter;