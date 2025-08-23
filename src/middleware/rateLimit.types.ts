import { Request, Response, NextFunction } from 'express';

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request, res: Response) => boolean;
  handler?: (req: Request, res: Response, next: NextFunction) => void;
  onLimitReached?: (req: Request, res: Response) => void;
  store?: RateLimitStore;
}

export interface RateLimitStore {
  get(key: string): Promise<RateLimitInfo | undefined>;
  set(key: string, value: RateLimitInfo, windowMs: number): Promise<void>;
  increment(key: string, windowMs: number): Promise<RateLimitInfo>;
  decrement(key: string): Promise<void>;
  resetAll(): Promise<void>;
}

export interface RateLimitInfo {
  count: number;
  resetTime: number;
  firstRequest: number;
}

export interface MemoryStore extends RateLimitStore {
  hits: Map<string, RateLimitInfo>;
  resetTime: NodeJS.Timeout | null;
}

export interface RedisStore extends RateLimitStore {
  client: any; // Redis client
  prefix: string;
}

export type RateLimitMiddleware = (req: Request, res: Response, next: NextFunction) => Promise<void> | void;

export interface CreateRateLimitOptions extends RateLimitOptions {
  name?: string;
  description?: string;
}

// Pre-configured rate limit types
export interface RateLimitPresets {
  strict: RateLimitOptions;
  moderate: RateLimitOptions;
  lenient: RateLimitOptions;
  api: RateLimitOptions;
  auth: RateLimitOptions;
  upload: RateLimitOptions;
  search: RateLimitOptions;
}

export interface RateLimitMetrics {
  totalRequests: number;
  blockedRequests: number;
  uniqueIPs: number;
  topIPs: Array<{
    ip: string;
    count: number;
    blocked: number;
  }>;
  timeRange: {
    start: Date;
    end: Date;
  };
}