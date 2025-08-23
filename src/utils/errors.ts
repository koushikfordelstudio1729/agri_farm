import { AppError, ErrorContext } from '@/types';

export class BaseError extends Error implements AppError {
  public readonly name: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: ErrorContext;

  constructor(
    name: string,
    statusCode: number,
    description: string,
    isOperational: boolean = true,
    context?: ErrorContext
  ) {
    super(description);

    Object.setPrototypeOf(this, new.target.prototype);

    this.name = name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context || undefined;

    Error.captureStackTrace(this);
  }
}

export class ValidationError extends BaseError {
  public readonly errors: Record<string, string[]>;

  constructor(
    message: string,
    errors: Record<string, string[]> = {},
    context?: ErrorContext
  ) {
    super('ValidationError', 400, message, true, context);
    this.errors = errors;
  }
}

export class BadRequestError extends BaseError {
  constructor(message: string = 'Bad request', context?: ErrorContext) {
    super('BadRequestError', 400, message, true, context);
  }
}

export class AuthenticationError extends BaseError {
  constructor(message: string = 'Authentication failed', context?: ErrorContext) {
    super('AuthenticationError', 401, message, true, context);
  }
}

export class AuthorizationError extends BaseError {
  constructor(message: string = 'Access denied', context?: ErrorContext) {
    super('AuthorizationError', 403, message, true, context);
  }
}

export class NotFoundError extends BaseError {
  constructor(message: string = 'Resource not found', context?: ErrorContext) {
    super('NotFoundError', 404, message, true, context);
  }
}

export class ConflictError extends BaseError {
  constructor(message: string = 'Resource already exists', context?: ErrorContext) {
    super('ConflictError', 409, message, true, context);
  }
}

export class RateLimitError extends BaseError {
  public readonly retryAfter: number;

  constructor(
    message: string = 'Rate limit exceeded',
    retryAfter: number = 60,
    context?: ErrorContext
  ) {
    super('RateLimitError', 429, message, true, context);
    this.retryAfter = retryAfter;
  }
}

export class InternalServerError extends BaseError {
  constructor(message: string = 'Internal server error', context?: ErrorContext) {
    super('InternalServerError', 500, message, false, context);
  }
}

export class ServiceUnavailableError extends BaseError {
  constructor(message: string = 'Service unavailable', context?: ErrorContext) {
    super('ServiceUnavailableError', 503, message, true, context);
  }
}

export class DatabaseError extends BaseError {
  constructor(message: string = 'Database error', context?: ErrorContext) {
    super('DatabaseError', 500, message, false, context);
  }
}

export class ExternalServiceError extends BaseError {
  public readonly service: string;
  public readonly originalError?: Error;

  constructor(
    service: string,
    message: string = 'External service error',
    originalError?: Error,
    context?: ErrorContext
  ) {
    super('ExternalServiceError', 502, message, true, context);
    this.service = service;
    this.originalError = originalError || undefined;
  }
}

export class FileUploadError extends BaseError {
  constructor(message: string = 'File upload failed', context?: ErrorContext) {
    super('FileUploadError', 400, message, true, context);
  }
}

export class PaymentError extends BaseError {
  public readonly paymentProvider?: string;
  public readonly transactionId?: string;

  constructor(
    message: string = 'Payment processing failed',
    paymentProvider?: string,
    transactionId?: string,
    context?: ErrorContext
  ) {
    super('PaymentError', 402, message, true, context);
    this.paymentProvider = paymentProvider || undefined;
    this.transactionId = transactionId || undefined;
  }
}

export class MaintenanceError extends BaseError {
  public readonly estimatedDuration?: number;

  constructor(
    message: string = 'System under maintenance',
    estimatedDuration?: number,
    context?: ErrorContext
  ) {
    super('MaintenanceError', 503, message, true, context);
    this.estimatedDuration = estimatedDuration || undefined;
  }
}

// Error factory functions
export const createValidationError = (
  message: string,
  field: string,
  value?: unknown,
  context?: ErrorContext
): ValidationError => {
  return new ValidationError(message, { [field]: [message] }, context);
};

export const createAuthError = (
  message?: string,
  context?: ErrorContext
): AuthenticationError => {
  return new AuthenticationError(message, context);
};

export const createNotFoundError = (
  resource: string,
  identifier?: string,
  context?: ErrorContext
): NotFoundError => {
  const message = identifier
    ? `${resource} with identifier '${identifier}' not found`
    : `${resource} not found`;
  return new NotFoundError(message, context);
};

export const createConflictError = (
  resource: string,
  field: string,
  value: string,
  context?: ErrorContext
): ConflictError => {
  const message = `${resource} with ${field} '${value}' already exists`;
  return new ConflictError(message, context);
};

// Error type guards
export const isOperationalError = (error: Error): error is BaseError => {
  return error instanceof BaseError && error.isOperational;
};

export const isValidationError = (error: Error): error is ValidationError => {
  return error instanceof ValidationError;
};

export const isAuthenticationError = (error: Error): error is AuthenticationError => {
  return error instanceof AuthenticationError;
};

export const isAuthorizationError = (error: Error): error is AuthorizationError => {
  return error instanceof AuthorizationError;
};

export const isNotFoundError = (error: Error): error is NotFoundError => {
  return error instanceof NotFoundError;
};

export const isRateLimitError = (error: Error): error is RateLimitError => {
  return error instanceof RateLimitError;
};

// Error context helpers
export const createErrorContext = (
  req?: {
    user?: { id: string };
    ip?: string;
    headers?: { 'user-agent'?: string };
    id?: string;
    originalUrl?: string;
    method?: string;
  }
): ErrorContext => {
  return {
    userId: req?.user?.id || undefined,
    ip: req?.ip || undefined,
    userAgent: req?.headers?.['user-agent'] || undefined,
    requestId: req?.id || undefined,
    endpoint: req?.originalUrl || undefined,
    method: req?.method || undefined,
    timestamp: new Date(),
  };
};

// Common error messages
export const ERROR_MESSAGES = {
  AUTH: {
    INVALID_CREDENTIALS: 'Invalid email or password',
    ACCOUNT_LOCKED: 'Account is temporarily locked due to too many failed login attempts',
    EMAIL_NOT_VERIFIED: 'Please verify your email address',
    PHONE_NOT_VERIFIED: 'Please verify your phone number',
    TOKEN_INVALID: 'Invalid or expired token',
    TOKEN_REQUIRED: 'Authentication token is required',
    INSUFFICIENT_PERMISSIONS: 'Insufficient permissions to access this resource',
    PASSWORD_RESET_REQUIRED: 'Password reset is required',
  },
  USER: {
    NOT_FOUND: 'User not found',
    EMAIL_EXISTS: 'Email address is already registered',
    PHONE_EXISTS: 'Phone number is already registered',
    INVALID_EMAIL: 'Please provide a valid email address',
    INVALID_PHONE: 'Please provide a valid phone number',
    WEAK_PASSWORD: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
  },
  VALIDATION: {
    REQUIRED_FIELD: 'This field is required',
    INVALID_FORMAT: 'Invalid format',
    TOO_SHORT: 'Value is too short',
    TOO_LONG: 'Value is too long',
    OUT_OF_RANGE: 'Value is out of range',
    INVALID_EMAIL: 'Please provide a valid email address',
    INVALID_PHONE: 'Please provide a valid phone number',
    INVALID_DATE: 'Please provide a valid date',
    INVALID_URL: 'Please provide a valid URL',
  },
  FILE: {
    TOO_LARGE: 'File size is too large',
    INVALID_TYPE: 'Invalid file type',
    UPLOAD_FAILED: 'File upload failed',
    NOT_FOUND: 'File not found',
    PROCESSING_FAILED: 'File processing failed',
  },
  RATE_LIMIT: {
    TOO_MANY_REQUESTS: 'Too many requests, please try again later',
    API_QUOTA_EXCEEDED: 'API quota exceeded',
  },
  SYSTEM: {
    INTERNAL_ERROR: 'An internal error occurred',
    SERVICE_UNAVAILABLE: 'Service is temporarily unavailable',
    MAINTENANCE: 'System is under maintenance',
    DATABASE_ERROR: 'Database operation failed',
  },
} as const;