import { RateLimitOptions, RateLimitStore, RateLimitMiddleware, CreateRateLimitOptions, RateLimitPresets } from './rateLimit.types';
export declare class RateLimiter {
    private static defaultStore;
    static create(options: CreateRateLimitOptions): RateLimitMiddleware;
    static presets: RateLimitPresets;
    static strict(options?: Partial<RateLimitOptions>): RateLimitMiddleware;
    static moderate(options?: Partial<RateLimitOptions>): RateLimitMiddleware;
    static lenient(options?: Partial<RateLimitOptions>): RateLimitMiddleware;
    static api(options?: Partial<RateLimitOptions>): RateLimitMiddleware;
    static auth(options?: Partial<RateLimitOptions>): RateLimitMiddleware;
    static upload(options?: Partial<RateLimitOptions>): RateLimitMiddleware;
    static search(options?: Partial<RateLimitOptions>): RateLimitMiddleware;
    static perUser(options: RateLimitOptions): RateLimitMiddleware;
    static perEndpoint(options: RateLimitOptions): RateLimitMiddleware;
    static dynamic(baseOptions: RateLimitOptions): RateLimitMiddleware;
    static getMetrics(store?: RateLimitStore): Promise<any>;
    static resetAll(store?: RateLimitStore): Promise<void>;
}
export declare const rateLimitMiddleware: (options: CreateRateLimitOptions) => RateLimitMiddleware;
export declare const strictRateLimit: typeof RateLimiter.strict, moderateRateLimit: typeof RateLimiter.moderate, lenientRateLimit: typeof RateLimiter.lenient, apiRateLimit: typeof RateLimiter.api, authRateLimit: typeof RateLimiter.auth, uploadRateLimit: typeof RateLimiter.upload, searchRateLimit: typeof RateLimiter.search;
export default RateLimiter;
//# sourceMappingURL=rateLimit.d.ts.map