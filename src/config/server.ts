import { CorsOptions } from 'cors';
import { RateLimiterOptions } from 'express-rate-limit';
import { logger } from '@/utils/logger';

export interface ServerConfig {
  port: number;
  host: string;
  nodeEnv: 'development' | 'production' | 'test';
  apiVersion: string;
  cors: CorsOptions;
  rateLimit: RateLimiterOptions;
  security: {
    trustProxy: boolean;
    helmet: {
      contentSecurityPolicy: boolean;
      crossOriginEmbedderPolicy: boolean;
      dnsPrefetchControl: boolean;
      frameguard: boolean;
      hidePoweredBy: boolean;
      hsts: boolean;
      ieNoOpen: boolean;
      noSniff: boolean;
      originAgentCluster: boolean;
      permittedCrossDomainPolicies: boolean;
      referrerPolicy: boolean;
      xssFilter: boolean;
    };
    session: {
      secret: string;
      resave: boolean;
      saveUninitialized: boolean;
      cookie: {
        secure: boolean;
        httpOnly: boolean;
        maxAge: number;
        sameSite: 'strict' | 'lax' | 'none';
      };
    };
  };
  monitoring: {
    enableHealthChecks: boolean;
    healthCheckPath: string;
    enableMetrics: boolean;
    metricsPath: string;
    requestLogging: boolean;
  };
  swagger: {
    enabled: boolean;
    path: string;
    title: string;
    version: string;
    description: string;
  };
  gracefulShutdown: {
    enabled: boolean;
    timeout: number;
  };
}

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

export const serverConfig: ServerConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
  apiVersion: process.env.API_VERSION || 'v1',
  
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or Postman)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5173', // Vite dev server
      ];
      
      if (isDevelopment || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Cache-Control',
      'X-File-Name',
    ],
    exposedHeaders: [
      'X-Total-Count',
      'X-Page-Count',
      'X-Current-Page',
      'X-Per-Page',
      'Link',
    ],
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    message: {
      error: 'Too many requests',
      message: 'You have made too many requests. Please try again later.',
      retryAfter: 'Check the Retry-After header for when you can make requests again.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for health checks and metrics
      return req.path.includes('/health') || req.path.includes('/metrics');
    },
    keyGenerator: (req) => {
      // Use IP address and user ID (if authenticated) for rate limiting
      const userId = (req as any).user?.id;
      return userId ? `user:${userId}` : req.ip;
    },
  },
  
  security: {
    trustProxy: isProduction,
    helmet: {
      contentSecurityPolicy: isProduction,
      crossOriginEmbedderPolicy: false,
      dnsPrefetchControl: true,
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: false,
      referrerPolicy: { policy: 'no-referrer' },
      xssFilter: true,
    },
    session: {
      secret: process.env.SESSION_SECRET || 'fallback-session-secret-change-in-production',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: isProduction,
        httpOnly: true,
        maxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000', 10), // 24 hours
        sameSite: isProduction ? 'strict' : 'lax',
      },
    },
  },
  
  monitoring: {
    enableHealthChecks: process.env.ENABLE_HEALTH_CHECKS !== 'false',
    healthCheckPath: process.env.HEALTH_CHECK_PATH || '/health',
    enableMetrics: process.env.ENABLE_METRICS === 'true',
    metricsPath: process.env.METRICS_PATH || '/metrics',
    requestLogging: process.env.REQUEST_LOGGING !== 'false',
  },
  
  swagger: {
    enabled: process.env.SWAGGER_ENABLED === 'true' || isDevelopment,
    path: process.env.SWAGGER_PATH || '/api-docs',
    title: process.env.SWAGGER_TITLE || 'Plantix API',
    version: process.env.SWAGGER_VERSION || '1.0.0',
    description: process.env.SWAGGER_DESCRIPTION || 'Agricultural crop disease diagnosis platform API',
  },
  
  gracefulShutdown: {
    enabled: true,
    timeout: parseInt(process.env.GRACEFUL_SHUTDOWN_TIMEOUT || '10000', 10), // 10 seconds
  },
};

// Environment-specific configurations
export const environmentConfig = {
  development: {
    logLevel: 'debug',
    enableStackTrace: true,
    enableDetailedErrors: true,
    enableCORS: true,
    rateLimitDisabled: false,
  },
  production: {
    logLevel: 'info',
    enableStackTrace: false,
    enableDetailedErrors: false,
    enableCORS: true,
    rateLimitDisabled: false,
  },
  test: {
    logLevel: 'error',
    enableStackTrace: true,
    enableDetailedErrors: true,
    enableCORS: false,
    rateLimitDisabled: true,
  },
};

// API response formats
export const API_RESPONSES = {
  SUCCESS: (data: any, message?: string) => ({
    success: true,
    message: message || 'Operation successful',
    data,
    timestamp: new Date().toISOString(),
  }),
  
  ERROR: (message: string, code?: string, details?: any) => ({
    success: false,
    error: {
      message,
      code: code || 'UNKNOWN_ERROR',
      details: serverConfig.nodeEnv === 'development' ? details : undefined,
    },
    timestamp: new Date().toISOString(),
  }),
  
  PAGINATED: (data: any[], pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }, message?: string) => ({
    success: true,
    message: message || 'Data retrieved successfully',
    data,
    pagination,
    timestamp: new Date().toISOString(),
  }),
  
  VALIDATION_ERROR: (errors: Array<{ field: string; message: string }>) => ({
    success: false,
    error: {
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors,
    },
    timestamp: new Date().toISOString(),
  }),
};

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

// Request timeout configurations
export const TIMEOUTS = {
  REQUEST: parseInt(process.env.REQUEST_TIMEOUT || '30000', 10), // 30 seconds
  DATABASE_QUERY: parseInt(process.env.DB_QUERY_TIMEOUT || '10000', 10), // 10 seconds
  EXTERNAL_API: parseInt(process.env.EXTERNAL_API_TIMEOUT || '15000', 10), // 15 seconds
  FILE_UPLOAD: parseInt(process.env.FILE_UPLOAD_TIMEOUT || '60000', 10), // 1 minute
  AI_PROCESSING: parseInt(process.env.AI_PROCESSING_TIMEOUT || '120000', 10), // 2 minutes
} as const;

// Feature flags
export const FEATURE_FLAGS = {
  ENABLE_CACHING: process.env.ENABLE_CACHING !== 'false',
  ENABLE_BACKGROUND_JOBS: process.env.ENABLE_BACKGROUND_JOBS !== 'false',
  ENABLE_WEBSOCKETS: process.env.ENABLE_WEBSOCKETS !== 'false',
  ENABLE_NOTIFICATIONS: process.env.ENABLE_NOTIFICATIONS !== 'false',
  ENABLE_ANALYTICS: process.env.ENABLE_ANALYTICS === 'true',
  ENABLE_RATE_LIMITING: process.env.ENABLE_RATE_LIMITING !== 'false',
  ENABLE_REQUEST_ID: process.env.ENABLE_REQUEST_ID !== 'false',
  ENABLE_COMPRESSION: process.env.ENABLE_COMPRESSION !== 'false',
} as const;

// Validation configurations
export const VALIDATION_CONFIG = {
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 30,
  EMAIL_MAX_LENGTH: 254,
  PHONE_MIN_LENGTH: 10,
  PHONE_MAX_LENGTH: 15,
  NAME_MAX_LENGTH: 50,
  BIO_MAX_LENGTH: 500,
  CROP_NAME_MAX_LENGTH: 100,
  DISEASE_NAME_MAX_LENGTH: 100,
} as const;

// Cache configurations
export const CACHE_CONFIG = {
  DEFAULT_TTL: 3600, // 1 hour
  SHORT_TTL: 300,    // 5 minutes
  LONG_TTL: 86400,   // 24 hours
  KEYS: {
    USER_SESSION: 'user:session:',
    USER_PROFILE: 'user:profile:',
    CROP_DATA: 'crop:data:',
    DISEASE_DATA: 'disease:data:',
    WEATHER_DATA: 'weather:data:',
    MARKET_PRICES: 'market:prices:',
  },
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  DEFAULT_PAGE: 1,
} as const;

// File upload configurations
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  MAX_FILES_PER_REQUEST: 10,
  THUMBNAIL_SIZES: [
    { name: 'small', size: 150 },
    { name: 'medium', size: 300 },
    { name: 'large', size: 600 },
  ],
} as const;

// Logging configuration
export const LOGGING_CONFIG = {
  LEVEL: process.env.LOG_LEVEL || environmentConfig[serverConfig.nodeEnv].logLevel,
  FILE_PATH: process.env.LOG_FILE_PATH || './logs/app.log',
  ERROR_FILE_PATH: process.env.ERROR_LOG_FILE_PATH || './logs/error.log',
  MAX_FILES: parseInt(process.env.LOG_MAX_FILES || '5', 10),
  MAX_SIZE: process.env.LOG_MAX_SIZE || '10m',
  ENABLE_CONSOLE: process.env.ENABLE_CONSOLE_LOGGING !== 'false',
  ENABLE_FILE: process.env.ENABLE_FILE_LOGGING === 'true',
} as const;

// External service configurations
export const EXTERNAL_SERVICES = {
  WEATHER_API: {
    BASE_URL: process.env.WEATHER_API_URL || 'https://api.openweathermap.org/data/2.5',
    API_KEY: process.env.WEATHER_API_KEY || '',
    TIMEOUT: TIMEOUTS.EXTERNAL_API,
  },
  ML_API: {
    BASE_URL: process.env.ML_API_URL || 'http://localhost:5000',
    API_KEY: process.env.ML_API_KEY || '',
    TIMEOUT: TIMEOUTS.AI_PROCESSING,
  },
  MAPS_API: {
    API_KEY: process.env.GOOGLE_MAPS_API_KEY || '',
  },
} as const;

// Validation helpers
export class ConfigValidator {
  static validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required environment variables
    if (isProduction) {
      const requiredVars = [
        'JWT_SECRET',
        'JWT_REFRESH_SECRET',
        'MONGODB_URI',
        'SESSION_SECRET',
      ];

      for (const envVar of requiredVars) {
        if (!process.env[envVar]) {
          errors.push(`Missing required environment variable: ${envVar}`);
        }
      }

      // Check JWT secrets are different
      if (process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET) {
        errors.push('JWT_SECRET and JWT_REFRESH_SECRET must be different');
      }

      // Check secret lengths
      if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
        errors.push('JWT_SECRET must be at least 32 characters long');
      }
    }

    // Validate port number
    if (serverConfig.port < 1 || serverConfig.port > 65535) {
      errors.push(`Invalid port number: ${serverConfig.port}`);
    }

    // Validate rate limit configuration
    if (serverConfig.rateLimit.max && serverConfig.rateLimit.max < 1) {
      errors.push('Rate limit max requests must be greater than 0');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static logConfiguration(): void {
    logger.info('Server configuration loaded', {
      environment: serverConfig.nodeEnv,
      port: serverConfig.port,
      host: serverConfig.host,
      apiVersion: serverConfig.apiVersion,
      features: FEATURE_FLAGS,
      monitoring: {
        healthChecks: serverConfig.monitoring.enableHealthChecks,
        metrics: serverConfig.monitoring.enableMetrics,
        swagger: serverConfig.swagger.enabled,
      },
    });
  }
}

// Health check configuration
export const HEALTH_CHECK_CONFIG = {
  TIMEOUT: 5000, // 5 seconds
  CHECKS: {
    database: true,
    redis: true,
    email: false,
    sms: false,
    storage: true,
    externalAPIs: false,
  },
} as const;

export default {
  server: serverConfig,
  environment: environmentConfig[serverConfig.nodeEnv],
  responses: API_RESPONSES,
  httpStatus: HTTP_STATUS,
  timeouts: TIMEOUTS,
  features: FEATURE_FLAGS,
  validation: VALIDATION_CONFIG,
  cache: CACHE_CONFIG,
  pagination: PAGINATION,
  upload: UPLOAD_CONFIG,
  logging: LOGGING_CONFIG,
  external: EXTERNAL_SERVICES,
  healthCheck: HEALTH_CHECK_CONFIG,
  validator: ConfigValidator,
};