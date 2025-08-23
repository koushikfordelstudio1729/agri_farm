export declare const API_VERSION = "v1";
export declare const API_PREFIX = "/api/v1";
export declare const NODE_ENV: string;
export declare const PORT: number;
export declare const BASE_URL: string;
export declare const DEFAULT_PAGE_SIZE = 10;
export declare const MAX_PAGE_SIZE = 100;
export declare const DEFAULT_SORT_ORDER = "desc";
export declare const MAX_FILE_SIZE: number;
export declare const MAX_FILES_PER_UPLOAD = 10;
export declare const ALLOWED_IMAGE_TYPES: string[];
export declare const ALLOWED_DOCUMENT_TYPES: string[];
export declare const DEFAULT_IMAGE_QUALITY = 85;
export declare const THUMBNAIL_SIZE: {
    width: number;
    height: number;
};
export declare const PROFILE_IMAGE_SIZE: {
    width: number;
    height: number;
};
export declare const MAX_IMAGE_DIMENSION = 4096;
export declare const JWT_EXPIRES_IN = "15m";
export declare const REFRESH_TOKEN_EXPIRES_IN = "7d";
export declare const PASSWORD_MIN_LENGTH = 8;
export declare const PASSWORD_MAX_LENGTH = 128;
export declare const TOKEN_VERSION_INITIAL = 0;
export declare const OTP_LENGTH = 6;
export declare const OTP_EXPIRY_MINUTES = 10;
export declare const OTP_MAX_ATTEMPTS = 3;
export declare const PHONE_VERIFICATION_EXPIRY: number;
export declare const RATE_LIMIT_WINDOW_MS: number;
export declare const RATE_LIMIT_MAX_REQUESTS = 100;
export declare const AUTH_RATE_LIMIT_MAX_ATTEMPTS = 5;
export declare const UPLOAD_RATE_LIMIT_MAX_REQUESTS = 10;
export declare const USER_ROLES: {
    readonly USER: "user";
    readonly EXPERT: "expert";
    readonly ADMIN: "admin";
    readonly MODERATOR: "moderator";
};
export declare const SUBSCRIPTION_TIERS: {
    readonly FREE: "free";
    readonly PREMIUM: "premium";
    readonly EXPERT: "expert";
};
export declare const USER_STATUS: {
    readonly ACTIVE: "active";
    readonly INACTIVE: "inactive";
    readonly BLOCKED: "blocked";
    readonly DELETED: "deleted";
};
export declare const DIAGNOSIS_STATUS: {
    readonly PENDING: "pending";
    readonly PROCESSING: "processing";
    readonly COMPLETED: "completed";
    readonly FAILED: "failed";
};
export declare const DiagnosisStatus: {
    readonly PENDING: "pending";
    readonly PROCESSING: "processing";
    readonly COMPLETED: "completed";
    readonly FAILED: "failed";
};
export declare const DISEASE_SEVERITY_LEVELS: {
    readonly LOW: "low";
    readonly MEDIUM: "medium";
    readonly HIGH: "high";
    readonly CRITICAL: "critical";
};
export declare const TREATMENT_TYPES: {
    readonly CHEMICAL: "chemical";
    readonly ORGANIC: "organic";
    readonly BIOLOGICAL: "biological";
    readonly CULTURAL: "cultural";
    readonly PREVENTION: "prevention";
};
export declare const CONSULTATION_STATUS: {
    readonly REQUESTED: "requested";
    readonly ACCEPTED: "accepted";
    readonly IN_PROGRESS: "in_progress";
    readonly COMPLETED: "completed";
    readonly CANCELLED: "cancelled";
};
export declare const SUPPORTED_LANGUAGES: {
    readonly EN: "en";
    readonly ES: "es";
    readonly FR: "fr";
    readonly PT: "pt";
    readonly HI: "hi";
    readonly BN: "bn";
    readonly ID: "id";
    readonly VI: "vi";
};
export declare const DEFAULT_LANGUAGE: "en";
export declare const FARMING_TYPES: {
    readonly ORGANIC: "organic";
    readonly CONVENTIONAL: "conventional";
    readonly SUSTAINABLE: "sustainable";
    readonly MIXED: "mixed";
};
export declare const CROP_CATEGORIES: {
    readonly CEREALS: "cereals";
    readonly VEGETABLES: "vegetables";
    readonly FRUITS: "fruits";
    readonly LEGUMES: "legumes";
    readonly OILSEEDS: "oilseeds";
    readonly CASH_CROPS: "cash_crops";
    readonly SPICES: "spices";
    readonly MEDICINAL: "medicinal";
};
export declare const GROWTH_STAGES: {
    readonly SEEDLING: "seedling";
    readonly VEGETATIVE: "vegetative";
    readonly FLOWERING: "flowering";
    readonly FRUITING: "fruiting";
    readonly MATURITY: "maturity";
    readonly HARVEST: "harvest";
};
export declare const NOTIFICATION_TYPES: {
    readonly DIAGNOSIS_COMPLETE: "diagnosis_complete";
    readonly EXPERT_RESPONSE: "expert_response";
    readonly WEATHER_ALERT: "weather_alert";
    readonly PRICE_ALERT: "price_alert";
    readonly COMMUNITY_LIKE: "community_like";
    readonly COMMUNITY_COMMENT: "community_comment";
    readonly SYSTEM_UPDATE: "system_update";
};
export declare const NOTIFICATION_CHANNELS: {
    readonly EMAIL: "email";
    readonly SMS: "sms";
    readonly PUSH: "push";
    readonly IN_APP: "in_app";
};
export declare const WEATHER_CONDITIONS: {
    readonly CLEAR: "clear";
    readonly CLOUDY: "cloudy";
    readonly RAIN: "rain";
    readonly SNOW: "snow";
    readonly STORM: "storm";
    readonly FOG: "fog";
};
export declare const CURRENCY_CODES: {
    readonly USD: "USD";
    readonly EUR: "EUR";
    readonly INR: "INR";
    readonly BRL: "BRL";
    readonly GBP: "GBP";
    readonly JPY: "JPY";
};
export declare const PRICE_UNITS: {
    readonly PER_KG: "per_kg";
    readonly PER_QUINTAL: "per_quintal";
    readonly PER_TON: "per_ton";
    readonly PER_PIECE: "per_piece";
};
export declare const POST_TYPES: {
    readonly QUESTION: "question";
    readonly DISCUSSION: "discussion";
    readonly SHOWCASE: "showcase";
    readonly NEWS: "news";
    readonly ADVICE: "advice";
};
export declare const CONTENT_STATUS: {
    readonly DRAFT: "draft";
    readonly PUBLISHED: "published";
    readonly ARCHIVED: "archived";
    readonly DELETED: "deleted";
    readonly FLAGGED: "flagged";
};
export declare const ERROR_CODES: {
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly AUTHENTICATION_ERROR: "AUTHENTICATION_ERROR";
    readonly AUTHORIZATION_ERROR: "AUTHORIZATION_ERROR";
    readonly NOT_FOUND_ERROR: "NOT_FOUND_ERROR";
    readonly CONFLICT_ERROR: "CONFLICT_ERROR";
    readonly RATE_LIMIT_ERROR: "RATE_LIMIT_ERROR";
    readonly INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR";
    readonly SERVICE_UNAVAILABLE_ERROR: "SERVICE_UNAVAILABLE_ERROR";
    readonly FILE_UPLOAD_ERROR: "FILE_UPLOAD_ERROR";
    readonly EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR";
};
export declare const HTTP_STATUS: {
    readonly OK: 200;
    readonly CREATED: 201;
    readonly ACCEPTED: 202;
    readonly NO_CONTENT: 204;
    readonly BAD_REQUEST: 400;
    readonly UNAUTHORIZED: 401;
    readonly FORBIDDEN: 403;
    readonly NOT_FOUND: 404;
    readonly CONFLICT: 409;
    readonly UNPROCESSABLE_ENTITY: 422;
    readonly TOO_MANY_REQUESTS: 429;
    readonly INTERNAL_SERVER_ERROR: 500;
    readonly BAD_GATEWAY: 502;
    readonly SERVICE_UNAVAILABLE: 503;
};
export declare const CACHE_TTL: {
    readonly SHORT: number;
    readonly MEDIUM: number;
    readonly LONG: number;
    readonly VERY_LONG: number;
};
export declare const REGEX_PATTERNS: {
    readonly EMAIL: RegExp;
    readonly PHONE: RegExp;
    readonly PASSWORD: RegExp;
    readonly UUID: RegExp;
    readonly OBJECT_ID: RegExp;
    readonly SLUG: RegExp;
    readonly HEX_COLOR: RegExp;
    readonly IPV4: RegExp;
    readonly IPV6: RegExp;
};
export declare const TIME_UNITS: {
    readonly SECOND: 1000;
    readonly MINUTE: number;
    readonly HOUR: number;
    readonly DAY: number;
    readonly WEEK: number;
    readonly MONTH: number;
    readonly YEAR: number;
};
export declare const FEATURES: {
    readonly DIAGNOSTICS: boolean;
    readonly EXPERT_CONSULTATION: boolean;
    readonly WEATHER_ALERTS: boolean;
    readonly MARKET_PRICES: boolean;
    readonly COMMUNITY: boolean;
    readonly MULTILANGUAGE: boolean;
    readonly PUSH_NOTIFICATIONS: boolean;
    readonly SOCIAL_LOGIN: boolean;
};
export declare const LIMITS: {
    readonly FREE_TIER: {
        readonly DIAGNOSIS_PER_DAY: 5;
        readonly CONSULTATIONS_PER_MONTH: 1;
        readonly IMAGE_UPLOADS_PER_DAY: 10;
        readonly STORAGE_MB: 100;
    };
    readonly PREMIUM_TIER: {
        readonly DIAGNOSIS_PER_DAY: 50;
        readonly CONSULTATIONS_PER_MONTH: 10;
        readonly IMAGE_UPLOADS_PER_DAY: 100;
        readonly STORAGE_MB: 1000;
    };
    readonly EXPERT_TIER: {
        readonly DIAGNOSIS_PER_DAY: -1;
        readonly CONSULTATIONS_PER_MONTH: -1;
        readonly IMAGE_UPLOADS_PER_DAY: -1;
        readonly STORAGE_MB: 10000;
    };
};
export declare const EMAIL_TEMPLATES: {
    readonly WELCOME: "welcome";
    readonly PASSWORD_RESET: "password_reset";
    readonly EMAIL_VERIFICATION: "email_verification";
    readonly DIAGNOSIS_COMPLETE: "diagnosis_complete";
    readonly EXPERT_RESPONSE: "expert_response";
    readonly SUBSCRIPTION_CONFIRMATION: "subscription_confirmation";
    readonly ACCOUNT_DEACTIVATION: "account_deactivation";
};
export declare const SOCKET_EVENTS: {
    readonly CONNECTION: "connection";
    readonly DISCONNECT: "disconnect";
    readonly DIAGNOSIS_UPDATE: "diagnosis_update";
    readonly EXPERT_MESSAGE: "expert_message";
    readonly NOTIFICATION: "notification";
    readonly TYPING: "typing";
    readonly ONLINE_STATUS: "online_status";
};
export declare const LOG_LEVELS: {
    readonly ERROR: "error";
    readonly WARN: "warn";
    readonly INFO: "info";
    readonly HTTP: "http";
    readonly VERBOSE: "verbose";
    readonly DEBUG: "debug";
    readonly SILLY: "silly";
};
export declare const DEFAULTS: {
    readonly LANGUAGE: "en";
    readonly TIMEZONE: "UTC";
    readonly CURRENCY: "USD";
    readonly UNITS: "metric";
    readonly THEME: "light";
    readonly PAGE_SIZE: 10;
    readonly SORT_ORDER: "desc";
    readonly IMAGE_QUALITY: 85;
};
declare const _default: {
    API_VERSION: string;
    API_PREFIX: string;
    NODE_ENV: string;
    PORT: number;
    BASE_URL: string;
    DEFAULT_PAGE_SIZE: number;
    MAX_PAGE_SIZE: number;
    DEFAULT_SORT_ORDER: string;
    MAX_FILE_SIZE: number;
    MAX_FILES_PER_UPLOAD: number;
    ALLOWED_IMAGE_TYPES: string[];
    ALLOWED_DOCUMENT_TYPES: string[];
    DEFAULT_IMAGE_QUALITY: number;
    THUMBNAIL_SIZE: {
        width: number;
        height: number;
    };
    PROFILE_IMAGE_SIZE: {
        width: number;
        height: number;
    };
    MAX_IMAGE_DIMENSION: number;
    JWT_EXPIRES_IN: string;
    REFRESH_TOKEN_EXPIRES_IN: string;
    PASSWORD_MIN_LENGTH: number;
    PASSWORD_MAX_LENGTH: number;
    TOKEN_VERSION_INITIAL: number;
    OTP_LENGTH: number;
    OTP_EXPIRY_MINUTES: number;
    OTP_MAX_ATTEMPTS: number;
    PHONE_VERIFICATION_EXPIRY: number;
    RATE_LIMIT_WINDOW_MS: number;
    RATE_LIMIT_MAX_REQUESTS: number;
    AUTH_RATE_LIMIT_MAX_ATTEMPTS: number;
    UPLOAD_RATE_LIMIT_MAX_REQUESTS: number;
    USER_ROLES: {
        readonly USER: "user";
        readonly EXPERT: "expert";
        readonly ADMIN: "admin";
        readonly MODERATOR: "moderator";
    };
    SUBSCRIPTION_TIERS: {
        readonly FREE: "free";
        readonly PREMIUM: "premium";
        readonly EXPERT: "expert";
    };
    USER_STATUS: {
        readonly ACTIVE: "active";
        readonly INACTIVE: "inactive";
        readonly BLOCKED: "blocked";
        readonly DELETED: "deleted";
    };
    DIAGNOSIS_STATUS: {
        readonly PENDING: "pending";
        readonly PROCESSING: "processing";
        readonly COMPLETED: "completed";
        readonly FAILED: "failed";
    };
    DISEASE_SEVERITY_LEVELS: {
        readonly LOW: "low";
        readonly MEDIUM: "medium";
        readonly HIGH: "high";
        readonly CRITICAL: "critical";
    };
    TREATMENT_TYPES: {
        readonly CHEMICAL: "chemical";
        readonly ORGANIC: "organic";
        readonly BIOLOGICAL: "biological";
        readonly CULTURAL: "cultural";
        readonly PREVENTION: "prevention";
    };
    CONSULTATION_STATUS: {
        readonly REQUESTED: "requested";
        readonly ACCEPTED: "accepted";
        readonly IN_PROGRESS: "in_progress";
        readonly COMPLETED: "completed";
        readonly CANCELLED: "cancelled";
    };
    SUPPORTED_LANGUAGES: {
        readonly EN: "en";
        readonly ES: "es";
        readonly FR: "fr";
        readonly PT: "pt";
        readonly HI: "hi";
        readonly BN: "bn";
        readonly ID: "id";
        readonly VI: "vi";
    };
    DEFAULT_LANGUAGE: "en";
    FARMING_TYPES: {
        readonly ORGANIC: "organic";
        readonly CONVENTIONAL: "conventional";
        readonly SUSTAINABLE: "sustainable";
        readonly MIXED: "mixed";
    };
    CROP_CATEGORIES: {
        readonly CEREALS: "cereals";
        readonly VEGETABLES: "vegetables";
        readonly FRUITS: "fruits";
        readonly LEGUMES: "legumes";
        readonly OILSEEDS: "oilseeds";
        readonly CASH_CROPS: "cash_crops";
        readonly SPICES: "spices";
        readonly MEDICINAL: "medicinal";
    };
    GROWTH_STAGES: {
        readonly SEEDLING: "seedling";
        readonly VEGETATIVE: "vegetative";
        readonly FLOWERING: "flowering";
        readonly FRUITING: "fruiting";
        readonly MATURITY: "maturity";
        readonly HARVEST: "harvest";
    };
    NOTIFICATION_TYPES: {
        readonly DIAGNOSIS_COMPLETE: "diagnosis_complete";
        readonly EXPERT_RESPONSE: "expert_response";
        readonly WEATHER_ALERT: "weather_alert";
        readonly PRICE_ALERT: "price_alert";
        readonly COMMUNITY_LIKE: "community_like";
        readonly COMMUNITY_COMMENT: "community_comment";
        readonly SYSTEM_UPDATE: "system_update";
    };
    NOTIFICATION_CHANNELS: {
        readonly EMAIL: "email";
        readonly SMS: "sms";
        readonly PUSH: "push";
        readonly IN_APP: "in_app";
    };
    WEATHER_CONDITIONS: {
        readonly CLEAR: "clear";
        readonly CLOUDY: "cloudy";
        readonly RAIN: "rain";
        readonly SNOW: "snow";
        readonly STORM: "storm";
        readonly FOG: "fog";
    };
    CURRENCY_CODES: {
        readonly USD: "USD";
        readonly EUR: "EUR";
        readonly INR: "INR";
        readonly BRL: "BRL";
        readonly GBP: "GBP";
        readonly JPY: "JPY";
    };
    PRICE_UNITS: {
        readonly PER_KG: "per_kg";
        readonly PER_QUINTAL: "per_quintal";
        readonly PER_TON: "per_ton";
        readonly PER_PIECE: "per_piece";
    };
    POST_TYPES: {
        readonly QUESTION: "question";
        readonly DISCUSSION: "discussion";
        readonly SHOWCASE: "showcase";
        readonly NEWS: "news";
        readonly ADVICE: "advice";
    };
    CONTENT_STATUS: {
        readonly DRAFT: "draft";
        readonly PUBLISHED: "published";
        readonly ARCHIVED: "archived";
        readonly DELETED: "deleted";
        readonly FLAGGED: "flagged";
    };
    ERROR_CODES: {
        readonly VALIDATION_ERROR: "VALIDATION_ERROR";
        readonly AUTHENTICATION_ERROR: "AUTHENTICATION_ERROR";
        readonly AUTHORIZATION_ERROR: "AUTHORIZATION_ERROR";
        readonly NOT_FOUND_ERROR: "NOT_FOUND_ERROR";
        readonly CONFLICT_ERROR: "CONFLICT_ERROR";
        readonly RATE_LIMIT_ERROR: "RATE_LIMIT_ERROR";
        readonly INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR";
        readonly SERVICE_UNAVAILABLE_ERROR: "SERVICE_UNAVAILABLE_ERROR";
        readonly FILE_UPLOAD_ERROR: "FILE_UPLOAD_ERROR";
        readonly EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR";
    };
    HTTP_STATUS: {
        readonly OK: 200;
        readonly CREATED: 201;
        readonly ACCEPTED: 202;
        readonly NO_CONTENT: 204;
        readonly BAD_REQUEST: 400;
        readonly UNAUTHORIZED: 401;
        readonly FORBIDDEN: 403;
        readonly NOT_FOUND: 404;
        readonly CONFLICT: 409;
        readonly UNPROCESSABLE_ENTITY: 422;
        readonly TOO_MANY_REQUESTS: 429;
        readonly INTERNAL_SERVER_ERROR: 500;
        readonly BAD_GATEWAY: 502;
        readonly SERVICE_UNAVAILABLE: 503;
    };
    CACHE_TTL: {
        readonly SHORT: number;
        readonly MEDIUM: number;
        readonly LONG: number;
        readonly VERY_LONG: number;
    };
    REGEX_PATTERNS: {
        readonly EMAIL: RegExp;
        readonly PHONE: RegExp;
        readonly PASSWORD: RegExp;
        readonly UUID: RegExp;
        readonly OBJECT_ID: RegExp;
        readonly SLUG: RegExp;
        readonly HEX_COLOR: RegExp;
        readonly IPV4: RegExp;
        readonly IPV6: RegExp;
    };
    TIME_UNITS: {
        readonly SECOND: 1000;
        readonly MINUTE: number;
        readonly HOUR: number;
        readonly DAY: number;
        readonly WEEK: number;
        readonly MONTH: number;
        readonly YEAR: number;
    };
    FEATURES: {
        readonly DIAGNOSTICS: boolean;
        readonly EXPERT_CONSULTATION: boolean;
        readonly WEATHER_ALERTS: boolean;
        readonly MARKET_PRICES: boolean;
        readonly COMMUNITY: boolean;
        readonly MULTILANGUAGE: boolean;
        readonly PUSH_NOTIFICATIONS: boolean;
        readonly SOCIAL_LOGIN: boolean;
    };
    LIMITS: {
        readonly FREE_TIER: {
            readonly DIAGNOSIS_PER_DAY: 5;
            readonly CONSULTATIONS_PER_MONTH: 1;
            readonly IMAGE_UPLOADS_PER_DAY: 10;
            readonly STORAGE_MB: 100;
        };
        readonly PREMIUM_TIER: {
            readonly DIAGNOSIS_PER_DAY: 50;
            readonly CONSULTATIONS_PER_MONTH: 10;
            readonly IMAGE_UPLOADS_PER_DAY: 100;
            readonly STORAGE_MB: 1000;
        };
        readonly EXPERT_TIER: {
            readonly DIAGNOSIS_PER_DAY: -1;
            readonly CONSULTATIONS_PER_MONTH: -1;
            readonly IMAGE_UPLOADS_PER_DAY: -1;
            readonly STORAGE_MB: 10000;
        };
    };
    EMAIL_TEMPLATES: {
        readonly WELCOME: "welcome";
        readonly PASSWORD_RESET: "password_reset";
        readonly EMAIL_VERIFICATION: "email_verification";
        readonly DIAGNOSIS_COMPLETE: "diagnosis_complete";
        readonly EXPERT_RESPONSE: "expert_response";
        readonly SUBSCRIPTION_CONFIRMATION: "subscription_confirmation";
        readonly ACCOUNT_DEACTIVATION: "account_deactivation";
    };
    SOCKET_EVENTS: {
        readonly CONNECTION: "connection";
        readonly DISCONNECT: "disconnect";
        readonly DIAGNOSIS_UPDATE: "diagnosis_update";
        readonly EXPERT_MESSAGE: "expert_message";
        readonly NOTIFICATION: "notification";
        readonly TYPING: "typing";
        readonly ONLINE_STATUS: "online_status";
    };
    LOG_LEVELS: {
        readonly ERROR: "error";
        readonly WARN: "warn";
        readonly INFO: "info";
        readonly HTTP: "http";
        readonly VERBOSE: "verbose";
        readonly DEBUG: "debug";
        readonly SILLY: "silly";
    };
    DEFAULTS: {
        readonly LANGUAGE: "en";
        readonly TIMEZONE: "UTC";
        readonly CURRENCY: "USD";
        readonly UNITS: "metric";
        readonly THEME: "light";
        readonly PAGE_SIZE: 10;
        readonly SORT_ORDER: "desc";
        readonly IMAGE_QUALITY: 85;
    };
};
export default _default;
//# sourceMappingURL=constants.d.ts.map