import { Request } from 'express';
import { PaginationResponse } from '@/types/common.types';
/**
 * Generate a random string of specified length
 */
export declare const generateRandomString: (length?: number) => string;
/**
 * Generate a cryptographically secure random number
 */
export declare const generateRandomNumber: (min?: number, max?: number) => string;
/**
 * Generate UUID v4
 */
export declare const generateUUID: () => string;
/**
 * Hash a string using SHA-256
 */
export declare const hashString: (input: string) => string;
/**
 * Generate a secure token
 */
export declare const generateSecureToken: (length?: number) => string;
/**
 * Sleep/delay function
 */
export declare const sleep: (ms: number) => Promise<void>;
/**
 * Retry a function with exponential backoff
 */
export declare const retryWithBackoff: <T>(fn: () => Promise<T>, maxRetries?: number, baseDelay?: number, maxDelay?: number) => Promise<T>;
/**
 * Deep clone an object
 */
export declare const deepClone: <T>(obj: T) => T;
/**
 * Remove undefined values from an object
 */
export declare const removeUndefined: <T extends Record<string, any>>(obj: T) => Partial<T>;
/**
 * Pick specific properties from an object
 */
export declare const pick: <T extends object, K extends keyof T>(obj: T, keys: K[]) => Pick<T, K>;
/**
 * Omit specific properties from an object
 */
export declare const omit: <T, K extends keyof T>(obj: T, keys: K[]) => Omit<T, K>;
/**
 * Convert string to slug
 */
export declare const slugify: (text: string) => string;
/**
 * Capitalize first letter of a string
 */
export declare const capitalize: (text: string) => string;
/**
 * Convert camelCase to snake_case
 */
export declare const camelToSnake: (str: string) => string;
/**
 * Convert snake_case to camelCase
 */
export declare const snakeToCamel: (str: string) => string;
/**
 * Check if a string is a valid email
 */
export declare const isValidEmail: (email: string) => boolean;
/**
 * Check if a string is a valid URL
 */
export declare const isValidURL: (url: string) => boolean;
/**
 * Format bytes to human readable string
 */
export declare const formatBytes: (bytes: number, decimals?: number) => string;
/**
 * Format duration in milliseconds to human readable string
 */
export declare const formatDuration: (ms: number) => string;
/**
 * Calculate pagination metadata
 */
export declare const calculatePagination: (page: number, limit: number, total: number) => PaginationResponse;
/**
 * Parse pagination parameters from request query
 */
export declare const parsePaginationParams: (req: Request) => {
    page: number;
    limit: number;
};
/**
 * Parse sort parameters from request query
 */
export declare const parseSortParams: (req: Request, allowedFields?: string[], defaultField?: string) => {
    sortBy: string;
    sortOrder: "asc" | "desc";
};
/**
 * Extract client IP address from request
 */
export declare const getClientIP: (req: Request) => string;
/**
 * Get user agent from request
 */
export declare const getUserAgent: (req: Request) => string;
/**
 * Parse boolean from string
 */
export declare const parseBoolean: (value: any) => boolean;
/**
 * Convert object to query string
 */
export declare const objectToQueryString: (obj: Record<string, any>) => string;
/**
 * Validate MongoDB ObjectId
 */
export declare const isValidObjectId: (id: string) => boolean;
/**
 * Get file extension from filename
 */
export declare const getFileExtension: (filename: string) => string;
/**
 * Generate filename with timestamp
 */
export declare const generateTimestampedFilename: (originalName: string) => string;
/**
 * Mask sensitive data (email, phone, etc.)
 */
export declare const maskEmail: (email: string) => string;
export declare const maskPhone: (phone: string) => string;
/**
 * Check if code is running in production
 */
export declare const isProduction: () => boolean;
/**
 * Check if code is running in development
 */
export declare const isDevelopment: () => boolean;
/**
 * Check if code is running in test environment
 */
export declare const isTest: () => boolean;
/**
 * Get current timestamp in ISO format
 */
export declare const getCurrentTimestamp: () => string;
/**
 * Convert date to different timezone
 */
export declare const convertToTimezone: (date: Date, timezone: string) => string;
/**
 * Debounce function
 */
export declare const debounce: <T extends (...args: any[]) => any>(func: T, wait: number) => ((...args: Parameters<T>) => void);
/**
 * Throttle function
 */
export declare const throttle: <T extends (...args: any[]) => any>(func: T, limit: number) => ((...args: Parameters<T>) => void);
declare const _default: {
    generateRandomString: (length?: number) => string;
    generateRandomNumber: (min?: number, max?: number) => string;
    generateUUID: () => string;
    hashString: (input: string) => string;
    generateSecureToken: (length?: number) => string;
    sleep: (ms: number) => Promise<void>;
    retryWithBackoff: <T>(fn: () => Promise<T>, maxRetries?: number, baseDelay?: number, maxDelay?: number) => Promise<T>;
    deepClone: <T>(obj: T) => T;
    removeUndefined: <T extends Record<string, any>>(obj: T) => Partial<T>;
    pick: <T extends object, K extends keyof T>(obj: T, keys: K[]) => Pick<T, K>;
    omit: <T, K extends keyof T>(obj: T, keys: K[]) => Omit<T, K>;
    slugify: (text: string) => string;
    capitalize: (text: string) => string;
    camelToSnake: (str: string) => string;
    snakeToCamel: (str: string) => string;
    isValidEmail: (email: string) => boolean;
    isValidURL: (url: string) => boolean;
    formatBytes: (bytes: number, decimals?: number) => string;
    formatDuration: (ms: number) => string;
    calculatePagination: (page: number, limit: number, total: number) => PaginationResponse;
    parsePaginationParams: (req: Request) => {
        page: number;
        limit: number;
    };
    parseSortParams: (req: Request, allowedFields?: string[], defaultField?: string) => {
        sortBy: string;
        sortOrder: "asc" | "desc";
    };
    getClientIP: (req: Request) => string;
    getUserAgent: (req: Request) => string;
    parseBoolean: (value: any) => boolean;
    objectToQueryString: (obj: Record<string, any>) => string;
    isValidObjectId: (id: string) => boolean;
    getFileExtension: (filename: string) => string;
    generateTimestampedFilename: (originalName: string) => string;
    maskEmail: (email: string) => string;
    maskPhone: (phone: string) => string;
    isProduction: () => boolean;
    isDevelopment: () => boolean;
    isTest: () => boolean;
    getCurrentTimestamp: () => string;
    convertToTimezone: (date: Date, timezone: string) => string;
    debounce: <T extends (...args: any[]) => any>(func: T, wait: number) => ((...args: Parameters<T>) => void);
    throttle: <T extends (...args: any[]) => any>(func: T, limit: number) => ((...args: Parameters<T>) => void);
};
export default _default;
//# sourceMappingURL=helpers.d.ts.map