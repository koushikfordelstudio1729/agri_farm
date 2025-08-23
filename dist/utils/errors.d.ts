import { AppError, ErrorContext } from '@/types';
export declare class BaseError extends Error implements AppError {
    readonly name: string;
    readonly statusCode: number;
    readonly isOperational: boolean;
    readonly context?: ErrorContext;
    constructor(name: string, statusCode: number, description: string, isOperational?: boolean, context?: ErrorContext);
}
export declare class ValidationError extends BaseError {
    readonly errors: Record<string, string[]>;
    constructor(message: string, errors?: Record<string, string[]>, context?: ErrorContext);
}
export declare class BadRequestError extends BaseError {
    constructor(message?: string, context?: ErrorContext);
}
export declare class AuthenticationError extends BaseError {
    constructor(message?: string, context?: ErrorContext);
}
export declare class AuthorizationError extends BaseError {
    constructor(message?: string, context?: ErrorContext);
}
export declare class NotFoundError extends BaseError {
    constructor(message?: string, context?: ErrorContext);
}
export declare class ConflictError extends BaseError {
    constructor(message?: string, context?: ErrorContext);
}
export declare class RateLimitError extends BaseError {
    readonly retryAfter: number;
    constructor(message?: string, retryAfter?: number, context?: ErrorContext);
}
export declare class InternalServerError extends BaseError {
    constructor(message?: string, context?: ErrorContext);
}
export declare class ServiceUnavailableError extends BaseError {
    constructor(message?: string, context?: ErrorContext);
}
export declare class DatabaseError extends BaseError {
    constructor(message?: string, context?: ErrorContext);
}
export declare class ExternalServiceError extends BaseError {
    readonly service: string;
    readonly originalError?: Error;
    constructor(service: string, message?: string, originalError?: Error, context?: ErrorContext);
}
export declare class FileUploadError extends BaseError {
    constructor(message?: string, context?: ErrorContext);
}
export declare class PaymentError extends BaseError {
    readonly paymentProvider?: string;
    readonly transactionId?: string;
    constructor(message?: string, paymentProvider?: string, transactionId?: string, context?: ErrorContext);
}
export declare class MaintenanceError extends BaseError {
    readonly estimatedDuration?: number;
    constructor(message?: string, estimatedDuration?: number, context?: ErrorContext);
}
export declare const createValidationError: (message: string, field: string, value?: unknown, context?: ErrorContext) => ValidationError;
export declare const createAuthError: (message?: string, context?: ErrorContext) => AuthenticationError;
export declare const createNotFoundError: (resource: string, identifier?: string, context?: ErrorContext) => NotFoundError;
export declare const createConflictError: (resource: string, field: string, value: string, context?: ErrorContext) => ConflictError;
export declare const isOperationalError: (error: Error) => error is BaseError;
export declare const isValidationError: (error: Error) => error is ValidationError;
export declare const isAuthenticationError: (error: Error) => error is AuthenticationError;
export declare const isAuthorizationError: (error: Error) => error is AuthorizationError;
export declare const isNotFoundError: (error: Error) => error is NotFoundError;
export declare const isRateLimitError: (error: Error) => error is RateLimitError;
export declare const createErrorContext: (req?: {
    user?: {
        id: string;
    };
    ip?: string;
    headers?: {
        "user-agent"?: string;
    };
    id?: string;
    originalUrl?: string;
    method?: string;
}) => ErrorContext;
export declare const ERROR_MESSAGES: {
    readonly AUTH: {
        readonly INVALID_CREDENTIALS: "Invalid email or password";
        readonly ACCOUNT_LOCKED: "Account is temporarily locked due to too many failed login attempts";
        readonly EMAIL_NOT_VERIFIED: "Please verify your email address";
        readonly PHONE_NOT_VERIFIED: "Please verify your phone number";
        readonly TOKEN_INVALID: "Invalid or expired token";
        readonly TOKEN_REQUIRED: "Authentication token is required";
        readonly INSUFFICIENT_PERMISSIONS: "Insufficient permissions to access this resource";
        readonly PASSWORD_RESET_REQUIRED: "Password reset is required";
    };
    readonly USER: {
        readonly NOT_FOUND: "User not found";
        readonly EMAIL_EXISTS: "Email address is already registered";
        readonly PHONE_EXISTS: "Phone number is already registered";
        readonly INVALID_EMAIL: "Please provide a valid email address";
        readonly INVALID_PHONE: "Please provide a valid phone number";
        readonly WEAK_PASSWORD: "Password must be at least 8 characters with uppercase, lowercase, number, and special character";
    };
    readonly VALIDATION: {
        readonly REQUIRED_FIELD: "This field is required";
        readonly INVALID_FORMAT: "Invalid format";
        readonly TOO_SHORT: "Value is too short";
        readonly TOO_LONG: "Value is too long";
        readonly OUT_OF_RANGE: "Value is out of range";
        readonly INVALID_EMAIL: "Please provide a valid email address";
        readonly INVALID_PHONE: "Please provide a valid phone number";
        readonly INVALID_DATE: "Please provide a valid date";
        readonly INVALID_URL: "Please provide a valid URL";
    };
    readonly FILE: {
        readonly TOO_LARGE: "File size is too large";
        readonly INVALID_TYPE: "Invalid file type";
        readonly UPLOAD_FAILED: "File upload failed";
        readonly NOT_FOUND: "File not found";
        readonly PROCESSING_FAILED: "File processing failed";
    };
    readonly RATE_LIMIT: {
        readonly TOO_MANY_REQUESTS: "Too many requests, please try again later";
        readonly API_QUOTA_EXCEEDED: "API quota exceeded";
    };
    readonly SYSTEM: {
        readonly INTERNAL_ERROR: "An internal error occurred";
        readonly SERVICE_UNAVAILABLE: "Service is temporarily unavailable";
        readonly MAINTENANCE: "System is under maintenance";
        readonly DATABASE_ERROR: "Database operation failed";
    };
};
//# sourceMappingURL=errors.d.ts.map