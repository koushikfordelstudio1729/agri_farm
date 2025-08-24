import winston from 'winston';
import path from 'path';
import DailyRotateFile from 'winston-daily-rotate-file';
import { ErrorContext, ErrorLogEntry } from './errors.types';
import { isProduction, isDevelopment, getCurrentTimestamp } from './helpers';

interface LoggerConfig {
  level: string;
  logToFile: boolean;
  logToConsole: boolean;
  logDirectory: string;
  maxFiles: number;
  maxSize: string;
  enableColorized: boolean;
  enableTimestamp: boolean;
  includeRequestId: boolean;
}

class Logger {
  private logger: winston.Logger;
  private config: LoggerConfig;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      level: process.env.LOG_LEVEL || (isProduction() ? 'info' : 'debug'),
      logToFile: process.env.LOG_TO_FILE === 'true' || isProduction(),
      logToConsole: process.env.LOG_TO_CONSOLE !== 'false', // Default to true unless explicitly disabled
      logDirectory: process.env.LOG_DIRECTORY || 'logs',
      maxFiles: parseInt(process.env.LOG_MAX_FILES || '30', 10),
      maxSize: process.env.LOG_MAX_SIZE || '20m',
      enableColorized: !isProduction(), // Enable colors in non-production
      enableTimestamp: true,
      includeRequestId: true,
      ...config,
    };

    this.logger = this.createLogger();
  }

  private createLogger(): winston.Logger {
    const logFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(this.customFormat.bind(this))
    );

    const transports: winston.transport[] = [];

    // Console transport
    if (this.config.logToConsole) {
      transports.push(
        new winston.transports.Console({
          level: this.config.level,
          format: winston.format.combine(
            winston.format.colorize({ all: this.config.enableColorized }),
            logFormat
          ),
        })
      );
    }

    // File transports
    if (this.config.logToFile) {
      // Error logs
      transports.push(
        new DailyRotateFile({
          filename: path.join(this.config.logDirectory, 'error-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          maxFiles: this.config.maxFiles,
          maxSize: this.config.maxSize,
          format: logFormat,
          handleExceptions: true,
          handleRejections: true,
        })
      );

      // Combined logs
      transports.push(
        new DailyRotateFile({
          filename: path.join(this.config.logDirectory, 'combined-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxFiles: this.config.maxFiles,
          maxSize: this.config.maxSize,
          format: logFormat,
        })
      );

      // Access logs
      transports.push(
        new DailyRotateFile({
          filename: path.join(this.config.logDirectory, 'access-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          level: 'http',
          maxFiles: this.config.maxFiles,
          maxSize: this.config.maxSize,
          format: logFormat,
        })
      );
    }

    return winston.createLogger({
      level: this.config.level,
      format: logFormat,
      transports,
      exitOnError: false,
      silent: process.env.NODE_ENV === 'test',
    });
  }

  private customFormat(info: winston.Logform.TransformableInfo): string {
    const { timestamp, level, message, stack, ...meta } = info;
    
    let log = `${timestamp} [${level.toUpperCase()}]`;
    
    if (this.config.includeRequestId && meta.requestId) {
      log += ` [${meta.requestId}]`;
    }
    
    log += `: ${message}`;
    
    if (stack) {
      log += `\n${stack}`;
    }
    
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.logger.debug(message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.logger.info(message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.logger.warn(message, meta);
  }

  error(message: string, error?: Error | any, meta?: Record<string, unknown>): void {
    const logData: Record<string, unknown> = {
      ...meta,
      ...(error && {
        error: {
          name: error?.name || 'Unknown',
          message: error?.message || String(error) || 'Unknown error',
          stack: error?.stack || 'No stack trace',
          ...(typeof error === 'object' && error !== null && { originalError: error }),
        },
      }),
    };

    this.logger.error(message, logData);
  }

  http(message: string, meta?: Record<string, unknown>): void {
    this.logger.http(message, meta);
  }

  logError(error: Error, context?: ErrorContext): void {
    const logEntry: ErrorLogEntry = {
      level: 'error',
      message: error.message,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        statusCode: (error as any).statusCode || 500,
        isOperational: (error as any).isOperational || false,
      },
      context: context || {
        timestamp: new Date(),
      },
      timestamp: new Date(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION,
    };

    this.logger.error('Application Error', logEntry);
  }

  logRequest(req: any, res: any, responseTime?: number): void {
    const logData = {
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      responseTime: responseTime ? `${responseTime}ms` : undefined,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user?.id,
      requestId: req.id,
    };

    const message = `${req.method} ${req.originalUrl || req.url} - ${res.statusCode}`;
    
    if (res.statusCode >= 400) {
      this.warn(message, logData);
    } else {
      this.http(message, logData);
    }
  }

  logAuditEvent(
    action: string,
    userId: string,
    resource: string,
    details?: Record<string, unknown>
  ): void {
    const auditData = {
      audit: true,
      action,
      userId,
      resource,
      timestamp: getCurrentTimestamp(),
      ip: details?.ip,
      userAgent: details?.userAgent,
      success: details?.success !== false,
      details,
    };

    this.info(`AUDIT: ${action} on ${resource} by user ${userId}`, auditData);
  }

  logSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details: Record<string, unknown>
  ): void {
    const securityData = {
      security: true,
      event,
      severity,
      timestamp: getCurrentTimestamp(),
      ...details,
    };

    const message = `SECURITY: ${event}`;
    
    switch (severity) {
      case 'critical':
      case 'high':
        this.error(message, undefined, securityData);
        break;
      case 'medium':
        this.warn(message, securityData);
        break;
      default:
        this.info(message, securityData);
    }
  }

  logPerformanceMetric(
    metric: string,
    value: number,
    unit: string,
    context?: Record<string, unknown>
  ): void {
    const performanceData = {
      performance: true,
      metric,
      value,
      unit,
      timestamp: getCurrentTimestamp(),
      ...context,
    };

    this.info(`PERFORMANCE: ${metric} = ${value}${unit}`, performanceData);
  }

  logBusinessEvent(
    event: string,
    data: Record<string, unknown>
  ): void {
    const businessData = {
      business: true,
      event,
      timestamp: getCurrentTimestamp(),
      ...data,
    };

    this.info(`BUSINESS: ${event}`, businessData);
  }

  createChildLogger(defaultMeta: Record<string, unknown>): Logger {
    const childConfig = { ...this.config };
    const childLogger = new Logger(childConfig);
    
    // Override the logger to include default meta
    const originalLogger = childLogger.logger;
    childLogger.logger = originalLogger.child(defaultMeta);
    
    return childLogger;
  }

  close(): Promise<void> {
    return new Promise((resolve) => {
      this.logger.close(() => {
        resolve();
      });
    });
  }
}

// Create singleton logger instance
const logger = new Logger();

// Export both the class and the singleton instance
export { Logger };
export default logger;

// Utility functions for common logging patterns
export const loggerUtils = {
  createRequestLogger: (requestId: string) => {
    return logger.createChildLogger({ requestId });
  },

  createUserLogger: (userId: string, requestId?: string) => {
    return logger.createChildLogger({ 
      userId, 
      ...(requestId && { requestId })
    });
  },

  logDatabaseOperation: (
    operation: string,
    collection: string,
    duration: number,
    success: boolean,
    error?: Error
  ) => {
    const meta = {
      database: true,
      operation,
      collection,
      duration: `${duration}ms`,
      success,
      ...(error && { error: { name: error.name, message: error.message } }),
    };

    if (success) {
      logger.debug(`DB: ${operation} on ${collection} completed`, meta);
    } else {
      logger.error(`DB: ${operation} on ${collection} failed`, error, meta);
    }
  },

  logAPICall: (
    service: string,
    endpoint: string,
    method: string,
    statusCode: number,
    duration: number,
    error?: Error
  ) => {
    const meta = {
      externalAPI: true,
      service,
      endpoint,
      method,
      statusCode,
      duration: `${duration}ms`,
      success: statusCode < 400,
      ...(error && { error: { name: error.name, message: error.message } }),
    };

    const message = `API: ${method} ${service}${endpoint} - ${statusCode}`;
    
    if (statusCode >= 400) {
      logger.warn(message, meta);
    } else {
      logger.debug(message, meta);
    }
  },

  logCacheOperation: (
    operation: 'get' | 'set' | 'delete' | 'clear',
    key: string,
    hit?: boolean,
    ttl?: number
  ) => {
    const meta = {
      cache: true,
      operation,
      key,
      ...(hit !== undefined && { hit }),
      ...(ttl !== undefined && { ttl }),
    };

    logger.debug(`CACHE: ${operation} ${key}`, meta);
  },
};