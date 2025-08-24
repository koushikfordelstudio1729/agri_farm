import { Request, Response, NextFunction } from 'express';
import { RateLimitError } from '@/utils/errors';
import { logger } from '@/utils/logger';
import { redisClient } from '@/config/redis';
import type {
  RateLimitOptions,
  RateLimitStore,
  RateLimitInfo,
  RateLimitMiddleware,
  CreateRateLimitOptions,
  RateLimitPresets,
  RateLimitConfig,
  RateLimitMetrics,
  RateLimitPattern,
} from '@/types/rateLimit.types';

// Memory store implementation
class MemoryStore implements RateLimitStore {
  private hits = new Map<string, RateLimitInfo>();
  private timers = new Map<string, NodeJS.Timeout>();

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
      existing.lastRequest = now;
      this.hits.set(key, existing);
      return existing;
    }

    const newInfo: RateLimitInfo = {
      count: 1,
      resetTime: now + windowMs,
      firstRequest: now,
      lastRequest: now,
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

  async delete(key: string): Promise<void> {
    this.hits.delete(key);
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }

  async resetAll(): Promise<void> {
    this.hits.clear();
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }

  async getKeys(pattern?: string): Promise<string[]> {
    const keys = Array.from(this.hits.keys());
    if (!pattern) return keys;
    
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return keys.filter(key => regex.test(key));
  }

  private scheduleReset(key: string, windowMs: number): void {
    // Clear existing timer
    const existingTimer = this.timers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.hits.delete(key);
      this.timers.delete(key);
    }, windowMs);

    this.timers.set(key, timer);
  }
}

// Redis store implementation
class RedisStore implements RateLimitStore {
  private prefix: string;

  constructor(prefix = 'rate_limit:') {
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get(key: string): Promise<RateLimitInfo | undefined> {
    if (!redisClient) return undefined;

    const redisKey = this.getKey(key);
    const data = await redisClient.hmget(redisKey, 'count', 'resetTime', 'firstRequest', 'lastRequest');
    
    if (!data[0]) return undefined;

    return {
      count: parseInt(data[0], 10),
      resetTime: parseInt(data[1] || '0', 10),
      firstRequest: parseInt(data[2] || '0', 10),
      lastRequest: parseInt(data[3] || '0', 10),
    };
  }

  async set(key: string, value: RateLimitInfo, windowMs: number): Promise<void> {
    if (!redisClient) return;

    const redisKey = this.getKey(key);
    const ttl = Math.ceil(windowMs / 1000);

    await redisClient
      .multi()
      .hmset(redisKey, {
        count: value.count.toString(),
        resetTime: value.resetTime.toString(),
        firstRequest: value.firstRequest.toString(),
        lastRequest: value.lastRequest.toString(),
      })
      .expire(redisKey, ttl)
      .exec();
  }

  async increment(key: string, windowMs: number): Promise<RateLimitInfo> {
    if (!redisClient) {
      // Fallback to memory store behavior
      const memoryStore = new MemoryStore();
      return memoryStore.increment(key, windowMs);
    }

    const now = Date.now();
    const redisKey = this.getKey(key);
    const ttl = Math.ceil(windowMs / 1000);

    // Use Redis pipeline for atomic operations
    const multi = redisClient.multi();
    multi.hsetnx(redisKey, 'firstRequest', now.toString());
    multi.hset(redisKey, 'lastRequest', now.toString());
    multi.hincrby(redisKey, 'count', 1);
    multi.hget(redisKey, 'firstRequest');
    multi.expire(redisKey, ttl);
    
    const results = await multi.exec();
    const count = results?.[2]?.[1] as number || 1;
    const firstRequest = parseInt(results?.[3]?.[1] as string || now.toString(), 10);

    return {
      count,
      resetTime: firstRequest + windowMs,
      firstRequest,
      lastRequest: now,
    };
  }

  async decrement(key: string): Promise<void> {
    if (!redisClient) return;

    const redisKey = this.getKey(key);
    const currentCount = await redisClient.hget(redisKey, 'count');
    
    if (currentCount && parseInt(currentCount, 10) > 0) {
      await redisClient.hincrby(redisKey, 'count', -1);
    }
  }

  async delete(key: string): Promise<void> {
    if (!redisClient) return;
    await redisClient.del(this.getKey(key));
  }

  async resetAll(): Promise<void> {
    if (!redisClient) return;
    
    const keys = await redisClient.keys(`${this.prefix}*`);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  }

  async getKeys(pattern?: string): Promise<string[]> {
    if (!redisClient) return [];
    
    const searchPattern = pattern ? `${this.prefix}${pattern}` : `${this.prefix}*`;
    const keys = await redisClient.keys(searchPattern);
    
    return keys.map(key => key.replace(this.prefix, ''));
  }
}

export class RateLimiter {
  private static memoryStore = new MemoryStore();
  private static redisStore = redisClient ? new RedisStore() : null;

  // Get the appropriate store based on availability
  private static getDefaultStore(): RateLimitStore {
    return this.redisStore || this.memoryStore;
  }

  /**
   * Create rate limit middleware
   */
  public static create(options: CreateRateLimitOptions): RateLimitMiddleware {
    const {
      windowMs,
      maxRequests,
      message = { error: 'Too many requests from this IP, please try again later.' },
      standardHeaders = true,
      legacyHeaders = false,
      skipSuccessfulRequests = false,
      skipFailedRequests = false,
      keyGenerator = (req: Request) => req.ip || 'unknown',
      skip = () => false,
      handler,
      onLimitReached,
      store = this.getDefaultStore(),
      skipIf,
      dynamicMaxRequests,
    } = options;

    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        // Check if request should be skipped
        if (skip(req, res) || (skipIf && skipIf(req, res))) {
          return next();
        }

        const key = keyGenerator(req);
        const rateLimitInfo = await store.increment(key, windowMs);
        
        // Get dynamic max requests if function provided
        const currentMaxRequests = dynamicMaxRequests 
          ? dynamicMaxRequests(req, res) 
          : maxRequests;

        const isLimitExceeded = rateLimitInfo.count > currentMaxRequests;

        // Set rate limit headers
        if (standardHeaders) {
          res.set({
            'RateLimit-Limit': currentMaxRequests.toString(),
            'RateLimit-Remaining': Math.max(0, currentMaxRequests - rateLimitInfo.count).toString(),
            'RateLimit-Reset': new Date(rateLimitInfo.resetTime).toISOString(),
            'RateLimit-Policy': `${currentMaxRequests};w=${Math.floor(windowMs / 1000)}`,
          });
        }

        if (legacyHeaders) {
          res.set({
            'X-RateLimit-Limit': currentMaxRequests.toString(),
            'X-RateLimit-Remaining': Math.max(0, currentMaxRequests - rateLimitInfo.count).toString(),
            'X-RateLimit-Reset': Math.ceil(rateLimitInfo.resetTime / 1000).toString(),
          });
        }

        if (isLimitExceeded) {
          // Log rate limit exceeded
          logger.warn('Rate limit exceeded', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            endpoint: req.originalUrl,
            method: req.method,
            key,
            count: rateLimitInfo.count,
            limit: currentMaxRequests,
            windowMs,
            userId: (req as any).user?.id,
          });

          // Call onLimitReached callback
          if (onLimitReached) {
            onLimitReached(req, res, rateLimitInfo);
          }

          // Use custom handler or default error
          if (handler) {
            return handler(req, res, next, rateLimitInfo);
          }

          // Set Retry-After header
          const retryAfterSeconds = Math.ceil((rateLimitInfo.resetTime - Date.now()) / 1000);
          res.set('Retry-After', Math.max(retryAfterSeconds, 0).toString());

          const errorMessage = typeof message === 'string' ? message : message.error;
          const rateLimitError = new RateLimitError(errorMessage, retryAfterSeconds);
          
          if (typeof message === 'object' && 'retryAfter' in message) {
            (rateLimitError as any).retryAfter = message.retryAfter;
          }

          return next(rateLimitError);
        }

        // Handle skip options for successful/failed requests
        if (skipSuccessfulRequests || skipFailedRequests) {
          const originalEnd = res.end;
          res.end = function(chunk?: any, encoding?: BufferEncoding): Response {
            const statusCode = res.statusCode;
            const shouldDecrement = 
              (skipSuccessfulRequests && statusCode >= 200 && statusCode < 300) ||
              (skipFailedRequests && statusCode >= 400);

            if (shouldDecrement) {
              store.decrement(key).catch(error => {
                logger.error('Failed to decrement rate limit counter', { error, key });
              });
            }

            return originalEnd.call(this, chunk, encoding);
          };
        }

        next();
      } catch (error) {
        logger.error('Rate limit middleware error', { error });
        next(error);
      }
    };
  }

  // Preset configurations
  public static presets: RateLimitPresets = {
    strict: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 10,
      message: {
        error: 'Too many requests. Please wait before trying again.',
        retryAfter: 15 * 60,
      },
    },
    moderate: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
      message: {
        error: 'Rate limit exceeded. Please slow down your requests.',
        retryAfter: 15 * 60,
      },
    },
    lenient: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 1000,
      message: {
        error: 'Too many requests from this IP.',
        retryAfter: 15 * 60,
      },
    },
    api: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 60,
      keyGenerator: (req: Request) => {
        const apiKey = req.headers['x-api-key'] || req.headers['authorization'];
        return apiKey ? `api:${apiKey}` : `ip:${req.ip}`;
      },
      message: {
        error: 'API rate limit exceeded.',
        retryAfter: 60,
      },
    },
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5,
      skipSuccessfulRequests: true,
      message: {
        error: 'Too many authentication attempts. Please try again later.',
        retryAfter: 15 * 60,
      },
    },
    upload: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 10,
      message: {
        error: 'Upload limit reached. Please try again later.',
        retryAfter: 60 * 60,
      },
    },
    search: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 30,
      message: {
        error: 'Search rate limit exceeded. Please slow down.',
        retryAfter: 60,
      },
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

  // Advanced rate limiters
  
  /**
   * Per-user rate limiting
   */
  public static perUser(options: RateLimitOptions): RateLimitMiddleware {
    return this.create({
      ...options,
      keyGenerator: (req: Request) => {
        const user = (req as any).user;
        return user?.id ? `user:${user.id}` : `ip:${req.ip}`;
      },
    });
  }

  /**
   * Per-endpoint rate limiting
   */
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

  /**
   * Dynamic rate limiting based on user tier
   */
  public static tieredLimiting(config: RateLimitConfig): RateLimitMiddleware {
    return this.create({
      windowMs: config.windowMs,
      maxRequests: config.defaultLimit,
      keyGenerator: (req: Request) => {
        const user = (req as any).user;
        return user?.id ? `user:${user.id}` : `ip:${req.ip}`;
      },
      dynamicMaxRequests: (req: Request) => {
        const user = (req as any).user;
        if (!user) return config.defaultLimit;

        // Check user tier and return appropriate limit
        switch (user.subscriptionTier) {
          case 'premium':
            return config.premiumLimit || config.defaultLimit * 5;
          case 'pro':
            return config.proLimit || config.defaultLimit * 3;
          case 'basic':
            return config.basicLimit || config.defaultLimit * 2;
          default:
            return config.defaultLimit;
        }
      },
      skip: (req: Request) => {
        const user = (req as any).user;
        // Skip rate limiting for admins
        return user?.role === 'admin' || user?.role === 'super_admin';
      },
      message: config.message || {
        error: 'Rate limit exceeded. Consider upgrading your plan for higher limits.',
        retryAfter: Math.floor(config.windowMs / 1000),
      },
    });
  }

  /**
   * Pattern-based rate limiting
   */
  public static patternLimiting(patterns: RateLimitPattern[]): RateLimitMiddleware {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Find matching pattern
      const matchingPattern = patterns.find(pattern => {
        if (pattern.method && pattern.method !== req.method) return false;
        if (pattern.path && !new RegExp(pattern.path).test(req.path)) return false;
        if (pattern.userRole) {
          const user = (req as any).user;
          if (!user || user.role !== pattern.userRole) return false;
        }
        return true;
      });

      if (!matchingPattern) {
        return next();
      }

      // Apply the matching pattern's rate limit
      const rateLimiter = this.create(matchingPattern.config);
      return rateLimiter(req, res, next);
    };
  }

  /**
   * Get rate limit status for a key
   */
  public static async getStatus(
    key: string, 
    store: RateLimitStore = this.getDefaultStore()
  ): Promise<RateLimitInfo | null> {
    return (await store.get(key)) || null;
  }

  /**
   * Get rate limit metrics
   */
  public static async getMetrics(
    store: RateLimitStore = this.getDefaultStore(),
    pattern?: string
  ): Promise<RateLimitMetrics> {
    try {
      const keys = await store.getKeys(pattern);
      const metrics: RateLimitMetrics = {
        totalKeys: keys.length,
        activeKeys: 0,
        averageUsage: 0,
        topAbusers: [],
        byPattern: {},
      };

      let totalUsage = 0;
      const keyStats: Array<{ key: string; count: number; usage: number }> = [];

      for (const key of keys.slice(0, 1000)) { // Limit for performance
        const info = await store.get(key);
        if (info && Date.now() < info.resetTime) {
          metrics.activeKeys++;
          totalUsage += info.count;
          
          keyStats.push({
            key,
            count: info.count,
            usage: info.count, // Could be normalized by limit
          });
        }
      }

      metrics.averageUsage = metrics.activeKeys > 0 ? totalUsage / metrics.activeKeys : 0;
      metrics.topAbusers = keyStats
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map(stat => ({
          key: stat.key,
          count: stat.count,
          timestamp: Date.now(),
        }));

      return metrics;
    } catch (error) {
      logger.error('Failed to get rate limit metrics', { error });
      return {
        totalKeys: 0,
        activeKeys: 0,
        averageUsage: 0,
        topAbusers: [],
        byPattern: {},
      };
    }
  }

  /**
   * Reset rate limit for specific key
   */
  public static async reset(
    key: string, 
    store: RateLimitStore = this.getDefaultStore()
  ): Promise<void> {
    await store.delete(key);
    logger.info('Rate limit reset for key', { key });
  }

  /**
   * Reset all rate limits
   */
  public static async resetAll(store: RateLimitStore = this.getDefaultStore()): Promise<void> {
    await store.resetAll();
    logger.info('All rate limits reset');
  }

  /**
   * Warmup rate limiter (for testing)
   */
  public static async warmup(
    keys: string[], 
    count: number = 1, 
    windowMs: number = 60000,
    store: RateLimitStore = this.getDefaultStore()
  ): Promise<void> {
    for (const key of keys) {
      for (let i = 0; i < count; i++) {
        await store.increment(key, windowMs);
      }
    }
    logger.info('Rate limiter warmed up', { keys: keys.length, count });
  }
}

// Export convenience functions
export const rateLimit = (options: CreateRateLimitOptions): RateLimitMiddleware => {
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
  perUser: perUserRateLimit,
  perEndpoint: perEndpointRateLimit,
  tieredLimiting: tieredRateLimit,
  patternLimiting: patternRateLimit,
} = RateLimiter;

// Export stores
export { MemoryStore, RedisStore };

export default RateLimiter;