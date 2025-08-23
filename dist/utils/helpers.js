"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.throttle = exports.debounce = exports.convertToTimezone = exports.getCurrentTimestamp = exports.isTest = exports.isDevelopment = exports.isProduction = exports.maskPhone = exports.maskEmail = exports.generateTimestampedFilename = exports.getFileExtension = exports.isValidObjectId = exports.objectToQueryString = exports.parseBoolean = exports.getUserAgent = exports.getClientIP = exports.parseSortParams = exports.parsePaginationParams = exports.calculatePagination = exports.formatDuration = exports.formatBytes = exports.isValidURL = exports.isValidEmail = exports.snakeToCamel = exports.camelToSnake = exports.capitalize = exports.slugify = exports.omit = exports.pick = exports.removeUndefined = exports.deepClone = exports.retryWithBackoff = exports.sleep = exports.generateSecureToken = exports.hashString = exports.generateUUID = exports.generateRandomNumber = exports.generateRandomString = void 0;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Generate a random string of specified length
 */
const generateRandomString = (length = 32) => {
    return crypto_1.default.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
};
exports.generateRandomString = generateRandomString;
/**
 * Generate a cryptographically secure random number
 */
const generateRandomNumber = (min = 0, max = 999999) => {
    const range = max - min + 1;
    const randomNumber = min + crypto_1.default.randomInt(range);
    return randomNumber.toString();
};
exports.generateRandomNumber = generateRandomNumber;
/**
 * Generate UUID v4
 */
const generateUUID = () => {
    return crypto_1.default.randomUUID();
};
exports.generateUUID = generateUUID;
/**
 * Hash a string using SHA-256
 */
const hashString = (input) => {
    return crypto_1.default.createHash('sha256').update(input).digest('hex');
};
exports.hashString = hashString;
/**
 * Generate a secure token
 */
const generateSecureToken = (length = 64) => {
    return crypto_1.default.randomBytes(length).toString('base64url');
};
exports.generateSecureToken = generateSecureToken;
/**
 * Sleep/delay function
 */
const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};
exports.sleep = sleep;
/**
 * Retry a function with exponential backoff
 */
const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000, maxDelay = 30000) => {
    let retries = 0;
    while (retries < maxRetries) {
        try {
            return await fn();
        }
        catch (error) {
            retries++;
            if (retries === maxRetries) {
                throw error;
            }
            const delay = Math.min(baseDelay * Math.pow(2, retries - 1), maxDelay);
            await (0, exports.sleep)(delay);
        }
    }
    throw new Error('Max retries exceeded');
};
exports.retryWithBackoff = retryWithBackoff;
/**
 * Deep clone an object
 */
const deepClone = (obj) => {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }
    if (Array.isArray(obj)) {
        return obj.map(item => (0, exports.deepClone)(item));
    }
    if (typeof obj === 'object') {
        const clonedObj = {};
        Object.keys(obj).forEach(key => {
            clonedObj[key] = (0, exports.deepClone)(obj[key]);
        });
        return clonedObj;
    }
    return obj;
};
exports.deepClone = deepClone;
/**
 * Remove undefined values from an object
 */
const removeUndefined = (obj) => {
    const result = {};
    Object.keys(obj).forEach(key => {
        if (obj[key] !== undefined) {
            result[key] = obj[key];
        }
    });
    return result;
};
exports.removeUndefined = removeUndefined;
/**
 * Pick specific properties from an object
 */
const pick = (obj, keys) => {
    const result = {};
    keys.forEach(key => {
        if (key in obj) {
            result[key] = obj[key];
        }
    });
    return result;
};
exports.pick = pick;
/**
 * Omit specific properties from an object
 */
const omit = (obj, keys) => {
    const result = { ...obj };
    keys.forEach(key => {
        delete result[key];
    });
    return result;
};
exports.omit = omit;
/**
 * Convert string to slug
 */
const slugify = (text) => {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, '') // Remove invalid chars
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};
exports.slugify = slugify;
/**
 * Capitalize first letter of a string
 */
const capitalize = (text) => {
    if (!text)
        return text;
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};
exports.capitalize = capitalize;
/**
 * Convert camelCase to snake_case
 */
const camelToSnake = (str) => {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};
exports.camelToSnake = camelToSnake;
/**
 * Convert snake_case to camelCase
 */
const snakeToCamel = (str) => {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};
exports.snakeToCamel = snakeToCamel;
/**
 * Check if a string is a valid email
 */
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
exports.isValidEmail = isValidEmail;
/**
 * Check if a string is a valid URL
 */
const isValidURL = (url) => {
    try {
        new URL(url);
        return true;
    }
    catch {
        return false;
    }
};
exports.isValidURL = isValidURL;
/**
 * Format bytes to human readable string
 */
const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};
exports.formatBytes = formatBytes;
/**
 * Format duration in milliseconds to human readable string
 */
const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0)
        return `${days}d ${hours % 24}h`;
    if (hours > 0)
        return `${hours}h ${minutes % 60}m`;
    if (minutes > 0)
        return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
};
exports.formatDuration = formatDuration;
/**
 * Calculate pagination metadata
 */
const calculatePagination = (page, limit, total) => {
    const totalPages = Math.ceil(total / limit);
    return {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
    };
};
exports.calculatePagination = calculatePagination;
/**
 * Parse pagination parameters from request query
 */
const parsePaginationParams = (req) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    return { page, limit };
};
exports.parsePaginationParams = parsePaginationParams;
/**
 * Parse sort parameters from request query
 */
const parseSortParams = (req, allowedFields = [], defaultField = 'createdAt') => {
    const sortBy = allowedFields.includes(req.query.sortBy)
        ? req.query.sortBy
        : defaultField;
    const sortOrder = req.query.sortOrder?.toLowerCase() === 'asc' ? 'asc' : 'desc';
    return { sortBy, sortOrder };
};
exports.parseSortParams = parseSortParams;
/**
 * Extract client IP address from request
 */
const getClientIP = (req) => {
    return (req.headers['x-forwarded-for']?.split(',')[0] ||
        req.headers['x-real-ip'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.ip ||
        'unknown');
};
exports.getClientIP = getClientIP;
/**
 * Get user agent from request
 */
const getUserAgent = (req) => {
    return req.headers['user-agent'] || 'unknown';
};
exports.getUserAgent = getUserAgent;
/**
 * Parse boolean from string
 */
const parseBoolean = (value) => {
    if (typeof value === 'boolean')
        return value;
    if (typeof value === 'string') {
        return value.toLowerCase() === 'true' || value === '1';
    }
    if (typeof value === 'number') {
        return value === 1;
    }
    return false;
};
exports.parseBoolean = parseBoolean;
/**
 * Convert object to query string
 */
const objectToQueryString = (obj) => {
    const params = new URLSearchParams();
    Object.entries(obj).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
            if (Array.isArray(value)) {
                value.forEach(v => params.append(key, String(v)));
            }
            else {
                params.append(key, String(value));
            }
        }
    });
    return params.toString();
};
exports.objectToQueryString = objectToQueryString;
/**
 * Validate MongoDB ObjectId
 */
const isValidObjectId = (id) => {
    return /^[0-9a-fA-F]{24}$/.test(id);
};
exports.isValidObjectId = isValidObjectId;
/**
 * Get file extension from filename
 */
const getFileExtension = (filename) => {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2).toLowerCase();
};
exports.getFileExtension = getFileExtension;
/**
 * Generate filename with timestamp
 */
const generateTimestampedFilename = (originalName) => {
    const timestamp = Date.now();
    const extension = (0, exports.getFileExtension)(originalName);
    const baseName = originalName.replace(/\.[^/.]+$/, '');
    return `${(0, exports.slugify)(baseName)}-${timestamp}${extension ? '.' + extension : ''}`;
};
exports.generateTimestampedFilename = generateTimestampedFilename;
/**
 * Mask sensitive data (email, phone, etc.)
 */
const maskEmail = (email) => {
    const [username, domain] = email.split('@');
    if (!username || !domain || username.length <= 2)
        return email;
    const maskedUsername = username[0] + '*'.repeat(username.length - 2) + username[username.length - 1];
    return `${maskedUsername}@${domain}`;
};
exports.maskEmail = maskEmail;
const maskPhone = (phone) => {
    if (phone.length <= 4)
        return phone;
    return phone.slice(0, 2) + '*'.repeat(phone.length - 4) + phone.slice(-2);
};
exports.maskPhone = maskPhone;
/**
 * Check if code is running in production
 */
const isProduction = () => {
    return process.env.NODE_ENV === 'production';
};
exports.isProduction = isProduction;
/**
 * Check if code is running in development
 */
const isDevelopment = () => {
    return process.env.NODE_ENV === 'development';
};
exports.isDevelopment = isDevelopment;
/**
 * Check if code is running in test environment
 */
const isTest = () => {
    return process.env.NODE_ENV === 'test';
};
exports.isTest = isTest;
/**
 * Get current timestamp in ISO format
 */
const getCurrentTimestamp = () => {
    return new Date().toISOString();
};
exports.getCurrentTimestamp = getCurrentTimestamp;
/**
 * Convert date to different timezone
 */
const convertToTimezone = (date, timezone) => {
    return new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    }).format(date);
};
exports.convertToTimezone = convertToTimezone;
/**
 * Debounce function
 */
const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(null, args), wait);
    };
};
exports.debounce = debounce;
/**
 * Throttle function
 */
const throttle = (func, limit) => {
    let inThrottle;
    return (...args) => {
        if (!inThrottle) {
            func.apply(null, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};
exports.throttle = throttle;
exports.default = {
    generateRandomString: exports.generateRandomString,
    generateRandomNumber: exports.generateRandomNumber,
    generateUUID: exports.generateUUID,
    hashString: exports.hashString,
    generateSecureToken: exports.generateSecureToken,
    sleep: exports.sleep,
    retryWithBackoff: exports.retryWithBackoff,
    deepClone: exports.deepClone,
    removeUndefined: exports.removeUndefined,
    pick: exports.pick,
    omit: exports.omit,
    slugify: exports.slugify,
    capitalize: exports.capitalize,
    camelToSnake: exports.camelToSnake,
    snakeToCamel: exports.snakeToCamel,
    isValidEmail: exports.isValidEmail,
    isValidURL: exports.isValidURL,
    formatBytes: exports.formatBytes,
    formatDuration: exports.formatDuration,
    calculatePagination: exports.calculatePagination,
    parsePaginationParams: exports.parsePaginationParams,
    parseSortParams: exports.parseSortParams,
    getClientIP: exports.getClientIP,
    getUserAgent: exports.getUserAgent,
    parseBoolean: exports.parseBoolean,
    objectToQueryString: exports.objectToQueryString,
    isValidObjectId: exports.isValidObjectId,
    getFileExtension: exports.getFileExtension,
    generateTimestampedFilename: exports.generateTimestampedFilename,
    maskEmail: exports.maskEmail,
    maskPhone: exports.maskPhone,
    isProduction: exports.isProduction,
    isDevelopment: exports.isDevelopment,
    isTest: exports.isTest,
    getCurrentTimestamp: exports.getCurrentTimestamp,
    convertToTimezone: exports.convertToTimezone,
    debounce: exports.debounce,
    throttle: exports.throttle,
};
//# sourceMappingURL=helpers.js.map