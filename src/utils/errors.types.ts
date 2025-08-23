// Error type definitions for the application

export interface AppError extends Error {
  name: string;
  statusCode: number;
  isOperational: boolean;
  context?: ErrorContext;
}

export interface ErrorContext {
  userId?: string;
  ip?: string;
  userAgent?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  timestamp: Date;
  additionalData?: Record<string, unknown>;
}

export interface ValidationErrorDetail {
  field: string;
  value: unknown;
  message: string;
  constraint?: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    name: string;
    message: string;
    statusCode: number;
    code?: string;
    details?: ValidationErrorDetail[] | Record<string, unknown>;
    context?: Partial<ErrorContext>;
    stack?: string;
  };
  timestamp: string;
  requestId?: string;
}

export interface ErrorLogEntry {
  level: 'error' | 'warn' | 'info';
  message: string;
  error: {
    name: string;
    message: string;
    stack?: string;
    statusCode: number;
    isOperational: boolean;
  };
  context: ErrorContext;
  timestamp: Date;
  environment: string;
  version?: string;
}

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ErrorNotificationConfig {
  severity: ErrorSeverity;
  notifyChannels: Array<'email' | 'slack' | 'sms' | 'webhook'>;
  threshold?: number; // number of occurrences before notification
  timeWindow?: number; // time window in minutes for threshold
  cooldown?: number; // cooldown period in minutes before next notification
}

export interface BusinessLogicError extends AppError {
  businessRule: string;
  expectedValue?: unknown;
  actualValue?: unknown;
  suggestions?: string[];
}

export interface ExternalAPIError extends AppError {
  service: string;
  endpoint?: string;
  statusCode: number;
  responseBody?: string;
  retryable: boolean;
  retryAfter?: number;
}

export interface DatabaseOperationError extends AppError {
  operation: 'create' | 'read' | 'update' | 'delete' | 'query';
  collection?: string;
  query?: Record<string, unknown>;
  constraint?: string;
}

export interface FileOperationError extends AppError {
  operation: 'upload' | 'download' | 'delete' | 'process' | 'validate';
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  allowedTypes?: string[];
  maxSize?: number;
}

export interface AuthenticationFailureReason {
  type: 'invalid_credentials' | 'account_locked' | 'email_not_verified' | 'phone_not_verified' | 'token_expired' | 'token_invalid' | 'session_expired';
  attemptsRemaining?: number;
  lockoutDuration?: number;
  verificationRequired?: boolean;
}

export interface ValidationRule {
  field: string;
  rules: Array<{
    type: 'required' | 'email' | 'phone' | 'length' | 'pattern' | 'range' | 'custom';
    value?: unknown;
    message: string;
    validator?: (value: unknown) => boolean;
  }>;
}

export interface ErrorMetrics {
  errorRate: number;
  errorCount: number;
  errorTypes: Record<string, number>;
  topErrors: Array<{
    name: string;
    count: number;
    percentage: number;
  }>;
  responseTimeImpact: number;
  userImpact: number;
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface ErrorHandlerConfig {
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  enableStackTrace: boolean;
  enableErrorReporting: boolean;
  enableMetrics: boolean;
  sanitizeOutput: boolean;
  includeRequestDetails: boolean;
  notificationConfig: Record<string, ErrorNotificationConfig>;
}

export type ErrorHandler = (error: Error, context?: ErrorContext) => void;
export type ErrorReporter = (error: AppError, context: ErrorContext) => Promise<void>;
export type ErrorTransformer = (error: Error) => AppError;
export type ErrorFilter = (error: Error) => boolean;