import { Request, Response, NextFunction } from 'express';
import cacheManager, { cacheUtils } from '@/utils/cache';
import logger from '@/utils/logger';
import { createErrorContext } from '@/utils/errors';

export interface CacheMiddlewareOptions {
  ttl?: number; // Time to live in seconds
  keyGenerator?: (req: Request) => string;
  condition?: (req: Request, res: Response) => boolean;
  varyBy?: string[]; // Headers to vary cache by
  skipCache?: (req: Request) => boolean;
  skipMethods?: string[];
  includeHeaders?: string[];
  excludeHeaders?: string[];
  maxSize?: number;
  enableCompression?: boolean;
  enableEtag?: boolean;
}

class CacheMiddleware {
  // Basic response caching
  static response(options: CacheMiddlewareOptions = {}) {
    const {
      ttl = 300, // 5 minutes default
      keyGenerator = (req: Request) => `cache:${req.method}:${req.originalUrl}`,
      condition = () => true,
      varyBy = [],
      skipCache = () => false,
      skipMethods = ['POST', 'PUT', 'PATCH', 'DELETE'],
      includeHeaders = ['content-type', 'content-encoding'],
      enableEtag = true,
      enableCompression = true,
    } = options;

    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      // Skip caching for certain methods
      if (skipMethods.includes(req.method)) {
        return next();
      }

      // Skip caching if condition not met
      if (skipCache(req)) {
        return next();
      }

      const cache = cacheManager.store();
      let cacheKey: string;

      try {
        // Generate cache key
        cacheKey = keyGenerator(req);
        
        // Add vary headers to cache key
        if (varyBy.length > 0) {
          const varyValues = varyBy.map(header => req.headers[header.toLowerCase()]).join(':');
          cacheKey += `:vary:${varyValues}`;
        }

        // Check for cached response
        const cachedResponse = await cache.get(cacheKey);
        
        if (cachedResponse) {
          logger.debug('Cache hit', { cacheKey, method: req.method, url: req.originalUrl });
          
          // Set cached headers
          if (cachedResponse.headers) {
            Object.entries(cachedResponse.headers).forEach(([header, value]) => {
              res.set(header, value as string);
            });
          }

          // Set cache headers
          res.set('X-Cache', 'HIT');
          res.set('X-Cache-Key', cacheKey);

          // Set ETag if enabled
          if (enableEtag) {
            const etag = this.generateETag(cachedResponse.body);
            res.set('ETag', etag);
            
            // Check if client has cached version
            if (req.headers['if-none-match'] === etag) {
              return res.status(304).end();
            }
          }

          // Send cached response
          return res.status(cachedResponse.statusCode).send(cachedResponse.body);
        }

        logger.debug('Cache miss', { cacheKey, method: req.method, url: req.originalUrl });

        // Capture response data
        const originalSend = res.send;
        const originalJson = res.json;
        let responseBody: any;
        let responseSent = false;

        // Override res.send
        res.send = function(body: any) {
          responseBody = body;
          responseSent = true;
          return originalSend.call(this, body);
        };

        // Override res.json
        res.json = function(body: any) {
          responseBody = body;
          responseSent = true;
          return originalJson.call(this, body);
        };

        // Cache response after it's sent
        res.on('finish', async () => {
          if (!responseSent || !condition(req, res)) {
            return;
          }

          // Only cache successful responses
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              // Prepare headers to cache
              const headersToCache: Record<string, string> = {};
              includeHeaders.forEach(header => {
                const value = res.get(header);
                if (value) {
                  headersToCache[header] = value;
                }
              });

              // Prepare cache entry
              const cacheEntry = {
                statusCode: res.statusCode,
                headers: headersToCache,
                body: responseBody,
                timestamp: Date.now(),
              };

              // Store in cache
              await cache.set(cacheKey, cacheEntry, { 
                ttl,
                compression: enableCompression && typeof responseBody === 'string',
              });

              logger.debug('Response cached', { 
                cacheKey, 
                statusCode: res.statusCode,
                size: JSON.stringify(responseBody).length,
              });

            } catch (error) {
              logger.error('Failed to cache response', error as Error, { cacheKey });
            }
          }
        });

        // Set cache miss headers
        res.set('X-Cache', 'MISS');
        res.set('X-Cache-Key', cacheKey);

        next();

      } catch (error) {
        logger.error('Cache middleware error', error as Error);
        next();
      }
    };
  }

  // Route-specific caching
  static route(routePattern: string, options: CacheMiddlewareOptions = {}) {
    return this.response({
      keyGenerator: (req: Request) => `route:${routePattern}:${req.originalUrl}`,
      ...options,
    });
  }

  // User-specific caching
  static userSpecific(options: CacheMiddlewareOptions = {}) {
    return this.response({
      keyGenerator: (req: Request) => {
        const userId = (req as any).user?.id || 'anonymous';
        return `user:${userId}:${req.method}:${req.originalUrl}`;
      },
      ...options,
    });
  }

  // API caching with versioning
  static api(version: string, options: CacheMiddlewareOptions = {}) {
    return this.response({
      keyGenerator: (req: Request) => `api:${version}:${req.method}:${req.originalUrl}`,
      varyBy: ['accept', 'accept-encoding', 'authorization'],
      ...options,
    });
  }

  // Conditional caching based on query parameters
  static conditional(conditions: Record<string, any>, options: CacheMiddlewareOptions = {}) {
    return this.response({
      condition: (req: Request) => {
        return Object.entries(conditions).every(([key, value]) => {
          const requestValue = req.query[key] || req.headers[key] || (req as any)[key];
          return requestValue === value;
        });
      },
      ...options,
    });
  }

  // Time-based caching (different TTL based on time)
  static timeBased(timeRanges: Array<{ start: number; end: number; ttl: number }>) {
    return this.response({
      ttl: 300, // Default
      keyGenerator: (req: Request) => {
        const hour = new Date().getHours();
        const timeRange = timeRanges.find(range => hour >= range.start && hour <= range.end);
        const currentTtl = timeRange?.ttl || 300;
        
        return `time:${hour}:${req.method}:${req.originalUrl}:ttl:${currentTtl}`;
      },
    });
  }

  // Cache invalidation middleware
  static invalidate(patterns: string[] | ((req: Request) => string[])) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const cache = cacheManager.store();
        const invalidationPatterns = typeof patterns === 'function' ? patterns(req) : patterns;

        for (const pattern of invalidationPatterns) {
          const keys = await cache.keys(pattern);
          for (const key of keys) {
            await cache.del(key);
          }
        }

        logger.info('Cache invalidated', { patterns: invalidationPatterns });
        next();

      } catch (error) {
        logger.error('Cache invalidation error', error as Error);
        next();
      }
    };
  }

  // Cache warming middleware
  static warm(endpoints: Array<{ url: string; method?: string; headers?: Record<string, string> }>) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      // Warm cache in background
      setImmediate(async () => {
        for (const endpoint of endpoints) {
          try {
            // This would typically make internal requests to warm the cache
            logger.debug('Cache warming', { endpoint: endpoint.url });
          } catch (error) {
            logger.error('Cache warming error', error as Error, { endpoint });
          }
        }
      });

      next();
    };
  }

  // Cache statistics middleware
  static stats() {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (req.path === '/cache/stats') {
        const stats = cacheManager.getStats();
        return res.json({
          cache: stats,
          timestamp: new Date().toISOString(),
        });
      }
      next();
    };
  }

  // Cache control headers
  static headers(options: {
    maxAge?: number;
    mustRevalidate?: boolean;
    noCache?: boolean;
    noStore?: boolean;
    private?: boolean;
    public?: boolean;
  } = {}) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const {
        maxAge = 300,
        mustRevalidate = false,
        noCache = false,
        noStore = false,
        private: isPrivate = false,
        public: isPublic = true,
      } = options;

      let cacheControl = [];

      if (noStore) {
        cacheControl.push('no-store');
      } else if (noCache) {
        cacheControl.push('no-cache');
      } else {
        if (isPrivate) cacheControl.push('private');
        if (isPublic && !isPrivate) cacheControl.push('public');
        cacheControl.push(`max-age=${maxAge}`);
        if (mustRevalidate) cacheControl.push('must-revalidate');
      }

      res.set('Cache-Control', cacheControl.join(', '));
      next();
    };
  }

  // Vary header middleware
  static vary(headers: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
      res.set('Vary', headers.join(', '));
      next();
    };
  }

  // ETag generation middleware
  static etag() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const originalSend = res.send;

      res.send = function(body: any) {
        if (body && req.method === 'GET') {
          const etag = CacheMiddleware.generateETag(body);
          this.set('ETag', etag);

          // Handle conditional requests
          if (req.headers['if-none-match'] === etag) {
            return this.status(304).end();
          }
        }

        return originalSend.call(this, body);
      };

      next();
    };
  }

  // Private helper methods
  private static generateETag(data: any): string {
    const crypto = require('crypto');
    const content = typeof data === 'string' ? data : JSON.stringify(data);
    return `"${crypto.createHash('md5').update(content).digest('hex')}"`;
  }

  // Cache clearing utility
  static clearCache(pattern?: string) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const cache = cacheManager.store();
        
        if (pattern) {
          const keys = await cache.keys(pattern);
          for (const key of keys) {
            await cache.del(key);
          }
        } else {
          await cache.clear();
        }

        res.json({
          success: true,
          message: pattern ? `Cache cleared for pattern: ${pattern}` : 'All cache cleared',
        });

      } catch (error) {
        logger.error('Cache clear error', error as Error);
        res.status(500).json({
          success: false,
          message: 'Failed to clear cache',
        });
      }
    };
  }
}

export default CacheMiddleware;