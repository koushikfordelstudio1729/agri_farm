import { config as dotenvConfig } from 'dotenv';
import path from 'path';

// Load environment variables
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
const envPath = path.resolve(process.cwd(), envFile);

dotenvConfig({ path: envPath });

// Import all configuration modules
import databaseConfig from './database';
import authConfig from './auth';
import redisConfig from './redis';
import emailConfig from './email';
import smsConfig from './sms';
import uploadConfig from './upload';
import serverConfig from './server';
import { authConfig as authConfigObj } from './auth';
import { serverConfig as serverConfigObj } from './server';

// Type imports
import type { AuthConfig } from '@/types/auth.types';
import type { ServerConfig } from './server';

// Re-export all configurations
export { default as database } from './database';
export { default as auth } from './auth';
export { default as redis } from './redis';
export { default as email } from './email';
export { default as sms } from './sms';
export { default as upload } from './upload';
export { default as server } from './server';

// Named exports for direct access
export { 
  connectDatabase, 
  disconnectDatabase, 
  clearDatabase, 
  healthCheck as databaseHealthCheck 
} from './database';

export { 
  generateTokens, 
  verifyAccessToken, 
  verifyRefreshToken,
  validatePasswordStrength,
  authConfig as authConfiguration
} from './auth';

export { 
  redis,
  CacheService,
  RateLimiter,
  SessionManager,
  CACHE_TTL,
  CACHE_KEYS,
  checkRedisHealth
} from './redis';

export { 
  EmailService,
  checkEmailHealth
} from './email';

export { 
  SMSService,
  SMS_TEMPLATES,
  checkSMSHealth
} from './sms';

export { 
  upload,
  UploadService,
  checkUploadHealth
} from './upload';

export { 
  serverConfig as serverConfiguration,
  API_RESPONSES,
  HTTP_STATUS,
  TIMEOUTS,
  FEATURE_FLAGS,
  VALIDATION_CONFIG,
  PAGINATION,
  ConfigValidator
} from './server';

// Central configuration object
export interface AppConfig {
  env: string;
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
  server: ServerConfig;
  auth: AuthConfig;
  database: {
    uri: string;
    testUri: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    keyPrefix: string;
  };
  email: {
    service: string;
    from: { name: string; address: string };
    templates: Record<string, string>;
  };
  sms: {
    service: string;
    rateLimits: {
      perMinute: number;
      perHour: number;
      perDay: number;
    };
  };
  upload: {
    storage: string;
    limits: {
      fileSize: number;
      files: number;
    };
    allowedMimeTypes: string[];
  };
  external: {
    weatherApi: {
      baseUrl: string;
      apiKey: string;
    };
    mlApi: {
      baseUrl: string;
      apiKey: string;
    };
  };
}

// Create the main configuration object
export const config: AppConfig = {
  env: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  server: serverConfigObj,
  auth: authConfigObj,
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/plantix',
    testUri: process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/plantix_test',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'plantix:',
  },
  email: {
    service: process.env.EMAIL_SERVICE || 'smtp',
    from: {
      name: process.env.EMAIL_FROM_NAME || 'Plantix',
      address: process.env.EMAIL_FROM || 'noreply@plantix.com',
    },
    templates: {
      baseUrl: process.env.EMAIL_TEMPLATE_BASE_URL || 'https://app.plantix.com/templates',
    },
  },
  sms: {
    service: process.env.SMS_SERVICE || 'twilio',
    rateLimits: {
      perMinute: parseInt(process.env.SMS_RATE_LIMIT_MINUTE || '5', 10),
      perHour: parseInt(process.env.SMS_RATE_LIMIT_HOUR || '20', 10),
      perDay: parseInt(process.env.SMS_RATE_LIMIT_DAY || '50', 10),
    },
  },
  upload: {
    storage: process.env.UPLOAD_STORAGE || 'cloudinary',
    limits: {
      fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
      files: parseInt(process.env.MAX_FILES_PER_UPLOAD || '10', 10),
    },
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ],
  },
  external: {
    weatherApi: {
      baseUrl: process.env.WEATHER_API_URL || 'https://api.openweathermap.org/data/2.5',
      apiKey: process.env.WEATHER_API_KEY || '',
    },
    mlApi: {
      baseUrl: process.env.ML_API_URL || 'http://localhost:5000',
      apiKey: process.env.ML_API_KEY || '',
    },
  },
};

// Configuration validation
export class ConfigurationManager {
  /**
   * Validate all configurations on application startup
   */
  static validateAll(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate server configuration
    const serverValidation = ConfigValidator.validate();
    if (!serverValidation.isValid) {
      errors.push(...serverValidation.errors.map(err => `Server: ${err}`));
    }

    // Validate database configuration
    if (!config.database.uri) {
      errors.push('Database: MongoDB URI is required');
    }

    // Validate auth configuration
    if (!config.auth.jwt.secret) {
      errors.push('Auth: JWT secret is required');
    }

    if (!config.auth.jwt.refreshSecret) {
      errors.push('Auth: JWT refresh secret is required');
    }

    if (config.auth.jwt.secret === config.auth.jwt.refreshSecret) {
      errors.push('Auth: JWT secret and refresh secret must be different');
    }

    // Validate external services in production
    if (config.isProduction) {
      if (!config.external.weatherApi.apiKey) {
        errors.push('External: Weather API key is required in production');
      }

      // Validate email service configuration based on service type
      if (config.email.service === 'sendgrid' && !process.env.SENDGRID_API_KEY) {
        errors.push('Email: SendGrid API key is required');
      }

      if (config.email.service === 'smtp') {
        if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
          errors.push('Email: SMTP configuration is incomplete');
        }
      }

      // Validate SMS service configuration
      if (config.sms.service === 'twilio') {
        if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
          errors.push('SMS: Twilio configuration is incomplete');
        }
      }

      // Validate upload service configuration
      if (config.upload.storage === 'cloudinary') {
        if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
          errors.push('Upload: Cloudinary configuration is incomplete');
        }
      }

      if (config.upload.storage === 's3') {
        if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
          errors.push('Upload: AWS S3 configuration is incomplete');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Log configuration summary (without sensitive data)
   */
  static logConfigurationSummary(): void {
    const logger = require('@/utils/logger').logger;

    logger.info('Configuration Summary', {
      environment: config.env,
      server: {
        port: config.server.port,
        host: config.server.host,
        apiVersion: config.server.apiVersion,
      },
      services: {
        database: 'MongoDB',
        cache: 'Redis',
        email: config.email.service,
        sms: config.sms.service,
        storage: config.upload.storage,
      },
      features: {
        healthChecks: config.server.monitoring.enableHealthChecks,
        metrics: config.server.monitoring.enableMetrics,
        swagger: config.server.swagger.enabled,
        caching: serverConfig.features.ENABLE_CACHING,
        websockets: serverConfig.features.ENABLE_WEBSOCKETS,
        notifications: serverConfig.features.ENABLE_NOTIFICATIONS,
      },
      security: {
        cors: config.server.cors ? 'enabled' : 'disabled',
        helmet: 'enabled',
        rateLimit: serverConfig.features.ENABLE_RATE_LIMITING ? 'enabled' : 'disabled',
        trustProxy: config.server.security.trustProxy,
      },
    });
  }

  /**
   * Get configuration for specific environment
   */
  static getEnvironmentConfig(env: string): Partial<AppConfig> {
    const envConfigs = {
      development: {
        database: {
          uri: 'mongodb://localhost:27017/plantix_dev',
        },
        external: {
          mlApi: {
            baseUrl: 'http://localhost:5000',
          },
        },
      },
      production: {
        database: {
          uri: process.env.MONGODB_URI,
        },
        external: {
          mlApi: {
            baseUrl: process.env.ML_API_URL,
          },
        },
      },
      test: {
        database: {
          uri: 'mongodb://localhost:27017/plantix_test',
        },
        external: {
          mlApi: {
            baseUrl: 'http://localhost:5001', // Different port for tests
          },
        },
      },
    };

    return envConfigs[env as keyof typeof envConfigs] || {};
  }

  /**
   * Health check for all services
   */
  static async performHealthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    services: Record<string, { status: 'up' | 'down'; details?: any }>;
    timestamp: string;
  }> {
    const results: Record<string, { status: 'up' | 'down'; details?: any }> = {};

    try {
      // Check database
      const dbHealth = await databaseConfig.healthCheck();
      results.database = { status: dbHealth.status, details: dbHealth.details };
    } catch (error) {
      results.database = { status: 'down', details: { error: 'Connection failed' } };
    }

    try {
      // Check Redis
      const redisHealth = await redisConfig.checkRedisHealth();
      results.redis = { status: redisHealth.status, details: redisHealth.details };
    } catch (error) {
      results.redis = { status: 'down', details: { error: 'Connection failed' } };
    }

    try {
      // Check email service
      const emailHealth = await emailConfig.checkEmailHealth();
      results.email = { status: emailHealth.status, details: emailHealth.details };
    } catch (error) {
      results.email = { status: 'down', details: { error: 'Service unavailable' } };
    }

    try {
      // Check SMS service
      const smsHealth = await smsConfig.checkSMSHealth();
      results.sms = { status: smsHealth.status, details: smsHealth.details };
    } catch (error) {
      results.sms = { status: 'down', details: { error: 'Service unavailable' } };
    }

    try {
      // Check upload service
      const uploadHealth = await uploadConfig.checkUploadHealth();
      results.upload = { status: uploadHealth.status, details: uploadHealth.details };
    } catch (error) {
      results.upload = { status: 'down', details: { error: 'Service unavailable' } };
    }

    // Determine overall health
    const unhealthyServices = Object.values(results).filter(service => service.status === 'down');
    const overallStatus = unhealthyServices.length === 0 ? 'healthy' : 'unhealthy';

    return {
      status: overallStatus,
      services: results,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Initialize configurations
   */
  static async initialize(): Promise<void> {
    // Validate configuration
    const validation = this.validateAll();
    if (!validation.isValid) {
      const logger = require('@/utils/logger').logger;
      logger.error('Configuration validation failed', {
        errors: validation.errors,
      });
      throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
    }

    // Log configuration summary
    this.logConfigurationSummary();

    // Initialize services that need setup
    ConfigValidator.logConfiguration();
  }
}

// Default export
export default {
  config,
  manager: ConfigurationManager,
  
  // Service configurations
  database: databaseConfig,
  auth: authConfig,
  redis: redisConfig,
  email: emailConfig,
  sms: smsConfig,
  upload: uploadConfig,
  server: serverConfig,
};