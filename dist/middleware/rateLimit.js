"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchRateLimit = exports.uploadRateLimit = exports.authRateLimit = exports.apiRateLimit = exports.lenientRateLimit = exports.moderateRateLimit = exports.strictRateLimit = exports.rateLimitMiddleware = exports.RateLimiter = void 0;
const errors_1 = require("@/utils/errors");
const logger_1 = require("@/utils/logger");
// Default memory store implementation
class DefaultMemoryStore {
    hits = new Map();
    resetTime = null;
    async get(key) {
        return this.hits.get(key);
    }
    async set(key, value, windowMs) {
        this.hits.set(key, value);
        this.scheduleReset(key, windowMs);
    }
    async increment(key, windowMs) {
        const now = Date.now();
        const existing = this.hits.get(key);
        if (existing && (now - existing.firstRequest) < windowMs) {
            existing.count++;
            this.hits.set(key, existing);
            return existing;
        }
        const newInfo = {
            count: 1,
            resetTime: now + windowMs,
            firstRequest: now,
        };
        this.hits.set(key, newInfo);
        this.scheduleReset(key, windowMs);
        return newInfo;
    }
    async decrement(key) {
        const existing = this.hits.get(key);
        if (existing && existing.count > 0) {
            existing.count--;
            this.hits.set(key, existing);
        }
    }
    async resetAll() {
        this.hits.clear();
        if (this.resetTime) {
            clearTimeout(this.resetTime);
            this.resetTime = null;
        }
    }
    scheduleReset(key, windowMs) {
        setTimeout(() => {
            this.hits.delete(key);
        }, windowMs);
    }
}
class RateLimiter {
    static defaultStore = new DefaultMemoryStore();
    static create(options) {
        const { windowMs, maxRequests, message = 'Too many requests from this IP, please try again later.', standardHeaders = true, legacyHeaders = false, skipSuccessfulRequests = false, skipFailedRequests = false, keyGenerator = (req) => req.ip || 'unknown', skip = () => false, handler, onLimitReached, store = this.defaultStore, } = options;
        return async (req, res, next) => {
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
                    logger_1.logger.warn('Rate limit exceeded', {
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
                    throw new errors_1.RateLimitError(message, retryAfterSeconds);
                }
                // Handle skip options
                const originalEnd = res.end;
                res.end = function (chunk, encoding) {
                    const statusCode = res.statusCode;
                    const shouldDecrement = (skipSuccessfulRequests && statusCode >= 200 && statusCode < 300) ||
                        (skipFailedRequests && statusCode >= 400);
                    if (shouldDecrement) {
                        store.decrement(key).catch(error => {
                            logger_1.logger.error('Failed to decrement rate limit counter', error);
                        });
                    }
                    return originalEnd.call(this, chunk, encoding);
                };
                next();
            }
            catch (error) {
                next(error);
            }
        };
    }
    // Preset configurations
    static presets = {
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
            keyGenerator: (req) => {
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
    static strict(options = {}) {
        return this.create({ ...this.presets.strict, ...options });
    }
    static moderate(options = {}) {
        return this.create({ ...this.presets.moderate, ...options });
    }
    static lenient(options = {}) {
        return this.create({ ...this.presets.lenient, ...options });
    }
    static api(options = {}) {
        return this.create({ ...this.presets.api, ...options });
    }
    static auth(options = {}) {
        return this.create({ ...this.presets.auth, ...options });
    }
    static upload(options = {}) {
        return this.create({ ...this.presets.upload, ...options });
    }
    static search(options = {}) {
        return this.create({ ...this.presets.search, ...options });
    }
    // Per-user rate limiting
    static perUser(options) {
        return this.create({
            ...options,
            keyGenerator: (req) => {
                const user = req.user;
                return user?.id ? `user:${user.id}` : `ip:${req.ip}`;
            },
        });
    }
    // Per-endpoint rate limiting
    static perEndpoint(options) {
        return this.create({
            ...options,
            keyGenerator: (req) => {
                const user = req.user;
                const endpoint = `${req.method}:${req.route?.path || req.path}`;
                return user?.id ? `user:${user.id}:${endpoint}` : `ip:${req.ip}:${endpoint}`;
            },
        });
    }
    // Dynamic rate limiting based on user tier
    static dynamic(baseOptions) {
        return this.create({
            ...baseOptions,
            maxRequests: baseOptions.maxRequests, // Will be overridden per request
            keyGenerator: (req) => {
                const user = req.user;
                return user?.id ? `user:${user.id}` : `ip:${req.ip}`;
            },
            skip: (req) => {
                const user = req.user;
                // Skip rate limiting for premium users or admins
                return user?.subscriptionTier === 'premium' || user?.role === 'admin';
            },
        });
    }
    // Get rate limit metrics (for monitoring)
    static async getMetrics(store = this.defaultStore) {
        // This would require additional tracking in the store
        // Implementation depends on store type (memory, redis, etc.)
        return {
            message: 'Metrics not available for this store type',
        };
    }
    // Reset all rate limits (for testing or maintenance)
    static async resetAll(store = this.defaultStore) {
        await store.resetAll();
        logger_1.logger.info('All rate limits reset');
    }
}
exports.RateLimiter = RateLimiter;
// Export convenience function
const rateLimitMiddleware = (options) => {
    return RateLimiter.create(options);
};
exports.rateLimitMiddleware = rateLimitMiddleware;
// Export presets for easy access
exports.strictRateLimit = RateLimiter.strict, exports.moderateRateLimit = RateLimiter.moderate, exports.lenientRateLimit = RateLimiter.lenient, exports.apiRateLimit = RateLimiter.api, exports.authRateLimit = RateLimiter.auth, exports.uploadRateLimit = RateLimiter.upload, exports.searchRateLimit = RateLimiter.search;
exports.default = RateLimiter;
//# sourceMappingURL=rateLimit.js.map