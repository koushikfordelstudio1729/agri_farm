"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERROR_MESSAGES = exports.createErrorContext = exports.isRateLimitError = exports.isNotFoundError = exports.isAuthorizationError = exports.isAuthenticationError = exports.isValidationError = exports.isOperationalError = exports.createConflictError = exports.createNotFoundError = exports.createAuthError = exports.createValidationError = exports.MaintenanceError = exports.PaymentError = exports.FileUploadError = exports.ExternalServiceError = exports.DatabaseError = exports.ServiceUnavailableError = exports.InternalServerError = exports.RateLimitError = exports.ConflictError = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.BadRequestError = exports.ValidationError = exports.BaseError = void 0;
class BaseError extends Error {
    name;
    statusCode;
    isOperational;
    context;
    constructor(name, statusCode, description, isOperational = true, context) {
        super(description);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = name;
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.context = context || undefined;
        Error.captureStackTrace(this);
    }
}
exports.BaseError = BaseError;
class ValidationError extends BaseError {
    errors;
    constructor(message, errors = {}, context) {
        super('ValidationError', 400, message, true, context);
        this.errors = errors;
    }
}
exports.ValidationError = ValidationError;
class BadRequestError extends BaseError {
    constructor(message = 'Bad request', context) {
        super('BadRequestError', 400, message, true, context);
    }
}
exports.BadRequestError = BadRequestError;
class AuthenticationError extends BaseError {
    constructor(message = 'Authentication failed', context) {
        super('AuthenticationError', 401, message, true, context);
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends BaseError {
    constructor(message = 'Access denied', context) {
        super('AuthorizationError', 403, message, true, context);
    }
}
exports.AuthorizationError = AuthorizationError;
class NotFoundError extends BaseError {
    constructor(message = 'Resource not found', context) {
        super('NotFoundError', 404, message, true, context);
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends BaseError {
    constructor(message = 'Resource already exists', context) {
        super('ConflictError', 409, message, true, context);
    }
}
exports.ConflictError = ConflictError;
class RateLimitError extends BaseError {
    retryAfter;
    constructor(message = 'Rate limit exceeded', retryAfter = 60, context) {
        super('RateLimitError', 429, message, true, context);
        this.retryAfter = retryAfter;
    }
}
exports.RateLimitError = RateLimitError;
class InternalServerError extends BaseError {
    constructor(message = 'Internal server error', context) {
        super('InternalServerError', 500, message, false, context);
    }
}
exports.InternalServerError = InternalServerError;
class ServiceUnavailableError extends BaseError {
    constructor(message = 'Service unavailable', context) {
        super('ServiceUnavailableError', 503, message, true, context);
    }
}
exports.ServiceUnavailableError = ServiceUnavailableError;
class DatabaseError extends BaseError {
    constructor(message = 'Database error', context) {
        super('DatabaseError', 500, message, false, context);
    }
}
exports.DatabaseError = DatabaseError;
class ExternalServiceError extends BaseError {
    service;
    originalError;
    constructor(service, message = 'External service error', originalError, context) {
        super('ExternalServiceError', 502, message, true, context);
        this.service = service;
        this.originalError = originalError || undefined;
    }
}
exports.ExternalServiceError = ExternalServiceError;
class FileUploadError extends BaseError {
    constructor(message = 'File upload failed', context) {
        super('FileUploadError', 400, message, true, context);
    }
}
exports.FileUploadError = FileUploadError;
class PaymentError extends BaseError {
    paymentProvider;
    transactionId;
    constructor(message = 'Payment processing failed', paymentProvider, transactionId, context) {
        super('PaymentError', 402, message, true, context);
        this.paymentProvider = paymentProvider || undefined;
        this.transactionId = transactionId || undefined;
    }
}
exports.PaymentError = PaymentError;
class MaintenanceError extends BaseError {
    estimatedDuration;
    constructor(message = 'System under maintenance', estimatedDuration, context) {
        super('MaintenanceError', 503, message, true, context);
        this.estimatedDuration = estimatedDuration || undefined;
    }
}
exports.MaintenanceError = MaintenanceError;
// Error factory functions
const createValidationError = (message, field, value, context) => {
    return new ValidationError(message, { [field]: [message] }, context);
};
exports.createValidationError = createValidationError;
const createAuthError = (message, context) => {
    return new AuthenticationError(message, context);
};
exports.createAuthError = createAuthError;
const createNotFoundError = (resource, identifier, context) => {
    const message = identifier
        ? `${resource} with identifier '${identifier}' not found`
        : `${resource} not found`;
    return new NotFoundError(message, context);
};
exports.createNotFoundError = createNotFoundError;
const createConflictError = (resource, field, value, context) => {
    const message = `${resource} with ${field} '${value}' already exists`;
    return new ConflictError(message, context);
};
exports.createConflictError = createConflictError;
// Error type guards
const isOperationalError = (error) => {
    return error instanceof BaseError && error.isOperational;
};
exports.isOperationalError = isOperationalError;
const isValidationError = (error) => {
    return error instanceof ValidationError;
};
exports.isValidationError = isValidationError;
const isAuthenticationError = (error) => {
    return error instanceof AuthenticationError;
};
exports.isAuthenticationError = isAuthenticationError;
const isAuthorizationError = (error) => {
    return error instanceof AuthorizationError;
};
exports.isAuthorizationError = isAuthorizationError;
const isNotFoundError = (error) => {
    return error instanceof NotFoundError;
};
exports.isNotFoundError = isNotFoundError;
const isRateLimitError = (error) => {
    return error instanceof RateLimitError;
};
exports.isRateLimitError = isRateLimitError;
// Error context helpers
const createErrorContext = (req) => {
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
exports.createErrorContext = createErrorContext;
// Common error messages
exports.ERROR_MESSAGES = {
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
};
//# sourceMappingURL=errors.js.map