import Redis, { RedisOptions } from 'ioredis';
import logger from '@/utils/logger';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
  retryDelayOnFailover: number;
  maxRetriesPerRequest: number;
  lazyConnect: boolean;
  connectTimeout: number;
  commandTimeout: number;
}

const redisConfig: RedisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  keyPrefix: process.env.REDIS_KEY_PREFIX || 'agri_farm:',
  retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY || '100', 10),
  maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
  lazyConnect: process.env.REDIS_LAZY_CONNECT === 'true',
  connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000', 10),
  commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT || '5000', 10),
};

const redisOptions: RedisOptions = {
  host: redisConfig.host,
  port: redisConfig.port,
  password: redisConfig.password,
  db: redisConfig.db,
  keyPrefix: redisConfig.keyPrefix,
  retryDelayOnFailover: redisConfig.retryDelayOnFailover,
  maxRetriesPerRequest: process.env.NODE_ENV === 'development' ? 0 : redisConfig.maxRetriesPerRequest,
  lazyConnect: redisConfig.lazyConnect,
  connectTimeout: redisConfig.connectTimeout,
  commandTimeout: redisConfig.commandTimeout,
  enableReadyCheck: true,
  maxLoadingTimeout: 5000,
  enableOfflineQueue: false,
  // Don't retry connections in development
  retryDelayOnClusterDown: process.env.NODE_ENV === 'development' ? 0 : 100,
  autoResubscribe: process.env.NODE_ENV !== 'development',
};

// Create Redis instances (with error handling for development)  
const createRedisInstance = (options: RedisOptions) => {
  if (process.env.NODE_ENV === 'development' && process.env.REDIS_DISABLED === 'true') {
    logger.warn('Redis disabled in development mode');
    // Return a mock Redis instance that doesn't actually connect
    return {
      get: async () => null,
      set: async () => 'OK',
      del: async () => 1,
      exists: async () => 0,
      expire: async () => 1,
      on: () => {},
      quit: async () => {},
      disconnect: () => {},
    } as any;
  }
  
  const instance = new Redis({
    ...options,
    // In development, fail fast instead of retrying
    connectTimeout: process.env.NODE_ENV === 'development' ? 2000 : options.connectTimeout,
    maxRetriesPerRequest: process.env.NODE_ENV === 'development' ? 1 : options.maxRetriesPerRequest,
    retryDelayOnFailover: process.env.NODE_ENV === 'development' ? 100 : options.retryDelayOnFailover,
  });
  
  // For development, don't crash if Redis is unavailable
  if (process.env.NODE_ENV === 'development') {
    instance.on('error', (error: Error) => {
      if (error.message.includes('ECONNREFUSED')) {
        logger.warn('Redis not available in development mode - some features may be limited', {
          error: error.message
        });
        // Quit the instance to stop retrying
        setTimeout(() => instance.disconnect(false), 1000);
        return;
      }
      logger.error('Redis connection error', {
        error: error.message,
        stack: error.stack,
      });
    });
  }
  
  return instance;
};

export const redis = createRedisInstance(redisOptions);
export const redisPublisher = createRedisInstance(redisOptions);
export const redisSubscriber = createRedisInstance(redisOptions);

// Cache TTL constants (in seconds)
export const CACHE_TTL = {
  SHORT: 300,      // 5 minutes
  MEDIUM: 3600,    // 1 hour  
  LONG: 86400,     // 24 hours
  VERY_LONG: 604800, // 7 days
} as const;

// Cache key patterns
export const CACHE_KEYS = {
  USER_SESSION: (userId: string) => `session:${userId}`,
  USER_PROFILE: (userId: string) => `profile:${userId}`,
  DISEASE_DATA: (diseaseId: string) => `disease:${diseaseId}`,
  CROP_DATA: (cropId: string) => `crop:${cropId}`,
  WEATHER_DATA: (location: string) => `weather:${location}`,
  MARKET_PRICES: (cropId: string, location: string) => `market:${cropId}:${location}`,
  DIAGNOSIS_RESULT: (imageHash: string) => `diagnosis:${imageHash}`,
  TRANSLATION: (key: string, language: string) => `i18n:${language}:${key}`,
  NOTIFICATION_QUEUE: (userId: string) => `notifications:${userId}`,
  RATE_LIMIT: (identifier: string) => `ratelimit:${identifier}`,
  OTP: (phone: string) => `otp:${phone}`,
  EMAIL_VERIFICATION: (email: string) => `email_verify:${email}`,
  PASSWORD_RESET: (token: string) => `pwd_reset:${token}`,
  LOGIN_ATTEMPTS: (identifier: string) => `login_attempts:${identifier}`,
  BLOCKED_IP: (ip: string) => `blocked_ip:${ip}`,
} as const;

// Additional Redis event listeners for production monitoring
if (process.env.NODE_ENV !== 'development') {
  redis.on('connect', () => {
    logger.info('Redis client connected');
  });

  redis.on('ready', () => {
    logger.info('Redis client ready to receive commands');
  });

  redis.on('close', () => {
    logger.warn('Redis connection closed');
  });

  redis.on('end', () => {
    logger.warn('Redis connection ended');
  });
}

redis.on('reconnecting', (ms: number) => {
  logger.info(`Redis client reconnecting in ${ms}ms`);
});

// Utility functions for common cache operations
export class CacheService {
  static async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Cache get error', { key, error });
      return null;
    }
  }

  static async set<T>(key: string, value: T, ttl: number = CACHE_TTL.MEDIUM): Promise<boolean> {
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Cache set error', { key, ttl, error });
      return false;
    }
  }

  static async del(key: string): Promise<boolean> {
    try {
      const result = await redis.del(key);
      return result > 0;
    } catch (error) {
      logger.error('Cache delete error', { key, error });
      return false;
    }
  }

  static async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error', { key, error });
      return false;
    }
  }

  static async expire(key: string, ttl: number): Promise<boolean> {
    try {
      const result = await redis.expire(key, ttl);
      return result === 1;
    } catch (error) {
      logger.error('Cache expire error', { key, ttl, error });
      return false;
    }
  }

  static async increment(key: string, increment: number = 1): Promise<number> {
    try {
      return await redis.incrby(key, increment);
    } catch (error) {
      logger.error('Cache increment error', { key, increment, error });
      return 0;
    }
  }

  static async getHash<T>(key: string, field: string): Promise<T | null> {
    try {
      const data = await redis.hget(key, field);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Cache hash get error', { key, field, error });
      return null;
    }
  }

  static async setHash<T>(key: string, field: string, value: T): Promise<boolean> {
    try {
      await redis.hset(key, field, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Cache hash set error', { key, field, error });
      return false;
    }
  }

  static async deletePattern(pattern: string): Promise<number> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length === 0) return 0;
      return await redis.del(...keys);
    } catch (error) {
      logger.error('Cache delete pattern error', { pattern, error });
      return 0;
    }
  }

  static async getList<T>(key: string): Promise<T[]> {
    try {
      const items = await redis.lrange(key, 0, -1);
      return items.map(item => JSON.parse(item));
    } catch (error) {
      logger.error('Cache list get error', { key, error });
      return [];
    }
  }

  static async addToList<T>(key: string, value: T, maxLength?: number): Promise<boolean> {
    try {
      await redis.lpush(key, JSON.stringify(value));
      if (maxLength) {
        await redis.ltrim(key, 0, maxLength - 1);
      }
      return true;
    } catch (error) {
      logger.error('Cache list add error', { key, error });
      return false;
    }
  }

  static async getSet<T>(key: string): Promise<T[]> {
    try {
      const items = await redis.smembers(key);
      return items.map(item => JSON.parse(item));
    } catch (error) {
      logger.error('Cache set get error', { key, error });
      return [];
    }
  }

  static async addToSet<T>(key: string, value: T): Promise<boolean> {
    try {
      await redis.sadd(key, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Cache set add error', { key, error });
      return false;
    }
  }
}

// Rate limiting helper
export class RateLimiter {
  static async checkLimit(
    identifier: string,
    limit: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
    const key = CACHE_KEYS.RATE_LIMIT(identifier);
    const now = Date.now();
    const windowMs = windowSeconds * 1000;

    try {
      const pipe = redis.pipeline();
      pipe.zremrangebyscore(key, 0, now - windowMs);
      pipe.zadd(key, now, now);
      pipe.zcount(key, now - windowMs, now);
      pipe.expire(key, windowSeconds);

      const results = await pipe.exec();
      const count = results?.[2]?.[1] as number || 0;

      return {
        allowed: count <= limit,
        remaining: Math.max(0, limit - count),
        resetTime: new Date(now + windowMs),
      };
    } catch (error) {
      logger.error('Rate limit check error', { identifier, error });
      return {
        allowed: true,
        remaining: limit,
        resetTime: new Date(now + windowMs),
      };
    }
  }
}

// Session management helper
export class SessionManager {
  static async createSession(userId: string, sessionData: Record<string, unknown>): Promise<string> {
    const sessionId = `sess_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const key = CACHE_KEYS.USER_SESSION(sessionId);
    
    await CacheService.set(key, sessionData, CACHE_TTL.LONG);
    return sessionId;
  }

  static async getSession<T extends Record<string, unknown>>(sessionId: string): Promise<T | null> {
    const key = CACHE_KEYS.USER_SESSION(sessionId);
    return await CacheService.get<T>(key);
  }

  static async updateSession(sessionId: string, updates: Record<string, unknown>): Promise<boolean> {
    const key = CACHE_KEYS.USER_SESSION(sessionId);
    const existingSession = await CacheService.get<Record<string, unknown>>(key);
    
    if (!existingSession) return false;
    
    const updatedSession = { ...existingSession, ...updates };
    return await CacheService.set(key, updatedSession, CACHE_TTL.LONG);
  }

  static async deleteSession(sessionId: string): Promise<boolean> {
    const key = CACHE_KEYS.USER_SESSION(sessionId);
    return await CacheService.del(key);
  }
}

// Health check function
export const checkRedisHealth = async (): Promise<{
  status: 'up' | 'down';
  responseTime: number;
  details: Record<string, unknown>;
}> => {
  const start = Date.now();

  try {
    const pingResult = await redis.ping();
    const responseTime = Date.now() - start;

    const info = await redis.info('server');
    const memory = await redis.info('memory');

    return {
      status: 'up',
      responseTime,
      details: {
        ping: pingResult,
        server: info,
        memory: memory,
        keyPrefix: redisConfig.keyPrefix,
        db: redisConfig.db,
      },
    };
  } catch (error) {
    const responseTime = Date.now() - start;

    return {
      status: 'down',
      responseTime,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        config: {
          host: redisConfig.host,
          port: redisConfig.port,
          db: redisConfig.db,
        },
      },
    };
  }
};

// Graceful shutdown
export const closeRedisConnections = async (): Promise<void> => {
  try {
    await Promise.all([
      redis.quit(),
      redisPublisher.quit(),
      redisSubscriber.quit(),
    ]);
    logger.info('Redis connections closed gracefully');
  } catch (error) {
    logger.error('Error closing Redis connections', { error });
  }
};

export default {
  redis,
  redisPublisher,
  redisSubscriber,
  CacheService,
  RateLimiter,
  SessionManager,
  CACHE_TTL,
  CACHE_KEYS,
  checkRedisHealth,
  closeRedisConnections,
};