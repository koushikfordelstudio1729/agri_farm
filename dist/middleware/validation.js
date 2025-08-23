"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDateRangeZod = exports.validateLocationZod = exports.validateIdZod = exports.validatePaginationZod = exports.validateDateRange = exports.validateLocation = exports.validateId = exports.validatePagination = exports.zodSchemas = exports.commonSchemas = exports.ValidationMiddleware = void 0;
const joi_1 = __importDefault(require("joi"));
const zod_1 = require("zod");
const errors_1 = require("@/utils/errors");
const logger_1 = require("@/utils/logger");
class ValidationMiddleware {
    static joi(schema, options = {}) {
        return (req, res, next) => {
            const { source = 'body', allowUnknown = false, stripUnknown = true } = options;
            const dataToValidate = this.getDataFromRequest(req, source);
            const { error, value } = schema.validate(dataToValidate, {
                allowUnknown,
                stripUnknown,
                abortEarly: false,
            });
            if (error) {
                const errors = {};
                error.details.forEach(detail => {
                    const key = detail.path.join('.');
                    if (!errors[key]) {
                        errors[key] = [];
                    }
                    errors[key].push(detail.message);
                });
                logger_1.logger.warn('Validation failed', {
                    source,
                    errors,
                    data: this.sanitizeData(dataToValidate),
                    endpoint: req.originalUrl,
                    method: req.method,
                });
                return next(new errors_1.ValidationError('Validation failed', errors));
            }
            // Replace the original data with validated data
            this.setDataToRequest(req, source, value);
            next();
        };
    }
    static zod(schema, options = {}) {
        return (req, res, next) => {
            const { source = 'body' } = options;
            const dataToValidate = this.getDataFromRequest(req, source);
            try {
                const validatedData = schema.parse(dataToValidate);
                this.setDataToRequest(req, source, validatedData);
                next();
            }
            catch (error) {
                if (error instanceof zod_1.z.ZodError) {
                    const errors = {};
                    error.errors.forEach(err => {
                        const key = err.path.join('.');
                        if (!errors[key]) {
                            errors[key] = [];
                        }
                        errors[key].push(err.message);
                    });
                    logger_1.logger.warn('Zod validation failed', {
                        source,
                        errors,
                        data: this.sanitizeData(dataToValidate),
                        endpoint: req.originalUrl,
                        method: req.method,
                    });
                    return next(new errors_1.ValidationError('Validation failed', errors));
                }
                next(error);
            }
        };
    }
    static custom(validator, options = {}) {
        return async (req, res, next) => {
            const { source = 'body' } = options;
            try {
                const dataToValidate = this.getDataFromRequest(req, source);
                const result = await validator(dataToValidate, req);
                if (result.isValid) {
                    if (result.data) {
                        this.setDataToRequest(req, source, result.data);
                    }
                    next();
                }
                else {
                    logger_1.logger.warn('Custom validation failed', {
                        source,
                        errors: result.errors,
                        data: this.sanitizeData(dataToValidate),
                        endpoint: req.originalUrl,
                        method: req.method,
                    });
                    next(new errors_1.ValidationError('Validation failed', result.errors || {}));
                }
            }
            catch (error) {
                logger_1.logger.error('Custom validation error', error instanceof Error ? error : new Error(String(error)));
                next(error);
            }
        };
    }
    static getDataFromRequest(req, source) {
        switch (source) {
            case 'body':
                return req.body;
            case 'params':
                return req.params;
            case 'query':
                return req.query;
            case 'headers':
                return req.headers;
            default:
                return req.body;
        }
    }
    static setDataToRequest(req, source, data) {
        switch (source) {
            case 'body':
                req.body = data;
                break;
            case 'params':
                req.params = data;
                break;
            case 'query':
                req.query = data;
                break;
            case 'headers':
                req.headers = data;
                break;
            default:
                req.body = data;
        }
    }
    static sanitizeData(data) {
        const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
        if (typeof data !== 'object' || data === null) {
            return data;
        }
        const sanitized = Array.isArray(data) ? [] : {};
        for (const [key, value] of Object.entries(data)) {
            if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
                sanitized[key] = '[REDACTED]';
            }
            else if (typeof value === 'object' && value !== null) {
                sanitized[key] = this.sanitizeData(value);
            }
            else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }
}
exports.ValidationMiddleware = ValidationMiddleware;
// Common validation schemas using Joi
exports.commonSchemas = {
    pagination: joi_1.default.object({
        page: joi_1.default.number().min(1).default(1),
        limit: joi_1.default.number().min(1).max(100).default(10),
        sortBy: joi_1.default.string().optional(),
        sortOrder: joi_1.default.string().valid('asc', 'desc').default('desc'),
    }),
    id: joi_1.default.object({
        id: joi_1.default.string().required(),
    }),
    email: joi_1.default.string().email().required(),
    password: joi_1.default.string().min(8).max(128).required(),
    phone: joi_1.default.string().pattern(/^\+[1-9]\d{1,14}$/).required(),
    location: joi_1.default.object({
        latitude: joi_1.default.number().min(-90).max(90).required(),
        longitude: joi_1.default.number().min(-180).max(180).required(),
    }),
    dateRange: joi_1.default.object({
        from: joi_1.default.date().iso(),
        to: joi_1.default.date().iso().min(joi_1.default.ref('from')),
    }),
    language: joi_1.default.string().valid('en', 'es', 'fr', 'pt', 'hi', 'bn', 'id', 'vi'),
};
// Common validation schemas using Zod
exports.zodSchemas = {
    pagination: zod_1.z.object({
        page: zod_1.z.coerce.number().min(1).default(1),
        limit: zod_1.z.coerce.number().min(1).max(100).default(10),
        sortBy: zod_1.z.string().optional(),
        sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
    }),
    id: zod_1.z.object({
        id: zod_1.z.string().min(1),
    }),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8).max(128),
    phone: zod_1.z.string().regex(/^\+[1-9]\d{1,14}$/),
    location: zod_1.z.object({
        latitude: zod_1.z.number().min(-90).max(90),
        longitude: zod_1.z.number().min(-180).max(180),
    }),
    dateRange: zod_1.z.object({
        from: zod_1.z.coerce.date(),
        to: zod_1.z.coerce.date(),
    }).refine(data => data.to >= data.from, {
        message: "To date must be after from date",
    }),
    language: zod_1.z.enum(['en', 'es', 'fr', 'pt', 'hi', 'bn', 'id', 'vi']),
};
// Middleware functions
exports.validatePagination = ValidationMiddleware.joi(exports.commonSchemas.pagination, { source: 'query' });
exports.validateId = ValidationMiddleware.joi(exports.commonSchemas.id, { source: 'params' });
exports.validateLocation = ValidationMiddleware.joi(exports.commonSchemas.location, { source: 'body' });
exports.validateDateRange = ValidationMiddleware.joi(exports.commonSchemas.dateRange, { source: 'query' });
// Zod middleware functions
exports.validatePaginationZod = ValidationMiddleware.zod(exports.zodSchemas.pagination, { source: 'query' });
exports.validateIdZod = ValidationMiddleware.zod(exports.zodSchemas.id, { source: 'params' });
exports.validateLocationZod = ValidationMiddleware.zod(exports.zodSchemas.location, { source: 'body' });
exports.validateDateRangeZod = ValidationMiddleware.zod(exports.zodSchemas.dateRange, { source: 'query' });
exports.default = ValidationMiddleware;
//# sourceMappingURL=validation.js.map