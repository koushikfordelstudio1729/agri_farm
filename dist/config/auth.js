"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePasswordStrength = exports.getTokenExpirationTime = exports.verifyRefreshToken = exports.verifyAccessToken = exports.generateTokens = exports.authConfig = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = require("@/utils/logger");
exports.authConfig = {
    jwt: {
        secret: process.env.JWT_SECRET || 'fallback-secret-key',
        refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
        accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
        refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
    },
    bcrypt: {
        saltRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    },
    otp: {
        length: parseInt(process.env.OTP_LENGTH || '6', 10),
        expiry: parseInt(process.env.OTP_EXPIRY || '300', 10), // 5 minutes
        maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '3', 10),
    },
    session: {
        secret: process.env.SESSION_SECRET || 'fallback-session-secret',
        maxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000', 10), // 24 hours
    },
    passwordPolicy: {
        minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10),
        maxLength: parseInt(process.env.PASSWORD_MAX_LENGTH || '128', 10),
        requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE === 'true',
        requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE === 'true',
        requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS === 'true',
        requireSpecialChars: process.env.PASSWORD_REQUIRE_SPECIAL === 'true',
    },
    lockout: {
        maxAttempts: parseInt(process.env.LOGIN_MAX_ATTEMPTS || '5', 10),
        lockoutTime: parseInt(process.env.LOGIN_LOCKOUT_TIME || '300000', 10), // 5 minutes
    },
    social: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
            callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
        },
        facebook: {
            appId: process.env.FACEBOOK_APP_ID || '',
            appSecret: process.env.FACEBOOK_APP_SECRET || '',
            callbackUrl: process.env.FACEBOOK_CALLBACK_URL || 'http://localhost:3000/api/auth/facebook/callback',
        },
    },
};
const generateTokens = async (payload) => {
    try {
        const accessToken = jsonwebtoken_1.default.sign(payload, exports.authConfig.jwt.secret, {
            expiresIn: exports.authConfig.jwt.accessTokenExpiry,
            issuer: 'agri-farm-api',
            audience: 'agri-farm-app',
        });
        const refreshToken = jsonwebtoken_1.default.sign({ userId: payload.userId, tokenVersion: payload.tokenVersion }, exports.authConfig.jwt.refreshSecret, {
            expiresIn: exports.authConfig.jwt.refreshTokenExpiry,
            issuer: 'agri-farm-api',
            audience: 'agri-farm-app',
        });
        return { accessToken, refreshToken };
    }
    catch (error) {
        logger_1.logger.error('Token generation failed', error instanceof Error ? error : new Error(String(error)));
        throw new Error('Failed to generate authentication tokens');
    }
};
exports.generateTokens = generateTokens;
const verifyAccessToken = async (token) => {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, exports.authConfig.jwt.secret, {
            issuer: 'agri-farm-api',
            audience: 'agri-farm-app',
        });
        return decoded;
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            throw new Error('Access token expired');
        }
        else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            throw new Error('Invalid access token');
        }
        throw new Error('Token verification failed');
    }
};
exports.verifyAccessToken = verifyAccessToken;
const verifyRefreshToken = async (token) => {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, exports.authConfig.jwt.refreshSecret, {
            issuer: 'agri-farm-api',
            audience: 'agri-farm-app',
        });
        return decoded;
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            throw new Error('Refresh token expired');
        }
        else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            throw new Error('Invalid refresh token');
        }
        throw new Error('Refresh token verification failed');
    }
};
exports.verifyRefreshToken = verifyRefreshToken;
const getTokenExpirationTime = (token) => {
    try {
        const decoded = jsonwebtoken_1.default.decode(token);
        if (decoded?.exp) {
            return new Date(decoded.exp * 1000);
        }
        return null;
    }
    catch {
        return null;
    }
};
exports.getTokenExpirationTime = getTokenExpirationTime;
const validatePasswordStrength = (password) => {
    const errors = [];
    const { passwordPolicy } = exports.authConfig;
    if (password.length < passwordPolicy.minLength) {
        errors.push(`Password must be at least ${passwordPolicy.minLength} characters long`);
    }
    if (password.length > passwordPolicy.maxLength) {
        errors.push(`Password must not exceed ${passwordPolicy.maxLength} characters`);
    }
    if (passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    if (passwordPolicy.requireLowercase && !/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    if (passwordPolicy.requireNumbers && !/\d/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    if (passwordPolicy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }
    return {
        isValid: errors.length === 0,
        errors,
    };
};
exports.validatePasswordStrength = validatePasswordStrength;
exports.default = exports.authConfig;
//# sourceMappingURL=auth.js.map