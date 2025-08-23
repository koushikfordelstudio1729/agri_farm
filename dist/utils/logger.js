"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.loggerHealthCheck = exports.sanitizeLogData = exports.logExpertConsultation = exports.logDiagnosisRequest = exports.logUserAction = exports.logCriticalError = exports.logApiCall = exports.logFileOperation = exports.logExternalService = exports.logDatabase = exports.logPerformance = exports.logSecurity = exports.logAuth = exports.logDebug = exports.logError = exports.logWarn = exports.logInfo = exports.requestLogger = void 0;
const winston_1 = __importDefault(require("winston"));
// Custom format for structured logging
const logFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS',
}), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json(), winston_1.default.format.printf(({ timestamp, level, message, ...meta }) => {
    const logObject = {
        timestamp,
        level: level.toUpperCase(),
        message,
        ...meta,
    };
    return JSON.stringify(logObject);
}));
// Create logger instance
const logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: {
        service: 'agri-farm-api',
        environment: process.env.NODE_ENV || 'development',
    },
    transports: [
        // Console transport for development
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple(), winston_1.default.format.printf(({ timestamp, level, message, ...meta }) => {
                const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
                return `${timestamp} [${level}]: ${message} ${metaStr}`;
            })),
        }),
    ],
});
exports.logger = logger;
// Add file transport for production
if (process.env.NODE_ENV === 'production') {
    logger.add(new winston_1.default.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        format: logFormat,
    }));
    logger.add(new winston_1.default.transports.File({
        filename: 'logs/combined.log',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        format: logFormat,
    }));
}
// Request logging middleware
const requestLogger = (req, res, next) => {
    const start = Date.now();
    const requestId = req.headers['x-request-id'] || generateRequestId();
    // Add request ID to request object
    req.id = requestId;
    // Log request start
    logger.info('Request started', {
        requestId,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        userId: req.user?.id,
    });
    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function (chunk, encoding, cb) {
        const responseTime = Date.now() - start;
        logger.info('Request completed', {
            requestId,
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            responseTime,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            userId: req.user?.id,
        });
        return originalEnd.call(this, chunk, encoding, cb);
    };
    next();
};
exports.requestLogger = requestLogger;
// Utility functions for structured logging
const logInfo = (message, context) => {
    logger.info(message, context);
};
exports.logInfo = logInfo;
const logWarn = (message, context) => {
    logger.warn(message, context);
};
exports.logWarn = logWarn;
const logError = (message, error, context) => {
    const errorContext = {
        ...context,
        error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
        } : error,
    };
    logger.error(message, errorContext);
};
exports.logError = logError;
const logDebug = (message, context) => {
    logger.debug(message, context);
};
exports.logDebug = logDebug;
const logAuth = (message, context) => {
    logger.info(message, {
        ...context,
        category: 'auth',
    });
};
exports.logAuth = logAuth;
const logSecurity = (message, context) => {
    logger.warn(message, {
        ...context,
        category: 'security',
    });
};
exports.logSecurity = logSecurity;
const logPerformance = (message, context) => {
    logger.info(message, {
        ...context,
        category: 'performance',
    });
};
exports.logPerformance = logPerformance;
const logDatabase = (message, context) => {
    logger.info(message, {
        ...context,
        category: 'database',
    });
};
exports.logDatabase = logDatabase;
const logExternalService = (message, service, context) => {
    logger.info(message, {
        ...context,
        category: 'external_service',
        service,
    });
};
exports.logExternalService = logExternalService;
const logFileOperation = (message, context) => {
    logger.info(message, {
        ...context,
        category: 'file_operation',
    });
};
exports.logFileOperation = logFileOperation;
const logApiCall = (message, endpoint, method, statusCode, responseTime, context) => {
    logger.info(message, {
        ...context,
        category: 'api_call',
        endpoint,
        method,
        statusCode,
        responseTime,
    });
};
exports.logApiCall = logApiCall;
// Error logging with different severity levels
const logCriticalError = (message, error, context) => {
    const errorContext = {
        ...context,
        severity: 'critical',
        error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
        } : error,
    };
    logger.error(message, errorContext);
    // In production, you might want to send critical errors to external monitoring
    if (process.env.NODE_ENV === 'production') {
        // Send to external monitoring service (e.g., Sentry, DataDog)
        // sendToMonitoring(message, errorContext);
    }
};
exports.logCriticalError = logCriticalError;
// Business logic logging
const logUserAction = (userId, action, resource, result, context) => {
    logger.info('User action', {
        ...context,
        category: 'user_action',
        userId,
        action,
        resource,
        result,
    });
};
exports.logUserAction = logUserAction;
const logDiagnosisRequest = (userId, diagnosisId, cropType, context) => {
    logger.info('Diagnosis requested', {
        ...context,
        category: 'diagnosis',
        userId,
        diagnosisId,
        cropType,
    });
};
exports.logDiagnosisRequest = logDiagnosisRequest;
const logExpertConsultation = (userId, expertId, consultationType, status, context) => {
    logger.info('Expert consultation', {
        ...context,
        category: 'consultation',
        userId,
        expertId,
        consultationType,
        status,
    });
};
exports.logExpertConsultation = logExpertConsultation;
// Utility function to generate request ID
const generateRequestId = () => {
    return Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
};
// Utility function to sanitize sensitive data
const sanitizeLogData = (data) => {
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
    const sanitized = { ...data };
    const sanitizeObject = (obj) => {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
                result[key] = '[REDACTED]';
            }
            else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                result[key] = sanitizeObject(value);
            }
            else {
                result[key] = value;
            }
        }
        return result;
    };
    return sanitizeObject(sanitized);
};
exports.sanitizeLogData = sanitizeLogData;
// Health check function for logger
const loggerHealthCheck = () => {
    try {
        // Test if logger is working
        logger.info('Logger health check');
        return {
            status: 'healthy',
            details: {
                level: logger.level,
                transports: logger.transports.length,
                format: 'json',
            },
        };
    }
    catch (error) {
        return {
            status: 'unhealthy',
            details: {
                error: error instanceof Error ? error.message : 'Unknown error',
            },
        };
    }
};
exports.loggerHealthCheck = loggerHealthCheck;
exports.default = logger;
//# sourceMappingURL=logger.js.map