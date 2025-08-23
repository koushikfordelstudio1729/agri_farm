// API Constants
export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;

// Environment Constants
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const PORT = parseInt(process.env.PORT || '3000', 10);
export const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// Database Constants
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_SORT_ORDER = 'desc';

// File Upload Constants
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_FILES_PER_UPLOAD = 10;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

// Image Processing Constants
export const DEFAULT_IMAGE_QUALITY = 85;
export const THUMBNAIL_SIZE = { width: 300, height: 300 };
export const PROFILE_IMAGE_SIZE = { width: 400, height: 400 };
export const MAX_IMAGE_DIMENSION = 4096;

// Authentication Constants
export const JWT_EXPIRES_IN = '15m';
export const REFRESH_TOKEN_EXPIRES_IN = '7d';
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const TOKEN_VERSION_INITIAL = 0;

// OTP Constants
export const OTP_LENGTH = 6;
export const OTP_EXPIRY_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 3;
export const PHONE_VERIFICATION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

// Rate Limiting Constants
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const RATE_LIMIT_MAX_REQUESTS = 100;
export const AUTH_RATE_LIMIT_MAX_ATTEMPTS = 5;
export const UPLOAD_RATE_LIMIT_MAX_REQUESTS = 10;

// User Constants
export const USER_ROLES = {
  USER: 'user',
  EXPERT: 'expert',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
} as const;

export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  PREMIUM: 'premium',
  EXPERT: 'expert',
} as const;

export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  BLOCKED: 'blocked',
  DELETED: 'deleted',
} as const;

// Diagnosis Constants
export const DIAGNOSIS_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export const DiagnosisStatus = DIAGNOSIS_STATUS;

export const DISEASE_SEVERITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export const TREATMENT_TYPES = {
  CHEMICAL: 'chemical',
  ORGANIC: 'organic',
  BIOLOGICAL: 'biological',
  CULTURAL: 'cultural',
  PREVENTION: 'prevention',
} as const;

export const CONSULTATION_STATUS = {
  REQUESTED: 'requested',
  ACCEPTED: 'accepted',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

// Language Constants
export const SUPPORTED_LANGUAGES = {
  EN: 'en',
  ES: 'es',
  FR: 'fr',
  PT: 'pt',
  HI: 'hi',
  BN: 'bn',
  ID: 'id',
  VI: 'vi',
} as const;

export const DEFAULT_LANGUAGE = SUPPORTED_LANGUAGES.EN;

// Crop Constants
export const FARMING_TYPES = {
  ORGANIC: 'organic',
  CONVENTIONAL: 'conventional',
  SUSTAINABLE: 'sustainable',
  MIXED: 'mixed',
} as const;

export const CROP_CATEGORIES = {
  CEREALS: 'cereals',
  VEGETABLES: 'vegetables',
  FRUITS: 'fruits',
  LEGUMES: 'legumes',
  OILSEEDS: 'oilseeds',
  CASH_CROPS: 'cash_crops',
  SPICES: 'spices',
  MEDICINAL: 'medicinal',
} as const;

export const GROWTH_STAGES = {
  SEEDLING: 'seedling',
  VEGETATIVE: 'vegetative',
  FLOWERING: 'flowering',
  FRUITING: 'fruiting',
  MATURITY: 'maturity',
  HARVEST: 'harvest',
} as const;

// Notification Constants
export const NOTIFICATION_TYPES = {
  DIAGNOSIS_COMPLETE: 'diagnosis_complete',
  EXPERT_RESPONSE: 'expert_response',
  WEATHER_ALERT: 'weather_alert',
  PRICE_ALERT: 'price_alert',
  COMMUNITY_LIKE: 'community_like',
  COMMUNITY_COMMENT: 'community_comment',
  SYSTEM_UPDATE: 'system_update',
} as const;

export const NOTIFICATION_CHANNELS = {
  EMAIL: 'email',
  SMS: 'sms',
  PUSH: 'push',
  IN_APP: 'in_app',
} as const;

// Weather Constants
export const WEATHER_CONDITIONS = {
  CLEAR: 'clear',
  CLOUDY: 'cloudy',
  RAIN: 'rain',
  SNOW: 'snow',
  STORM: 'storm',
  FOG: 'fog',
} as const;

// Market Constants
export const CURRENCY_CODES = {
  USD: 'USD',
  EUR: 'EUR',
  INR: 'INR',
  BRL: 'BRL',
  GBP: 'GBP',
  JPY: 'JPY',
} as const;

export const PRICE_UNITS = {
  PER_KG: 'per_kg',
  PER_QUINTAL: 'per_quintal',
  PER_TON: 'per_ton',
  PER_PIECE: 'per_piece',
} as const;

// Community Constants
export const POST_TYPES = {
  QUESTION: 'question',
  DISCUSSION: 'discussion',
  SHOWCASE: 'showcase',
  NEWS: 'news',
  ADVICE: 'advice',
} as const;

export const CONTENT_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
  DELETED: 'deleted',
  FLAGGED: 'flagged',
} as const;

// Error Constants
export const ERROR_CODES = {
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
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
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
} as const;

// Cache Constants
export const CACHE_TTL = {
  SHORT: 5 * 60, // 5 minutes
  MEDIUM: 30 * 60, // 30 minutes
  LONG: 60 * 60, // 1 hour
  VERY_LONG: 24 * 60 * 60, // 24 hours
} as const;

// Regex Patterns
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[\d\s-()]+$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  OBJECT_ID: /^[0-9a-fA-F]{24}$/,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  IPV4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  IPV6: /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/,
} as const;

// Time Constants
export const TIME_UNITS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
  YEAR: 365 * 24 * 60 * 60 * 1000,
} as const;

// Feature Flags
export const FEATURES = {
  DIAGNOSTICS: process.env.FEATURE_DIAGNOSTICS !== 'false',
  EXPERT_CONSULTATION: process.env.FEATURE_EXPERT_CONSULTATION !== 'false',
  WEATHER_ALERTS: process.env.FEATURE_WEATHER_ALERTS !== 'false',
  MARKET_PRICES: process.env.FEATURE_MARKET_PRICES !== 'false',
  COMMUNITY: process.env.FEATURE_COMMUNITY !== 'false',
  MULTILANGUAGE: process.env.FEATURE_MULTILANGUAGE !== 'false',
  PUSH_NOTIFICATIONS: process.env.FEATURE_PUSH_NOTIFICATIONS !== 'false',
  SOCIAL_LOGIN: process.env.FEATURE_SOCIAL_LOGIN !== 'false',
} as const;

// Business Limits
export const LIMITS = {
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
} as const;

// Email Templates
export const EMAIL_TEMPLATES = {
  WELCOME: 'welcome',
  PASSWORD_RESET: 'password_reset',
  EMAIL_VERIFICATION: 'email_verification',
  DIAGNOSIS_COMPLETE: 'diagnosis_complete',
  EXPERT_RESPONSE: 'expert_response',
  SUBSCRIPTION_CONFIRMATION: 'subscription_confirmation',
  ACCOUNT_DEACTIVATION: 'account_deactivation',
} as const;

// Socket Events
export const SOCKET_EVENTS = {
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  DIAGNOSIS_UPDATE: 'diagnosis_update',
  EXPERT_MESSAGE: 'expert_message',
  NOTIFICATION: 'notification',
  TYPING: 'typing',
  ONLINE_STATUS: 'online_status',
} as const;

// Log Levels
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  HTTP: 'http',
  VERBOSE: 'verbose',
  DEBUG: 'debug',
  SILLY: 'silly',
} as const;

// Default Values
export const DEFAULTS = {
  LANGUAGE: DEFAULT_LANGUAGE,
  TIMEZONE: 'UTC',
  CURRENCY: 'USD',
  UNITS: 'metric',
  THEME: 'light',
  PAGE_SIZE: DEFAULT_PAGE_SIZE,
  SORT_ORDER: DEFAULT_SORT_ORDER,
  IMAGE_QUALITY: DEFAULT_IMAGE_QUALITY,
} as const;

export default {
  API_VERSION,
  API_PREFIX,
  NODE_ENV,
  PORT,
  BASE_URL,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  DEFAULT_SORT_ORDER,
  MAX_FILE_SIZE,
  MAX_FILES_PER_UPLOAD,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_DOCUMENT_TYPES,
  DEFAULT_IMAGE_QUALITY,
  THUMBNAIL_SIZE,
  PROFILE_IMAGE_SIZE,
  MAX_IMAGE_DIMENSION,
  JWT_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  TOKEN_VERSION_INITIAL,
  OTP_LENGTH,
  OTP_EXPIRY_MINUTES,
  OTP_MAX_ATTEMPTS,
  PHONE_VERIFICATION_EXPIRY,
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS,
  AUTH_RATE_LIMIT_MAX_ATTEMPTS,
  UPLOAD_RATE_LIMIT_MAX_REQUESTS,
  USER_ROLES,
  SUBSCRIPTION_TIERS,
  USER_STATUS,
  DIAGNOSIS_STATUS,
  DISEASE_SEVERITY_LEVELS,
  TREATMENT_TYPES,
  CONSULTATION_STATUS,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  FARMING_TYPES,
  CROP_CATEGORIES,
  GROWTH_STAGES,
  NOTIFICATION_TYPES,
  NOTIFICATION_CHANNELS,
  WEATHER_CONDITIONS,
  CURRENCY_CODES,
  PRICE_UNITS,
  POST_TYPES,
  CONTENT_STATUS,
  ERROR_CODES,
  HTTP_STATUS,
  CACHE_TTL,
  REGEX_PATTERNS,
  TIME_UNITS,
  FEATURES,
  LIMITS,
  EMAIL_TEMPLATES,
  SOCKET_EVENTS,
  LOG_LEVELS,
  DEFAULTS,
};