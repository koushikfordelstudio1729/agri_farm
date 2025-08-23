import { Request, Response, NextFunction } from 'express';
import { 
  BaseError, 
  ValidationError, 
  AuthenticationError, 
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  FileUploadError,
  ExternalServiceError,
  DatabaseError,
  isOperationalError,
  createErrorContext,
  ErrorResponse 
} from '@/utils/errors';
import logger from '@/utils/logger';
import { isProduction, isDevelopment } from '@/utils/helpers';
import performanceMonitor from '@/utils/performance';

export interface ErrorMiddlewareOptions {
  includeStackTrace?: boolean;
  logErrors?: boolean;
  enableMetrics?: boolean;
  sanitizeErrors?: boolean;
  customErrorHandler?: (error: any, req: Request, res: Response) => ErrorResponse | null;
}

class ErrorMiddleware {
  // Main error handling middleware
  static handler(options: ErrorMiddlewareOptions = {}) {
    const {
      includeStackTrace = isDevelopment(),
      logErrors = true,
      enableMetrics = true,
      sanitizeErrors = isProduction(),
      customErrorHandler,
    } = options;

    return (error: any, req: Request, res: Response, next: NextFunction): void => {
      const requestId = (req as any).id || 'unknown';
      const context = createErrorContext(req);

      // Try custom error handler first
      if (customErrorHandler) {
        const customResponse = customErrorHandler(error, req, res);
        if (customResponse) {
          res.status(customResponse.error.statusCode).json(customResponse);
          return;
        }
      }

      // Log error if enabled
      if (logErrors) {
        logger.logError(error, context);
      }

      // Record error metrics
      if (enableMetrics) {
        performanceMonitor.incrementCounter('errors_total', 1, {
          type: error.constructor.name,
          statusCode: this.getStatusCode(error).toString(),
          endpoint: req.route?.path || req.path,
        });
      }

      // Handle different error types
      let errorResponse: ErrorResponse;

      if (error instanceof ValidationError) {
        errorResponse = this.handleValidationError(error, requestId, includeStackTrace);
      } else if (error instanceof AuthenticationError) {
        errorResponse = this.handleAuthenticationError(error, requestId, includeStackTrace);
      } else if (error instanceof AuthorizationError) {
        errorResponse = this.handleAuthorizationError(error, requestId, includeStackTrace);
      } else if (error instanceof NotFoundError) {
        errorResponse = this.handleNotFoundError(error, requestId, includeStackTrace);
      } else if (error instanceof RateLimitError) {
        errorResponse = this.handleRateLimitError(error, req, res, requestId, includeStackTrace);
      } else if (error instanceof FileUploadError) {
        errorResponse = this.handleFileUploadError(error, requestId, includeStackTrace);
      } else if (error instanceof ExternalServiceError) {
        errorResponse = this.handleExternalServiceError(error, requestId, includeStackTrace);
      } else if (error instanceof DatabaseError) {
        errorResponse = this.handleDatabaseError(error, requestId, includeStackTrace, sanitizeErrors);
      } else if (error.name === 'CastError') {
        errorResponse = this.handleCastError(error, requestId, includeStackTrace);
      } else if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        errorResponse = this.handleMongoError(error, requestId, includeStackTrace, sanitizeErrors);
      } else if (error.name === 'JsonWebTokenError') {
        errorResponse = this.handleJWTError(error, requestId, includeStackTrace);
      } else if (error.name === 'SyntaxError') {
        errorResponse = this.handleSyntaxError(error, requestId, includeStackTrace);
      } else {
        errorResponse = this.handleGenericError(error, requestId, includeStackTrace, sanitizeErrors);
      }

      // Sanitize error response in production
      if (sanitizeErrors && !isOperationalError(error)) {
        errorResponse = this.sanitizeErrorResponse(errorResponse);
      }

      // Send error response
      const statusCode = errorResponse.error.statusCode || 500;
      res.status(statusCode).json(errorResponse);
    };
  }

  // 404 Not Found handler
  static notFoundHandler() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const error = new NotFoundError(
        `Route ${req.method} ${req.originalUrl} not found`,
        createErrorContext(req)
      );
      next(error);
    };
  }

  // Async error wrapper
  static asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
    return (req: Request, res: Response, next: NextFunction): void => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  // Validation error handler
  static validationErrorHandler() {
    return (error: any, req: Request, res: Response, next: NextFunction): void => {
      // Handle Joi validation errors
      if (error.isJoi) {
        const validationError = new ValidationError(
          'Validation failed',
          this.formatJoiErrors(error),
          createErrorContext(req)
        );
        return next(validationError);
      }

      // Handle Mongoose validation errors
      if (error.name === 'ValidationError' && error.errors) {
        const validationError = new ValidationError(
          'Validation failed',
          this.formatMongooseErrors(error),
          createErrorContext(req)
        );
        return next(validationError);
      }

      next(error);
    };
  }

  // Unhandled promise rejection handler
  static unhandledRejectionHandler() {
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      logger.error('Unhandled Promise Rejection', {
        reason: reason?.message || reason,
        stack: reason?.stack,
        promise: promise.toString(),
      });

      // Gracefully close the server
      if (!isProduction()) {
        process.exit(1);
      }
    });
  }

  // Uncaught exception handler
  static uncaughtExceptionHandler() {
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });

      // Gracefully close the server
      process.exit(1);
    });
  }

  // Private error handling methods
  private static handleValidationError(
    error: ValidationError, 
    requestId: string, 
    includeStack: boolean
  ): ErrorResponse {
    return {
      success: false,
      error: {
        name: error.name,
        message: error.message,
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        details: error.errors,
        ...(includeStack && { stack: error.stack }),
      },
      timestamp: new Date().toISOString(),
      requestId,
    };
  }

  private static handleAuthenticationError(
    error: AuthenticationError, 
    requestId: string, 
    includeStack: boolean
  ): ErrorResponse {
    return {
      success: false,
      error: {
        name: error.name,
        message: error.message,
        statusCode: 401,
        code: 'AUTHENTICATION_ERROR',
        ...(includeStack && { stack: error.stack }),
      },
      timestamp: new Date().toISOString(),
      requestId,
    };
  }

  private static handleAuthorizationError(
    error: AuthorizationError, 
    requestId: string, 
    includeStack: boolean
  ): ErrorResponse {
    return {
      success: false,
      error: {
        name: error.name,
        message: error.message,
        statusCode: 403,
        code: 'AUTHORIZATION_ERROR',
        ...(includeStack && { stack: error.stack }),
      },
      timestamp: new Date().toISOString(),
      requestId,
    };
  }

  private static handleNotFoundError(
    error: NotFoundError, 
    requestId: string, 
    includeStack: boolean
  ): ErrorResponse {
    return {
      success: false,
      error: {
        name: error.name,
        message: error.message,
        statusCode: 404,
        code: 'NOT_FOUND',
        ...(includeStack && { stack: error.stack }),
      },
      timestamp: new Date().toISOString(),
      requestId,
    };
  }

  private static handleRateLimitError(
    error: RateLimitError, 
    req: Request,
    res: Response,
    requestId: string, 
    includeStack: boolean
  ): ErrorResponse {
    res.set('Retry-After', error.retryAfter.toString());
    
    return {
      success: false,
      error: {
        name: error.name,
        message: error.message,
        statusCode: 429,
        code: 'RATE_LIMIT_EXCEEDED',
        details: { retryAfter: error.retryAfter },
        ...(includeStack && { stack: error.stack }),
      },
      timestamp: new Date().toISOString(),
      requestId,
    };
  }

  private static handleFileUploadError(
    error: FileUploadError, 
    requestId: string, 
    includeStack: boolean
  ): ErrorResponse {
    return {
      success: false,
      error: {
        name: error.name,
        message: error.message,
        statusCode: 400,
        code: 'FILE_UPLOAD_ERROR',
        ...(includeStack && { stack: error.stack }),
      },
      timestamp: new Date().toISOString(),
      requestId,
    };
  }

  private static handleExternalServiceError(
    error: ExternalServiceError, 
    requestId: string, 
    includeStack: boolean
  ): ErrorResponse {
    return {
      success: false,
      error: {
        name: error.name,
        message: error.message,
        statusCode: 502,
        code: 'EXTERNAL_SERVICE_ERROR',
        details: { service: error.service },
        ...(includeStack && { stack: error.stack }),
      },
      timestamp: new Date().toISOString(),
      requestId,
    };
  }

  private static handleDatabaseError(
    error: DatabaseError, 
    requestId: string, 
    includeStack: boolean,
    sanitize: boolean
  ): ErrorResponse {
    const message = sanitize ? 'Database operation failed' : error.message;
    
    return {
      success: false,
      error: {
        name: 'DatabaseError',
        message,
        statusCode: 500,
        code: 'DATABASE_ERROR',
        ...(includeStack && !sanitize && { stack: error.stack }),
      },
      timestamp: new Date().toISOString(),
      requestId,
    };
  }

  private static handleCastError(error: any, requestId: string, includeStack: boolean): ErrorResponse {
    return {
      success: false,
      error: {
        name: 'ValidationError',
        message: `Invalid ${error.path}: ${error.value}`,
        statusCode: 400,
        code: 'INVALID_ID',
        ...(includeStack && { stack: error.stack }),
      },
      timestamp: new Date().toISOString(),
      requestId,
    };
  }

  private static handleMongoError(
    error: any, 
    requestId: string, 
    includeStack: boolean,
    sanitize: boolean
  ): ErrorResponse {
    let message = 'Database operation failed';
    let code = 'DATABASE_ERROR';

    if (!sanitize) {
      if (error.code === 11000) {
        message = 'Duplicate field value entered';
        code = 'DUPLICATE_FIELD';
      } else {
        message = error.message;
      }
    }

    return {
      success: false,
      error: {
        name: 'DatabaseError',
        message,
        statusCode: 400,
        code,
        ...(includeStack && !sanitize && { stack: error.stack }),
      },
      timestamp: new Date().toISOString(),
      requestId,
    };
  }

  private static handleJWTError(error: any, requestId: string, includeStack: boolean): ErrorResponse {
    let message = 'Invalid token';
    
    if (error.name === 'TokenExpiredError') {
      message = 'Token has expired';
    } else if (error.name === 'JsonWebTokenError') {
      message = 'Invalid token';
    }

    return {
      success: false,
      error: {
        name: 'AuthenticationError',
        message,
        statusCode: 401,
        code: 'INVALID_TOKEN',
        ...(includeStack && { stack: error.stack }),
      },
      timestamp: new Date().toISOString(),
      requestId,
    };
  }

  private static handleSyntaxError(error: any, requestId: string, includeStack: boolean): ErrorResponse {
    return {
      success: false,
      error: {
        name: 'ValidationError',
        message: 'Invalid JSON format in request body',
        statusCode: 400,
        code: 'INVALID_JSON',
        ...(includeStack && { stack: error.stack }),
      },
      timestamp: new Date().toISOString(),
      requestId,
    };
  }

  private static handleGenericError(
    error: any, 
    requestId: string, 
    includeStack: boolean,
    sanitize: boolean
  ): ErrorResponse {
    const statusCode = this.getStatusCode(error);
    const message = sanitize && statusCode >= 500 
      ? 'Internal server error' 
      : error.message || 'Something went wrong';

    return {
      success: false,
      error: {
        name: error.name || 'Error',
        message,
        statusCode,
        code: 'INTERNAL_ERROR',
        ...(includeStack && !sanitize && { stack: error.stack }),
      },
      timestamp: new Date().toISOString(),
      requestId,
    };
  }

  private static getStatusCode(error: any): number {
    if (error.statusCode) return error.statusCode;
    if (error.status) return error.status;
    return 500;
  }

  private static sanitizeErrorResponse(errorResponse: ErrorResponse): ErrorResponse {
    return {
      ...errorResponse,
      error: {
        ...errorResponse.error,
        message: 'Internal server error',
        stack: undefined,
      },
    };
  }

  private static formatJoiErrors(error: any): Record<string, string[]> {
    const errors: Record<string, string[]> = {};
    
    if (error.details) {
      error.details.forEach((detail: any) => {
        const key = detail.path.join('.');
        if (!errors[key]) {
          errors[key] = [];
        }
        errors[key].push(detail.message);
      });
    }

    return errors;
  }

  private static formatMongooseErrors(error: any): Record<string, string[]> {
    const errors: Record<string, string[]> = {};
    
    Object.values(error.errors).forEach((err: any) => {
      if (!errors[err.path]) {
        errors[err.path] = [];
      }
      errors[err.path].push(err.message);
    });

    return errors;
  }
}

export default ErrorMiddleware;