import logger from './logger';
import { generateSecureToken } from './helpers';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
  compression?: boolean;
  tags?: string[];
}

export interface CacheEntry<T = any> {
  data: T;
  expires: number;
  created: number;
  tags: string[];
  compressed: boolean;
  size: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  flushes: number;
  hitRate: number;
  memory: {
    used: number;
    keys: number;
  };
}

class MemoryCache {
  private cache = new Map<string, CacheEntry>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    flushes: 0,
    hitRate: 0,
    memory: { used: 0, keys: 0 },
  };
  private maxSize: number;
  private defaultTTL: number;
  private cleanupInterval: NodeJS.Timeout;

  constructor(maxSize: number = 1000, defaultTTL: number = 3600) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      logger.debug(`Cache miss for key: ${key}`);
      return null;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      logger.debug(`Cache expired for key: ${key}`);
      return null;
    }

    this.stats.hits++;
    this.updateHitRate();
    logger.debug(`Cache hit for key: ${key}`);
    
    return entry.compressed ? this.decompress(entry.data) : entry.data;
  }

  async set<T>(
    key: string, 
    value: T, 
    options: CacheOptions = {}
  ): Promise<boolean> {
    try {
      const ttl = options.ttl || this.defaultTTL;
      const prefix = options.prefix || '';
      const fullKey = prefix ? `${prefix}:${key}` : key;
      const tags = options.tags || [];
      
      let data = value;
      let compressed = false;
      
      // Simple compression for strings
      if (options.compression && typeof value === 'string' && value.length > 100) {
        data = this.compress(value);
        compressed = true;
      }
      
      const size = this.calculateSize(data);
      
      const entry: CacheEntry<T> = {
        data,
        expires: Date.now() + (ttl * 1000),
        created: Date.now(),
        tags,
        compressed,
        size,
      };

      // Check if we need to make space
      if (this.cache.size >= this.maxSize) {
        this.evictLRU();
      }

      this.cache.set(fullKey, entry);
      this.stats.sets++;
      this.updateMemoryStats();
      
      logger.debug(`Cache set for key: ${fullKey}, TTL: ${ttl}s`);
      return true;
    } catch (error) {
      logger.error(`Cache set failed for key: ${key}`, error as Error);
      return false;
    }
  }

  async del(key: string, prefix?: string): Promise<boolean> {
    const fullKey = prefix ? `${prefix}:${key}` : key;
    const deleted = this.cache.delete(fullKey);
    
    if (deleted) {
      this.stats.deletes++;
      this.updateMemoryStats();
      logger.debug(`Cache deleted for key: ${fullKey}`);
    }
    
    return deleted;
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.stats.flushes++;
    this.resetMemoryStats();
    logger.info('Cache cleared');
  }

  async exists(key: string, prefix?: string): Promise<boolean> {
    const fullKey = prefix ? `${prefix}:${key}` : key;
    const entry = this.cache.get(fullKey);
    
    if (!entry) return false;
    if (this.isExpired(entry)) {
      this.cache.delete(fullKey);
      return false;
    }
    
    return true;
  }

  async ttl(key: string, prefix?: string): Promise<number> {
    const fullKey = prefix ? `${prefix}:${key}` : key;
    const entry = this.cache.get(fullKey);
    
    if (!entry) return -2; // Key doesn't exist
    if (this.isExpired(entry)) return -2;
    
    return Math.floor((entry.expires - Date.now()) / 1000);
  }

  async touch(key: string, ttl: number, prefix?: string): Promise<boolean> {
    const fullKey = prefix ? `${prefix}:${key}` : key;
    const entry = this.cache.get(fullKey);
    
    if (!entry || this.isExpired(entry)) return false;
    
    entry.expires = Date.now() + (ttl * 1000);
    logger.debug(`Cache TTL updated for key: ${fullKey}, new TTL: ${ttl}s`);
    
    return true;
  }

  async keys(pattern?: string, prefix?: string): Promise<string[]> {
    const searchPrefix = prefix ? `${prefix}:` : '';
    const keys: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        continue;
      }
      
      if (key.startsWith(searchPrefix)) {
        const cleanKey = prefix ? key.replace(`${prefix}:`, '') : key;
        
        if (!pattern || this.matchPattern(cleanKey, pattern)) {
          keys.push(cleanKey);
        }
      }
    }
    
    return keys;
  }

  async flushByTag(tag: string): Promise<number> {
    let count = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.includes(tag)) {
        this.cache.delete(key);
        count++;
      }
    }
    
    this.updateMemoryStats();
    logger.info(`Flushed ${count} cache entries with tag: ${tag}`);
    
    return count;
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  // Utility methods for higher-level caching patterns
  async remember<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, options);
    
    return value;
  }

  async rememberForever<T>(
    key: string,
    factory: () => Promise<T>,
    prefix?: string
  ): Promise<T> {
    return this.remember(key, factory, { ttl: 86400 * 365, prefix }); // 1 year
  }

  async increment(key: string, by: number = 1, prefix?: string): Promise<number> {
    const current = await this.get<number>(key) || 0;
    const newValue = current + by;
    await this.set(key, newValue, { prefix });
    return newValue;
  }

  async decrement(key: string, by: number = 1, prefix?: string): Promise<number> {
    const current = await this.get<number>(key) || 0;
    const newValue = Math.max(0, current - by);
    await this.set(key, newValue, { prefix });
    return newValue;
  }

  // Private methods
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.expires;
  }

  private cleanup(): void {
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this.updateMemoryStats();
      logger.debug(`Cache cleanup: removed ${cleaned} expired entries`);
    }
  }

  private evictLRU(): void {
    let oldestKey = '';
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.created < oldestTime) {
        oldestTime = entry.created;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      logger.debug(`Cache LRU eviction: removed key ${oldestKey}`);
    }
  }

  private calculateSize(data: any): number {
    try {
      return JSON.stringify(data).length;
    } catch {
      return 0;
    }
  }

  private compress(data: string): string {
    // Simple compression (in real app, use proper compression library)
    return Buffer.from(data).toString('base64');
  }

  private decompress(data: string): string {
    try {
      return Buffer.from(data, 'base64').toString();
    } catch {
      return data;
    }
  }

  private matchPattern(str: string, pattern: string): boolean {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(str);
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  private updateMemoryStats(): void {
    this.stats.memory.keys = this.cache.size;
    
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += entry.size;
    }
    this.stats.memory.used = totalSize;
  }

  private resetMemoryStats(): void {
    this.stats.memory = { used: 0, keys: 0 };
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

// Cache factory for different cache stores
export class CacheManager {
  private stores = new Map<string, MemoryCache>();
  private defaultStore = 'memory';

  constructor() {
    // Create default memory cache
    this.stores.set(this.defaultStore, new MemoryCache());
  }

  store(name: string = this.defaultStore): MemoryCache {
    let cacheStore = this.stores.get(name);
    
    if (!cacheStore) {
      cacheStore = new MemoryCache();
      this.stores.set(name, cacheStore);
    }
    
    return cacheStore;
  }

  createStore(name: string, maxSize?: number, defaultTTL?: number): MemoryCache {
    const newStore = new MemoryCache(maxSize, defaultTTL);
    this.stores.set(name, newStore);
    return newStore;
  }

  async flush(): Promise<void> {
    const promises = Array.from(this.stores.values()).map(store => store.clear());
    await Promise.all(promises);
    logger.info('All cache stores flushed');
  }

  getStats(): Record<string, CacheStats> {
    const stats: Record<string, CacheStats> = {};
    
    for (const [name, store] of this.stores.entries()) {
      stats[name] = store.getStats();
    }
    
    return stats;
  }

  destroy(): void {
    for (const store of this.stores.values()) {
      store.destroy();
    }
    this.stores.clear();
  }
}

// Create singleton cache manager
const cacheManager = new CacheManager();

// Export both class and singleton
export { MemoryCache };
export default cacheManager;

// Utility functions and decorators
export const cacheUtils = {
  // Create a cache key from multiple parts
  createKey: (...parts: (string | number)[]): string => {
    return parts.filter(p => p !== undefined && p !== null).join(':');
  },

  // Generate cache key from function arguments
  createKeyFromArgs: (args: any[]): string => {
    return generateSecureToken(8) + ':' + JSON.stringify(args);
  },

  // Cache decorator for methods
  cached: (ttl: number = 3600, prefix?: string, keyGenerator?: (...args: any[]) => string) => {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
      const method = descriptor.value;
      
      descriptor.value = async function (...args: any[]) {
        const cache = cacheManager.store();
        const key = keyGenerator 
          ? keyGenerator.apply(this, args)
          : `${target.constructor.name}.${propertyName}:${cacheUtils.createKeyFromArgs(args)}`;
        
        return cache.remember(key, () => method.apply(this, args), { ttl, prefix });
      };
    };
  },

  // Cache invalidation decorator
  invalidatesCache: (patterns: string[] | (() => string[])) => {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
      const method = descriptor.value;
      
      descriptor.value = async function (...args: any[]) {
        const result = await method.apply(this, args);
        
        const cache = cacheManager.store();
        const invalidatePatterns = typeof patterns === 'function' 
          ? patterns.apply(this, args)
          : patterns;
        
        for (const pattern of invalidatePatterns) {
          const keys = await cache.keys(pattern);
          for (const key of keys) {
            await cache.del(key);
          }
        }
        
        return result;
      };
    };
  },

  // Memoization for functions
  memoize: <T extends (...args: any[]) => any>(
    fn: T,
    ttl: number = 3600,
    keyGenerator?: (...args: Parameters<T>) => string
  ): T => {
    const cache = cacheManager.store();
    
    return ((...args: Parameters<T>): ReturnType<T> => {
      const key = keyGenerator 
        ? keyGenerator(...args)
        : `memoize:${fn.name}:${cacheUtils.createKeyFromArgs(args)}`;
      
      return cache.remember(key, () => fn(...args), { ttl });
    }) as T;
  },

  // Rate limiting using cache
  rateLimit: async (
    key: string,
    limit: number,
    windowMs: number = 60000
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> => {
    const cache = cacheManager.store();
    const count = await cache.get<number>(key) || 0;
    
    if (count >= limit) {
      const ttl = await cache.ttl(key);
      return {
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + (ttl * 1000),
      };
    }
    
    await cache.set(key, count + 1, { ttl: Math.floor(windowMs / 1000) });
    
    return {
      allowed: true,
      remaining: limit - count - 1,
      resetTime: Date.now() + windowMs,
    };
  },
};