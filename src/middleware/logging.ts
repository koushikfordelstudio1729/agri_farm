import { Request, Response, NextFunction } from 'express';
import logger, { loggerUtils } from '@/utils/logger';
import performanceMonitor from '@/utils/performance';
import { securityUtils } from '@/utils/security';

export interface LoggingOptions {
  logRequests?: boolean;
  logResponses?: boolean;
  logErrors?: boolean;
  logPerformance?: boolean;
  logSecurity?: boolean;
  excludePaths?: string[];
  includeSensitiveData?: boolean;
  customFormat?: (req: Request, res: Response, responseTime: number) => string;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export interface RequestLogData {
  method: string;
  url: string;
  query: Record<string, any>;
  headers: Record<string, string>;
  body?: any;
  ip: string;
  userAgent: string;
  userId?: string;
  requestId: string;
  timestamp: string;
}

export interface ResponseLogData {
  statusCode: number;
  headers: Record<string, any>;
  body?: any;
  responseTime: number;
  contentLength?: number;
}

class LoggingMiddleware {
  // Request/Response logging middleware
  static requestResponse(options: LoggingOptions = {}) {
    const {
      logRequests = true,
      logResponses = true,
      logPerformance = true,
      excludePaths = ['/health', '/metrics', '/favicon.ico'],
      includeSensitiveData = false,
      logLevel = 'info',
    } = options;

    return (req: Request, res: Response, next: NextFunction): void => {
      const startTime = Date.now();
      const requestId = (req as any).id || this.generateRequestId();
      
      // Add request ID to request object
      (req as any).id = requestId;

      // Skip logging for excluded paths
      if (excludePaths.some(path => req.path.includes(path))) {
        return next();
      }

      // Log incoming request
      if (logRequests) {
        const requestLog: RequestLogData = {
          method: req.method,
          url: req.originalUrl || req.url,
          query: req.query,
          headers: this.sanitizeHeaders(req.headers, includeSensitiveData),
          body: includeSensitiveData ? req.body : this.sanitizeBody(req.body),
          ip: securityUtils.extractClientInfo(req).ip,
          userAgent: req.headers['user-agent'] || 'unknown',
          userId: (req as any).user?.id,
          requestId,
          timestamp: new Date().toISOString(),
        };

        logger[logLevel]('Incoming request', requestLog);
      }

      // Performance monitoring
      if (logPerformance) {
        performanceMonitor.startTimer(`http.request.${req.method.toLowerCase()}`, {
          endpoint: req.route?.path || req.path,
          method: req.method,
          status: '200', // Default status, will be updated on finish
        });
      }

      // Capture original response methods
      const originalSend = res.send;
      const originalJson = res.json;
      let responseBody: any;

      // Override res.send to capture response body
      res.send = function(body: any) {
        responseBody = body;
        return originalSend.call(this, body);
      };

      // Override res.json to capture response body
      res.json = function(body: any) {
        responseBody = body;
        return originalJson.call(this, body);
      };

      // Log response on finish
      res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        
        // Performance monitoring
        if (logPerformance) {
          try {
            performanceMonitor.endTimer(`http.request.${req.method.toLowerCase()}`, {
              endpoint: req.route?.path || req.path,
              method: req.method,
              status: '200', // Use same status as start to match key
            });
          } catch (timerError) {
            // Timer might not exist, skip performance monitoring for this request
            console.warn('Performance timer error:', timerError.message);
          }

          // Record metrics
          performanceMonitor.recordValue('http.response_time', responseTime, {
            method: req.method,
            endpoint: req.route?.path || req.path,
            status_code: res.statusCode.toString(),
          });

          performanceMonitor.incrementCounter('http.requests_total', 1, {
            method: req.method,
            status_code: res.statusCode.toString(),
          });
        }

        // Log response
        if (logResponses) {
          const responseLog: ResponseLogData = {
            statusCode: res.statusCode,
            headers: this.sanitizeHeaders(res.getHeaders(), includeSensitiveData),
            body: includeSensitiveData ? responseBody : this.sanitizeResponseBody(responseBody),
            responseTime,
            contentLength: res.get('content-length') ? parseInt(res.get('content-length')!, 10) : undefined,
          };

          const logMethod = res.statusCode >= 400 ? 'warn' : logLevel;
          logger[logMethod]('Outgoing response', {
            requestId,
            request: {
              method: req.method,
              url: req.originalUrl,
            },
            response: responseLog,
          });
        }

        // Business metrics logging
        this.logBusinessMetrics(req, res, responseTime);
      });

      next();
    };
  }

  // Error logging middleware
  static errorLogging() {
    return (error: any, req: Request, res: Response, next: NextFunction): void => {
      const requestId = (req as any).id || this.generateRequestId();
      
      const errorLog = {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          statusCode: error.statusCode || 500,
        },
        request: {
          id: requestId,
          method: req.method,
          url: req.originalUrl,
          headers: this.sanitizeHeaders(req.headers, false),
          body: this.sanitizeBody(req.body),
          query: req.query,
          params: req.params,
          ip: securityUtils.extractClientInfo(req).ip,
          userAgent: req.headers['user-agent'],
          userId: (req as any).user?.id,
        },
        timestamp: new Date().toISOString(),
      };

      // Log different error types with appropriate levels
      if (error.statusCode && error.statusCode < 500) {
        logger.warn('Client error', errorLog);
      } else {
        logger.error('Server error', errorLog);
      }

      // Log security events
      if (error.name?.includes('Security') || error.name?.includes('Auth')) {
        logger.logSecurityEvent(
          error.name,
          error.statusCode >= 500 ? 'high' : 'medium',
          {
            error: error.message,
            ip: securityUtils.extractClientInfo(req).ip,
            userAgent: req.headers['user-agent'],
            endpoint: req.originalUrl,
            userId: (req as any).user?.id,
          }
        );
      }

      next(error);
    };
  }

  // Security event logging
  static securityLogging() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const clientInfo = securityUtils.extractClientInfo(req);
      
      // Log suspicious patterns
      const suspiciousPatterns = [
        /\.\.\//g,  // Path traversal
        /<script/gi, // XSS attempts
        /union.*select/gi, // SQL injection
        /javascript:/gi, // JavaScript injection
      ];

      const fullUrl = req.originalUrl;
      const bodyString = JSON.stringify(req.body || {});
      
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(fullUrl) || pattern.test(bodyString)) {
          logger.logSecurityEvent(
            'suspicious_pattern_detected',
            'medium',
            {
              pattern: pattern.source,
              url: req.originalUrl,
              method: req.method,
              ip: clientInfo.ip,
              userAgent: clientInfo.userAgent,
              userId: (req as any).user?.id,
            }
          );
          break;
        }
      }

      // Log failed authentication attempts
      if (req.path.includes('auth') || req.path.includes('login')) {
        res.on('finish', () => {
          if (res.statusCode === 401 || res.statusCode === 403) {
            logger.logSecurityEvent(
              'authentication_failed',
              'medium',
              {
                endpoint: req.originalUrl,
                method: req.method,
                statusCode: res.statusCode,
                ip: clientInfo.ip,
                userAgent: clientInfo.userAgent,
              }
            );
          }
        });
      }

      next();
    };
  }

  // Audit logging for sensitive operations
  static auditLogging(sensitiveOperations: string[] = []) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const isSensitiveOperation = sensitiveOperations.some(op => 
        req.path.includes(op) || req.method === 'DELETE'
      );

      if (!isSensitiveOperation) {
        return next();
      }

      const user = (req as any).user;
      const clientInfo = securityUtils.extractClientInfo(req);
      
      // Log before operation
      logger.logAuditEvent(
        `${req.method.toLowerCase()}_${req.path.replace(/\//g, '_')}`,
        user?.id || 'anonymous',
        req.path,
        {
          method: req.method,
          params: req.params,
          query: req.query,
          body: this.sanitizeBody(req.body),
          ip: clientInfo.ip,
          userAgent: clientInfo.userAgent,
        }
      );

      // Log after operation
      res.on('finish', () => {
        logger.logAuditEvent(
          `${req.method.toLowerCase()}_${req.path.replace(/\//g, '_')}_completed`,
          user?.id || 'anonymous',
          req.path,
          {
            statusCode: res.statusCode,
            success: res.statusCode < 400,
            responseTime: Date.now() - (res as any).startTime,
          }
        );
      });

      next();
    };
  }

  // Database operation logging
  static databaseLogging() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const originalQuery = (req as any).db?.query;
      
      if (originalQuery) {
        (req as any).db.query = function(query: string, params: any[], callback: Function) {
          const startTime = Date.now();
          
          return originalQuery.call(this, query, params, (error: any, result: any) => {
            const duration = Date.now() - startTime;
            
            loggerUtils.logDatabaseOperation(
              'query',
              'unknown', // Would need to extract from query
              duration,
              !error,
              error
            );

            if (callback) {
              callback(error, result);
            }
          });
        };
      }

      next();
    };
  }

  // Custom structured logging
  static structured(logFunction: (data: any) => void) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const startTime = Date.now();
      
      res.on('finish', () => {
        const logData = {
          timestamp: new Date().toISOString(),
          request: {
            id: (req as any).id,
            method: req.method,
            url: req.originalUrl,
            headers: this.sanitizeHeaders(req.headers, false),
            ip: securityUtils.extractClientInfo(req).ip,
            userAgent: req.headers['user-agent'],
            userId: (req as any).user?.id,
          },
          response: {
            statusCode: res.statusCode,
            responseTime: Date.now() - startTime,
          },
        };

        logFunction(logData);
      });

      next();
    };
  }

  // Private helper methods
  private static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static sanitizeHeaders(headers: any, includeSensitive: boolean): Record<string, string> {
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
      'x-access-token',
    ];

    const sanitized: Record<string, string> = {};
    
    Object.entries(headers).forEach(([key, value]) => {
      const lowerKey = key.toLowerCase();
      if (!includeSensitive && sensitiveHeaders.includes(lowerKey)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = String(value);
      }
    });

    return sanitized;
  }

  private static sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'authorization',
      'creditCard',
      'ssn',
      'socialSecurityNumber',
    ];

    const sanitized: any = Array.isArray(body) ? [] : {};

    Object.entries(body).forEach(([key, value]) => {
      const lowerKey = key.toLowerCase();
      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeBody(value);
      } else {
        sanitized[key] = value;
      }
    });

    return sanitized;
  }

  private static sanitizeResponseBody(body: any): any {
    // For responses, we're more conservative about what to log
    if (!body || typeof body !== 'object') {
      return typeof body === 'string' && body.length > 1000 ? '[TRUNCATED]' : body;
    }

    if (Array.isArray(body)) {
      return `[Array with ${body.length} items]`;
    }

    // For objects, only log basic structure
    return Object.keys(body).reduce((acc: any, key) => {
      const value = body[key];
      if (typeof value === 'object' && value !== null) {
        acc[key] = '[Object]';
      } else if (typeof value === 'string' && value.length > 100) {
        acc[key] = '[Long String]';
      } else {
        acc[key] = value;
      }
      return acc;
    }, {});
  }

  private static logBusinessMetrics(req: Request, res: Response, responseTime: number): void {
    // Log business-specific metrics
    const path = req.route?.path || req.path;
    const method = req.method;
    const status = res.statusCode;
    const userId = (req as any).user?.id;

    // API endpoint usage
    if (path.startsWith('/api/')) {
      logger.logBusinessEvent('api_endpoint_usage', {
        endpoint: path,
        method,
        status,
        responseTime,
        userId,
      });
    }

    // User actions
    if (userId) {
      const actionMap: Record<string, string> = {
        'POST /api/crops': 'crop_created',
        'POST /api/diagnosis': 'diagnosis_requested',
        'POST /api/treatments': 'treatment_added',
        'GET /api/market-prices': 'market_data_accessed',
      };

      const action = actionMap[`${method} ${path}`];
      if (action) {
        logger.logBusinessEvent(action, {
          userId,
          endpoint: path,
          responseTime,
          success: status < 400,
        });
      }
    }

    // Performance alerts
    if (responseTime > 5000) {
      logger.logPerformanceMetric(
        'slow_request',
        responseTime,
        'ms',
        {
          endpoint: path,
          method,
          status: status.toString(),
        }
      );
    }
  }
}

export default LoggingMiddleware;