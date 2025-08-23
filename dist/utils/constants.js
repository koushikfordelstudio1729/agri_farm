"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERROR_CODES = exports.CONTENT_STATUS = exports.POST_TYPES = exports.PRICE_UNITS = exports.CURRENCY_CODES = exports.WEATHER_CONDITIONS = exports.NOTIFICATION_CHANNELS = exports.NOTIFICATION_TYPES = exports.GROWTH_STAGES = exports.CROP_CATEGORIES = exports.FARMING_TYPES = exports.DEFAULT_LANGUAGE = exports.SUPPORTED_LANGUAGES = exports.CONSULTATION_STATUS = exports.TREATMENT_TYPES = exports.DISEASE_SEVERITY_LEVELS = exports.DiagnosisStatus = exports.DIAGNOSIS_STATUS = exports.USER_STATUS = exports.SUBSCRIPTION_TIERS = exports.USER_ROLES = exports.UPLOAD_RATE_LIMIT_MAX_REQUESTS = exports.AUTH_RATE_LIMIT_MAX_ATTEMPTS = exports.RATE_LIMIT_MAX_REQUESTS = exports.RATE_LIMIT_WINDOW_MS = exports.PHONE_VERIFICATION_EXPIRY = exports.OTP_MAX_ATTEMPTS = exports.OTP_EXPIRY_MINUTES = exports.OTP_LENGTH = exports.TOKEN_VERSION_INITIAL = exports.PASSWORD_MAX_LENGTH = exports.PASSWORD_MIN_LENGTH = exports.REFRESH_TOKEN_EXPIRES_IN = exports.JWT_EXPIRES_IN = exports.MAX_IMAGE_DIMENSION = exports.PROFILE_IMAGE_SIZE = exports.THUMBNAIL_SIZE = exports.DEFAULT_IMAGE_QUALITY = exports.ALLOWED_DOCUMENT_TYPES = exports.ALLOWED_IMAGE_TYPES = exports.MAX_FILES_PER_UPLOAD = exports.MAX_FILE_SIZE = exports.DEFAULT_SORT_ORDER = exports.MAX_PAGE_SIZE = exports.DEFAULT_PAGE_SIZE = exports.BASE_URL = exports.PORT = exports.NODE_ENV = exports.API_PREFIX = exports.API_VERSION = void 0;
exports.DEFAULTS = exports.LOG_LEVELS = exports.SOCKET_EVENTS = exports.EMAIL_TEMPLATES = exports.LIMITS = exports.FEATURES = exports.TIME_UNITS = exports.REGEX_PATTERNS = exports.CACHE_TTL = exports.HTTP_STATUS = void 0;
// API Constants
exports.API_VERSION = 'v1';
exports.API_PREFIX = `/api/${exports.API_VERSION}`;
// Environment Constants
exports.NODE_ENV = process.env.NODE_ENV || 'development';
exports.PORT = parseInt(process.env.PORT || '3000', 10);
exports.BASE_URL = process.env.BASE_URL || `http://localhost:${exports.PORT}`;
// Database Constants
exports.DEFAULT_PAGE_SIZE = 10;
exports.MAX_PAGE_SIZE = 100;
exports.DEFAULT_SORT_ORDER = 'desc';
// File Upload Constants
exports.MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
exports.MAX_FILES_PER_UPLOAD = 10;
exports.ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
exports.ALLOWED_DOCUMENT_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
// Image Processing Constants
exports.DEFAULT_IMAGE_QUALITY = 85;
exports.THUMBNAIL_SIZE = { width: 300, height: 300 };
exports.PROFILE_IMAGE_SIZE = { width: 400, height: 400 };
exports.MAX_IMAGE_DIMENSION = 4096;
// Authentication Constants
exports.JWT_EXPIRES_IN = '15m';
exports.REFRESH_TOKEN_EXPIRES_IN = '7d';
exports.PASSWORD_MIN_LENGTH = 8;
exports.PASSWORD_MAX_LENGTH = 128;
exports.TOKEN_VERSION_INITIAL = 0;
// OTP Constants
exports.OTP_LENGTH = 6;
exports.OTP_EXPIRY_MINUTES = 10;
exports.OTP_MAX_ATTEMPTS = 3;
exports.PHONE_VERIFICATION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
// Rate Limiting Constants
exports.RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
exports.RATE_LIMIT_MAX_REQUESTS = 100;
exports.AUTH_RATE_LIMIT_MAX_ATTEMPTS = 5;
exports.UPLOAD_RATE_LIMIT_MAX_REQUESTS = 10;
// User Constants
exports.USER_ROLES = {
    USER: 'user',
    EXPERT: 'expert',
    ADMIN: 'admin',
    MODERATOR: 'moderator',
};
exports.SUBSCRIPTION_TIERS = {
    FREE: 'free',
    PREMIUM: 'premium',
    EXPERT: 'expert',
};
exports.USER_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    BLOCKED: 'blocked',
    DELETED: 'deleted',
};
// Diagnosis Constants
exports.DIAGNOSIS_STATUS = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
};
exports.DiagnosisStatus = exports.DIAGNOSIS_STATUS;
exports.DISEASE_SEVERITY_LEVELS = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical',
};
exports.TREATMENT_TYPES = {
    CHEMICAL: 'chemical',
    ORGANIC: 'organic',
    BIOLOGICAL: 'biological',
    CULTURAL: 'cultural',
    PREVENTION: 'prevention',
};
exports.CONSULTATION_STATUS = {
    REQUESTED: 'requested',
    ACCEPTED: 'accepted',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
};
// Language Constants
exports.SUPPORTED_LANGUAGES = {
    EN: 'en',
    ES: 'es',
    FR: 'fr',
    PT: 'pt',
    HI: 'hi',
    BN: 'bn',
    ID: 'id',
    VI: 'vi',
};
exports.DEFAULT_LANGUAGE = exports.SUPPORTED_LANGUAGES.EN;
// Crop Constants
exports.FARMING_TYPES = {
    ORGANIC: 'organic',
    CONVENTIONAL: 'conventional',
    SUSTAINABLE: 'sustainable',
    MIXED: 'mixed',
};
exports.CROP_CATEGORIES = {
    CEREALS: 'cereals',
    VEGETABLES: 'vegetables',
    FRUITS: 'fruits',
    LEGUMES: 'legumes',
    OILSEEDS: 'oilseeds',
    CASH_CROPS: 'cash_crops',
    SPICES: 'spices',
    MEDICINAL: 'medicinal',
};
exports.GROWTH_STAGES = {
    SEEDLING: 'seedling',
    VEGETATIVE: 'vegetative',
    FLOWERING: 'flowering',
    FRUITING: 'fruiting',
    MATURITY: 'maturity',
    HARVEST: 'harvest',
};
// Notification Constants
exports.NOTIFICATION_TYPES = {
    DIAGNOSIS_COMPLETE: 'diagnosis_complete',
    EXPERT_RESPONSE: 'expert_response',
    WEATHER_ALERT: 'weather_alert',
    PRICE_ALERT: 'price_alert',
    COMMUNITY_LIKE: 'community_like',
    COMMUNITY_COMMENT: 'community_comment',
    SYSTEM_UPDATE: 'system_update',
};
exports.NOTIFICATION_CHANNELS = {
    EMAIL: 'email',
    SMS: 'sms',
    PUSH: 'push',
    IN_APP: 'in_app',
};
// Weather Constants
exports.WEATHER_CONDITIONS = {
    CLEAR: 'clear',
    CLOUDY: 'cloudy',
    RAIN: 'rain',
    SNOW: 'snow',
    STORM: 'storm',
    FOG: 'fog',
};
// Market Constants
exports.CURRENCY_CODES = {
    USD: 'USD',
    EUR: 'EUR',
    INR: 'INR',
    BRL: 'BRL',
    GBP: 'GBP',
    JPY: 'JPY',
};
exports.PRICE_UNITS = {
    PER_KG: 'per_kg',
    PER_QUINTAL: 'per_quintal',
    PER_TON: 'per_ton',
    PER_PIECE: 'per_piece',
};
// Community Constants
exports.POST_TYPES = {
    QUESTION: 'question',
    DISCUSSION: 'discussion',
    SHOWCASE: 'showcase',
    NEWS: 'news',
    ADVICE: 'advice',
};
exports.CONTENT_STATUS = {
    DRAFT: 'draft',
    PUBLISHED: 'published',
    ARCHIVED: 'archived',
    DELETED: 'deleted',
    FLAGGED: 'flagged',
};
// Error Constants
exports.ERROR_CODES = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
    AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
    NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
    CONFLICT_ERROR: 'CONFLICT_ERROR',
    RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
    INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
    SERVICE_UNAVAILABLE_ERROR: 'SERVICE_UNAVAILABLE_ERROR',
    FILE_UPLOAD_ERROR: 'FILE_UPLOAD_ERROR',
    EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
};
// HTTP Status Codes
exports.HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
};
// Cache Constants
exports.CACHE_TTL = {
    SHORT: 5 * 60, // 5 minutes
    MEDIUM: 30 * 60, // 30 minutes
    LONG: 60 * 60, // 1 hour
    VERY_LONG: 24 * 60 * 60, // 24 hours
};
// Regex Patterns
exports.REGEX_PATTERNS = {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE: /^\+?[\d\s-()]+$/,
    PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    OBJECT_ID: /^[0-9a-fA-F]{24}$/,
    SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
    IPV4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
    IPV6: /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/,
};
// Time Constants
exports.TIME_UNITS = {
    SECOND: 1000,
    MINUTE: 60 * 1000,
    HOUR: 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000,
    WEEK: 7 * 24 * 60 * 60 * 1000,
    MONTH: 30 * 24 * 60 * 60 * 1000,
    YEAR: 365 * 24 * 60 * 60 * 1000,
};
// Feature Flags
exports.FEATURES = {
    DIAGNOSTICS: process.env.FEATURE_DIAGNOSTICS !== 'false',
    EXPERT_CONSULTATION: process.env.FEATURE_EXPERT_CONSULTATION !== 'false',
    WEATHER_ALERTS: process.env.FEATURE_WEATHER_ALERTS !== 'false',
    MARKET_PRICES: process.env.FEATURE_MARKET_PRICES !== 'false',
    COMMUNITY: process.env.FEATURE_COMMUNITY !== 'false',
    MULTILANGUAGE: process.env.FEATURE_MULTILANGUAGE !== 'false',
    PUSH_NOTIFICATIONS: process.env.FEATURE_PUSH_NOTIFICATIONS !== 'false',
    SOCIAL_LOGIN: process.env.FEATURE_SOCIAL_LOGIN !== 'false',
};
// Business Limits
exports.LIMITS = {
    FREE_TIER: {
        DIAGNOSIS_PER_DAY: 5,
        CONSULTATIONS_PER_MONTH: 1,
        IMAGE_UPLOADS_PER_DAY: 10,
        STORAGE_MB: 100,
    },
    PREMIUM_TIER: {
        DIAGNOSIS_PER_DAY: 50,
        CONSULTATIONS_PER_MONTH: 10,
        IMAGE_UPLOADS_PER_DAY: 100,
        STORAGE_MB: 1000,
    },
    EXPERT_TIER: {
        DIAGNOSIS_PER_DAY: -1, // Unlimited
        CONSULTATIONS_PER_MONTH: -1, // Unlimited
        IMAGE_UPLOADS_PER_DAY: -1, // Unlimited
        STORAGE_MB: 10000,
    },
};
// Email Templates
exports.EMAIL_TEMPLATES = {
    WELCOME: 'welcome',
    PASSWORD_RESET: 'password_reset',
    EMAIL_VERIFICATION: 'email_verification',
    DIAGNOSIS_COMPLETE: 'diagnosis_complete',
    EXPERT_RESPONSE: 'expert_response',
    SUBSCRIPTION_CONFIRMATION: 'subscription_confirmation',
    ACCOUNT_DEACTIVATION: 'account_deactivation',
};
// Socket Events
exports.SOCKET_EVENTS = {
    CONNECTION: 'connection',
    DISCONNECT: 'disconnect',
    DIAGNOSIS_UPDATE: 'diagnosis_update',
    EXPERT_MESSAGE: 'expert_message',
    NOTIFICATION: 'notification',
    TYPING: 'typing',
    ONLINE_STATUS: 'online_status',
};
// Log Levels
exports.LOG_LEVELS = {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    HTTP: 'http',
    VERBOSE: 'verbose',
    DEBUG: 'debug',
    SILLY: 'silly',
};
// Default Values
exports.DEFAULTS = {
    LANGUAGE: exports.DEFAULT_LANGUAGE,
    TIMEZONE: 'UTC',
    CURRENCY: 'USD',
    UNITS: 'metric',
    THEME: 'light',
    PAGE_SIZE: exports.DEFAULT_PAGE_SIZE,
    SORT_ORDER: exports.DEFAULT_SORT_ORDER,
    IMAGE_QUALITY: exports.DEFAULT_IMAGE_QUALITY,
};
exports.default = {
    API_VERSION: exports.API_VERSION,
    API_PREFIX: exports.API_PREFIX,
    NODE_ENV: exports.NODE_ENV,
    PORT: exports.PORT,
    BASE_URL: exports.BASE_URL,
    DEFAULT_PAGE_SIZE: exports.DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE: exports.MAX_PAGE_SIZE,
    DEFAULT_SORT_ORDER: exports.DEFAULT_SORT_ORDER,
    MAX_FILE_SIZE: exports.MAX_FILE_SIZE,
    MAX_FILES_PER_UPLOAD: exports.MAX_FILES_PER_UPLOAD,
    ALLOWED_IMAGE_TYPES: exports.ALLOWED_IMAGE_TYPES,
    ALLOWED_DOCUMENT_TYPES: exports.ALLOWED_DOCUMENT_TYPES,
    DEFAULT_IMAGE_QUALITY: exports.DEFAULT_IMAGE_QUALITY,
    THUMBNAIL_SIZE: exports.THUMBNAIL_SIZE,
    PROFILE_IMAGE_SIZE: exports.PROFILE_IMAGE_SIZE,
    MAX_IMAGE_DIMENSION: exports.MAX_IMAGE_DIMENSION,
    JWT_EXPIRES_IN: exports.JWT_EXPIRES_IN,
    REFRESH_TOKEN_EXPIRES_IN: exports.REFRESH_TOKEN_EXPIRES_IN,
    PASSWORD_MIN_LENGTH: exports.PASSWORD_MIN_LENGTH,
    PASSWORD_MAX_LENGTH: exports.PASSWORD_MAX_LENGTH,
    TOKEN_VERSION_INITIAL: exports.TOKEN_VERSION_INITIAL,
    OTP_LENGTH: exports.OTP_LENGTH,
    OTP_EXPIRY_MINUTES: exports.OTP_EXPIRY_MINUTES,
    OTP_MAX_ATTEMPTS: exports.OTP_MAX_ATTEMPTS,
    PHONE_VERIFICATION_EXPIRY: exports.PHONE_VERIFICATION_EXPIRY,
    RATE_LIMIT_WINDOW_MS: exports.RATE_LIMIT_WINDOW_MS,
    RATE_LIMIT_MAX_REQUESTS: exports.RATE_LIMIT_MAX_REQUESTS,
    AUTH_RATE_LIMIT_MAX_ATTEMPTS: exports.AUTH_RATE_LIMIT_MAX_ATTEMPTS,
    UPLOAD_RATE_LIMIT_MAX_REQUESTS: exports.UPLOAD_RATE_LIMIT_MAX_REQUESTS,
    USER_ROLES: exports.USER_ROLES,
    SUBSCRIPTION_TIERS: exports.SUBSCRIPTION_TIERS,
    USER_STATUS: exports.USER_STATUS,
    DIAGNOSIS_STATUS: exports.DIAGNOSIS_STATUS,
    DISEASE_SEVERITY_LEVELS: exports.DISEASE_SEVERITY_LEVELS,
    TREATMENT_TYPES: exports.TREATMENT_TYPES,
    CONSULTATION_STATUS: exports.CONSULTATION_STATUS,
    SUPPORTED_LANGUAGES: exports.SUPPORTED_LANGUAGES,
    DEFAULT_LANGUAGE: exports.DEFAULT_LANGUAGE,
    FARMING_TYPES: exports.FARMING_TYPES,
    CROP_CATEGORIES: exports.CROP_CATEGORIES,
    GROWTH_STAGES: exports.GROWTH_STAGES,
    NOTIFICATION_TYPES: exports.NOTIFICATION_TYPES,
    NOTIFICATION_CHANNELS: exports.NOTIFICATION_CHANNELS,
    WEATHER_CONDITIONS: exports.WEATHER_CONDITIONS,
    CURRENCY_CODES: exports.CURRENCY_CODES,
    PRICE_UNITS: exports.PRICE_UNITS,
    POST_TYPES: exports.POST_TYPES,
    CONTENT_STATUS: exports.CONTENT_STATUS,
    ERROR_CODES: exports.ERROR_CODES,
    HTTP_STATUS: exports.HTTP_STATUS,
    CACHE_TTL: exports.CACHE_TTL,
    REGEX_PATTERNS: exports.REGEX_PATTERNS,
    TIME_UNITS: exports.TIME_UNITS,
    FEATURES: exports.FEATURES,
    LIMITS: exports.LIMITS,
    EMAIL_TEMPLATES: exports.EMAIL_TEMPLATES,
    SOCKET_EVENTS: exports.SOCKET_EVENTS,
    LOG_LEVELS: exports.LOG_LEVELS,
    DEFAULTS: exports.DEFAULTS,
};
//# sourceMappingURL=constants.js.map