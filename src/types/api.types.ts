import type { Request, Response } from 'express';
import type { 
  DatabaseId, 
  ApiResponse, 
  PaginationQuery, 
  PaginationResponse,
  UserRole 
} from './common.types';

export interface AuthenticatedRequest<
  TParams = Record<string, string>,
  TBody = unknown,
  TQuery = Record<string, string>
> extends Request<TParams, unknown, TBody, TQuery> {
  user: {
    id: DatabaseId;
    email: string;
    role: UserRole;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
  };
  sessionId?: string;
  deviceInfo?: {
    deviceId: string;
    deviceType: 'mobile' | 'tablet' | 'desktop';
    platform: string;
    browser?: string;
    version?: string;
  };
}

export interface TypedResponse<T = unknown> extends Response {
  json(body: ApiResponse<T>): this;
}

export interface PaginatedRequest<TQuery = Record<string, string>> 
  extends Request<Record<string, string>, unknown, unknown, TQuery & PaginationQuery> {}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationResponse;
}

export interface ApiError {
  status: number;
  message: string;
  code: string;
  details?: Record<string, unknown>;
  errors?: Record<string, string[]>;
  timestamp: string;
  path: string;
  method: string;
  requestId?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
  code: string;
}

export interface FileUploadRequest extends Request {
  file?: Express.Multer.File;
  files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
}

export interface BulkOperationRequest<T = unknown> {
  operation: 'create' | 'update' | 'delete';
  data: T[];
  options?: {
    continueOnError?: boolean;
    validateOnly?: boolean;
    batchSize?: number;
  };
}

export interface BulkOperationResponse<T = unknown> {
  successful: T[];
  failed: {
    index: number;
    data: T;
    errors: ValidationError[];
  }[];
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

export interface SearchRequest {
  query?: string;
  filters?: Record<string, unknown>;
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
  pagination?: PaginationQuery;
  includeCount?: boolean;
  includeFacets?: boolean;
}

export interface SearchResponse<T = unknown> {
  results: T[];
  facets?: Record<string, {
    value: string;
    count: number;
  }[]>;
  suggestion?: string;
  query: {
    original: string;
    processed: string;
    filters: Record<string, unknown>;
  };
  performance: {
    took: number;
    total: number;
  };
  pagination: PaginationResponse;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    database: {
      status: 'up' | 'down';
      responseTime: number;
      lastCheck: string;
    };
    redis: {
      status: 'up' | 'down';
      responseTime: number;
      lastCheck: string;
    };
    storage: {
      status: 'up' | 'down';
      responseTime: number;
      lastCheck: string;
    };
    external_apis: {
      name: string;
      status: 'up' | 'down';
      responseTime: number;
      lastCheck: string;
    }[];
  };
  resources: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: number;
      cores: number;
    };
    disk: {
      used: number;
      total: number;
      percentage: number;
    };
  };
}

export interface ApiMetrics {
  requests: {
    total: number;
    successful: number;
    failed: number;
    rate: number;
  };
  responseTime: {
    average: number;
    p50: number;
    p95: number;
    p99: number;
  };
  errors: {
    rate: number;
    byStatus: Record<string, number>;
    byEndpoint: Record<string, number>;
  };
  endpoints: {
    path: string;
    method: string;
    requests: number;
    averageResponseTime: number;
    errorRate: number;
  }[];
  users: {
    active: number;
    new: number;
    returning: number;
  };
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  resetTime: Date;
  retryAfter?: number;
}

export interface CacheInfo {
  key: string;
  hit: boolean;
  ttl?: number;
  size?: number;
  createdAt?: Date;
  lastAccessed?: Date;
}

export interface RequestContext {
  requestId: string;
  userId?: DatabaseId;
  sessionId?: string;
  ip: string;
  userAgent: string;
  path: string;
  method: string;
  timestamp: Date;
  duration?: number;
  statusCode?: number;
  responseSize?: number;
  cached?: boolean;
  rateLimit?: RateLimitInfo;
}

export interface WebhookPayload<T = unknown> {
  id: string;
  event: string;
  timestamp: string;
  data: T;
  signature: string;
  version: string;
  retryCount?: number;
}

export interface AsyncJobRequest<T = unknown> {
  type: string;
  data: T;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  delay?: number;
  attempts?: number;
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
}

export interface AsyncJobResponse {
  id: string;
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
  progress: number;
  result?: unknown;
  error?: string;
  createdAt: Date;
  processedAt?: Date;
  finishedAt?: Date;
  attemptsMade: number;
}

export interface ExportRequest {
  format: 'csv' | 'xlsx' | 'json' | 'pdf';
  filters?: Record<string, unknown>;
  fields?: string[];
  options?: {
    compression?: boolean;
    password?: string;
    splitSize?: number;
  };
}

export interface ExportResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  recordCount?: number;
  expiresAt?: Date;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface ImportRequest {
  fileUrl: string;
  format: 'csv' | 'xlsx' | 'json' | 'xml';
  mapping?: Record<string, string>;
  options?: {
    skipHeaders?: boolean;
    delimiter?: string;
    encoding?: string;
    validateOnly?: boolean;
    batchSize?: number;
  };
}

export interface ImportResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  results?: {
    total: number;
    successful: number;
    failed: number;
    skipped: number;
  };
  errors?: {
    row: number;
    field?: string;
    message: string;
  }[];
  createdAt: Date;
  completedAt?: Date;
}

export interface ApiVersionInfo {
  version: string;
  buildDate: string;
  gitCommit?: string;
  environment: string;
  features: {
    name: string;
    enabled: boolean;
    version?: string;
  }[];
  deprecations: {
    version: string;
    endpoint: string;
    method: string;
    reason: string;
    replacement?: string;
    deprecatedAt: Date;
    removedAt?: Date;
  }[];
}

export type ApiHandler<
  TParams = Record<string, string>,
  TBody = unknown,
  TQuery = Record<string, string>,
  TResponse = unknown
> = (
  req: AuthenticatedRequest<TParams, TBody, TQuery>,
  res: TypedResponse<TResponse>
) => Promise<void> | void;

export type PublicApiHandler<
  TParams = Record<string, string>,
  TBody = unknown,
  TQuery = Record<string, string>,
  TResponse = unknown
> = (
  req: Request<TParams, unknown, TBody, TQuery>,
  res: TypedResponse<TResponse>
) => Promise<void> | void;