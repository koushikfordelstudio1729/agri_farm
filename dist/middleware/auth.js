"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRateLimit = exports.checkAccountStatus = exports.isOwnerOrRole = exports.optionalAuthenticate = exports.requirePhoneVerification = exports.requireEmailVerification = exports.authorize = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("@/models/User");
const errors_1 = require("@/utils/errors");
const logger_1 = require("@/utils/logger");
const authenticate = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.startsWith('Bearer ')
            ? authHeader.substring(7)
            : null;
        if (!token) {
            throw new errors_1.AuthenticationError(errors_1.ERROR_MESSAGES.AUTH.TOKEN_REQUIRED, (0, errors_1.createErrorContext)(req));
        }
        // Verify JWT token
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('JWT_SECRET is not defined');
        }
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        // Find user and check if account is active
        const user = await User_1.User.findActiveById(decoded.userId);
        if (!user) {
            throw new errors_1.AuthenticationError(errors_1.ERROR_MESSAGES.USER.NOT_FOUND, (0, errors_1.createErrorContext)(req));
        }
        // Check if account is locked
        if (user.isLocked()) {
            throw new errors_1.AuthenticationError(errors_1.ERROR_MESSAGES.AUTH.ACCOUNT_LOCKED, (0, errors_1.createErrorContext)(req));
        }
        // Add user info to request
        req.user = {
            id: user._id.toString(),
            email: user.email,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
            isPhoneVerified: user.isPhoneVerified,
        };
        // Update last login time
        user.lastLoginAt = new Date();
        await user.save();
        logger_1.logger.info('User authenticated successfully', {
            userId: user._id.toString(),
            email: user.email,
            role: user.role,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        });
        next();
    }
    catch (error) {
        logger_1.logger.warn('Authentication failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            endpoint: req.originalUrl,
            method: req.method,
        });
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            next(new errors_1.AuthenticationError(errors_1.ERROR_MESSAGES.AUTH.TOKEN_INVALID, (0, errors_1.createErrorContext)(req)));
        }
        else if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            next(new errors_1.AuthenticationError('Token has expired', (0, errors_1.createErrorContext)(req)));
        }
        else {
            next(error);
        }
    }
};
exports.authenticate = authenticate;
const authorize = (...roles) => {
    return (req, res, next) => {
        try {
            const user = req.user;
            if (!user) {
                throw new errors_1.AuthenticationError(errors_1.ERROR_MESSAGES.AUTH.TOKEN_REQUIRED, (0, errors_1.createErrorContext)(req));
            }
            if (!roles.includes(user.role)) {
                logger_1.logger.warn('Authorization failed', {
                    userId: user.id,
                    userRole: user.role,
                    requiredRoles: roles,
                    endpoint: req.originalUrl,
                    method: req.method,
                });
                throw new errors_1.AuthorizationError(errors_1.ERROR_MESSAGES.AUTH.INSUFFICIENT_PERMISSIONS, (0, errors_1.createErrorContext)(req));
            }
            logger_1.logger.debug('Authorization successful', {
                userId: user.id,
                userRole: user.role,
                requiredRoles: roles,
            });
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.authorize = authorize;
const requireEmailVerification = (req, res, next) => {
    try {
        const user = req.user;
        if (!user) {
            throw new errors_1.AuthenticationError(errors_1.ERROR_MESSAGES.AUTH.TOKEN_REQUIRED, (0, errors_1.createErrorContext)(req));
        }
        if (!user.isEmailVerified) {
            logger_1.logger.warn('Email verification required', {
                userId: user.id,
                email: user.email,
                endpoint: req.originalUrl,
            });
            throw new errors_1.AuthenticationError(errors_1.ERROR_MESSAGES.AUTH.EMAIL_NOT_VERIFIED, (0, errors_1.createErrorContext)(req));
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.requireEmailVerification = requireEmailVerification;
const requirePhoneVerification = (req, res, next) => {
    try {
        const user = req.user;
        if (!user) {
            throw new errors_1.AuthenticationError(errors_1.ERROR_MESSAGES.AUTH.TOKEN_REQUIRED, (0, errors_1.createErrorContext)(req));
        }
        if (!user.isPhoneVerified) {
            logger_1.logger.warn('Phone verification required', {
                userId: user.id,
                endpoint: req.originalUrl,
            });
            throw new errors_1.AuthenticationError(errors_1.ERROR_MESSAGES.AUTH.PHONE_NOT_VERIFIED, (0, errors_1.createErrorContext)(req));
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.requirePhoneVerification = requirePhoneVerification;
const optionalAuthenticate = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.startsWith('Bearer ')
            ? authHeader.substring(7)
            : null;
        if (!token) {
            // No token provided, continue without authentication
            return next();
        }
        // Verify JWT token
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('JWT_SECRET is not defined');
        }
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        // Find user and check if account is active
        const user = await User_1.User.findActiveById(decoded.userId);
        if (user && !user.isLocked()) {
            // Add user info to request
            req.user = {
                id: user._id.toString(),
                email: user.email,
                role: user.role,
                isEmailVerified: user.isEmailVerified,
                isPhoneVerified: user.isPhoneVerified,
            };
            // Update last login time
            user.lastLoginAt = new Date();
            await user.save();
        }
        next();
    }
    catch (error) {
        // If token is invalid, continue without authentication
        // Don't throw error for optional authentication
        logger_1.logger.debug('Optional authentication failed, continuing without auth', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        next();
    }
};
exports.optionalAuthenticate = optionalAuthenticate;
const isOwnerOrRole = (...roles) => {
    return (req, res, next) => {
        try {
            const user = req.user;
            const resourceUserId = req.params.userId || req.params.id;
            if (!user) {
                throw new errors_1.AuthenticationError(errors_1.ERROR_MESSAGES.AUTH.TOKEN_REQUIRED, (0, errors_1.createErrorContext)(req));
            }
            // Check if user is the owner of the resource
            const isOwner = user.id === resourceUserId;
            // Check if user has required role
            const hasRole = roles.includes(user.role);
            if (!isOwner && !hasRole) {
                logger_1.logger.warn('Access denied - not owner or required role', {
                    userId: user.id,
                    userRole: user.role,
                    resourceUserId,
                    requiredRoles: roles,
                    endpoint: req.originalUrl,
                });
                throw new errors_1.AuthorizationError(errors_1.ERROR_MESSAGES.AUTH.INSUFFICIENT_PERMISSIONS, (0, errors_1.createErrorContext)(req));
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.isOwnerOrRole = isOwnerOrRole;
const checkAccountStatus = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user) {
            throw new errors_1.AuthenticationError(errors_1.ERROR_MESSAGES.AUTH.TOKEN_REQUIRED, (0, errors_1.createErrorContext)(req));
        }
        // Refresh user data to check current status
        const currentUser = await User_1.User.findById(user.id);
        if (!currentUser) {
            throw new errors_1.AuthenticationError(errors_1.ERROR_MESSAGES.USER.NOT_FOUND, (0, errors_1.createErrorContext)(req));
        }
        if (!currentUser.isActive) {
            logger_1.logger.warn('Access attempt with inactive account', {
                userId: user.id,
                endpoint: req.originalUrl,
            });
            throw new errors_1.AuthenticationError('Account is deactivated', (0, errors_1.createErrorContext)(req));
        }
        if (currentUser.isDeleted) {
            logger_1.logger.warn('Access attempt with deleted account', {
                userId: user.id,
                endpoint: req.originalUrl,
            });
            throw new errors_1.AuthenticationError('Account has been deleted', (0, errors_1.createErrorContext)(req));
        }
        if (currentUser.isLocked()) {
            throw new errors_1.AuthenticationError(errors_1.ERROR_MESSAGES.AUTH.ACCOUNT_LOCKED, (0, errors_1.createErrorContext)(req));
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.checkAccountStatus = checkAccountStatus;
// Rate limiting middleware for authentication endpoints
const authRateLimit = (maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
    const attempts = new Map();
    return (req, res, next) => {
        const ip = req.ip || 'unknown';
        const now = Date.now();
        const windowStart = now - windowMs;
        // Clean up old entries
        for (const [key, value] of attempts.entries()) {
            if (value.resetTime < windowStart) {
                attempts.delete(key);
            }
        }
        const currentAttempts = attempts.get(ip) || { count: 0, resetTime: now + windowMs };
        if (currentAttempts.count >= maxAttempts && currentAttempts.resetTime > now) {
            const timeUntilReset = Math.ceil((currentAttempts.resetTime - now) / 1000);
            logger_1.logger.warn('Authentication rate limit exceeded', {
                ip,
                attempts: currentAttempts.count,
                maxAttempts,
                timeUntilReset,
                endpoint: req.originalUrl,
            });
            res.status(429).json({
                success: false,
                message: 'Too many authentication attempts. Please try again later.',
                error: 'RateLimitExceeded',
                retryAfter: timeUntilReset,
            });
            return;
        }
        // Increment attempts
        currentAttempts.count += 1;
        attempts.set(ip, currentAttempts);
        next();
    };
};
exports.authRateLimit = authRateLimit;
exports.default = {
    authenticate: exports.authenticate,
    authorize: exports.authorize,
    requireEmailVerification: exports.requireEmailVerification,
    requirePhoneVerification: exports.requirePhoneVerification,
    optionalAuthenticate: exports.optionalAuthenticate,
    isOwnerOrRole: exports.isOwnerOrRole,
    checkAccountStatus: exports.checkAccountStatus,
    authRateLimit: exports.authRateLimit,
};
//# sourceMappingURL=auth.js.map