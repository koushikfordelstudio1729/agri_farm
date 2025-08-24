import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { z } from 'zod';
import validator from 'validator';
import { ValidationError } from '@/utils/errors';
import { logger } from '@/utils/logger';
import type {
  ValidatorSchema,
  ValidationOptions,
  ValidationResult,
  CustomValidationRule,
  RequestValidator,
  ValidationContext,
} from '@/types/validation.types';

class ValidationMiddleware {
  private static customRules: Map<string, CustomValidationRule> = new Map();

  /**
   * Joi validation middleware
   */
  static joi(schema: Joi.Schema, options: ValidationOptions = {}) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const { 
        source = 'body', 
        allowUnknown = false, 
        stripUnknown = true,
        skipOnEmpty = false,
        context,
      } = options;
      
      const dataToValidate = this.getDataFromRequest(req, source);
      
      // Skip validation if data is empty and skipOnEmpty is true
      if (skipOnEmpty && this.isEmpty(dataToValidate)) {
        return next();
      }
      
      const validationOptions: Joi.ValidationOptions = {
        allowUnknown,
        stripUnknown,
        abortEarly: false,
        context: context || this.createValidationContext(req),
      };

      const { error, value } = schema.validate(dataToValidate, validationOptions);

      if (error) {
        const errors = this.processJoiErrors(error.details);

        logger.warn('Joi validation failed', {
          source,
          errors,
          data: this.sanitizeData(dataToValidate),
          endpoint: req.originalUrl,
          method: req.method,
          userAgent: req.get('User-Agent'),
        });

        return next(new ValidationError('Validation failed', errors));
      }

      // Replace the original data with validated data
      this.setDataToRequest(req, source, value);
      next();
    };
  }

  /**
   * Zod validation middleware
   */
  static zod<T>(schema: z.ZodSchema<T>, options: ValidationOptions = {}) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const { source = 'body', skipOnEmpty = false, context } = options;
      
      const dataToValidate = this.getDataFromRequest(req, source);
      
      // Skip validation if data is empty and skipOnEmpty is true
      if (skipOnEmpty && this.isEmpty(dataToValidate)) {
        return next();
      }
      
      try {
        // Add context to Zod validation if needed
        const validationContext = context || this.createValidationContext(req);
        
        let validatedData: T;
        if (schema instanceof z.ZodObject && 'setContext' in schema) {
          // Some Zod extensions support context
          validatedData = (schema as any).setContext(validationContext).parse(dataToValidate);
        } else {
          validatedData = schema.parse(dataToValidate);
        }
        
        this.setDataToRequest(req, source, validatedData);
        next();
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errors = this.processZodErrors(error.errors);

          logger.warn('Zod validation failed', {
            source,
            errors,
            data: this.sanitizeData(dataToValidate),
            endpoint: req.originalUrl,
            method: req.method,
            userAgent: req.get('User-Agent'),
          });

          return next(new ValidationError('Validation failed', errors));
        }
        
        next(error);
      }
    };
  }

  /**
   * Custom validation middleware
   */
  static custom(validator: ValidatorSchema, options: ValidationOptions = {}) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { source = 'body', skipOnEmpty = false, context } = options;
      
      try {
        const dataToValidate = this.getDataFromRequest(req, source);
        
        // Skip validation if data is empty and skipOnEmpty is true
        if (skipOnEmpty && this.isEmpty(dataToValidate)) {
          return next();
        }

        const validationContext = context || this.createValidationContext(req);
        const result = await validator(dataToValidate, req, validationContext);
        
        if (result.isValid) {
          if (result.data) {
            this.setDataToRequest(req, source, result.data);
          }
          next();
        } else {
          logger.warn('Custom validation failed', {
            source,
            errors: result.errors,
            data: this.sanitizeData(dataToValidate),
            endpoint: req.originalUrl,
            method: req.method,
            userAgent: req.get('User-Agent'),
          });

          next(new ValidationError('Validation failed', result.errors || {}));
        }
      } catch (error) {
        logger.error('Custom validation error', { 
          error: error instanceof Error ? error : new Error(String(error)),
          endpoint: req.originalUrl,
          method: req.method,
        });
        next(error);
      }
    };
  }

  /**
   * Request-wide validation
   */
  static validateRequest(config: RequestValidator) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const errors: Record<string, string[]> = {};
        let hasErrors = false;

        // Validate different parts of the request
        for (const [source, schema] of Object.entries(config)) {
          if (!schema) continue;

          const dataToValidate = this.getDataFromRequest(req, source);
          
          let validationResult: ValidationResult;
          
          if ('validate' in schema) {
            // Joi schema
            const { error, value } = schema.validate(dataToValidate, {
              allowUnknown: false,
              stripUnknown: true,
              abortEarly: false,
            });

            if (error) {
              const joiErrors = this.processJoiErrors(error.details);
              Object.assign(errors, joiErrors);
              hasErrors = true;
            } else {
              this.setDataToRequest(req, source, value);
            }
          } else if ('parse' in schema) {
            // Zod schema
            try {
              const validatedData = schema.parse(dataToValidate);
              this.setDataToRequest(req, source, validatedData);
            } catch (zodError) {
              if (zodError instanceof z.ZodError) {
                const zodErrors = this.processZodErrors(zodError.errors);
                Object.assign(errors, zodErrors);
                hasErrors = true;
              }
            }
          } else if (typeof schema === 'function') {
            // Custom validator function
            validationResult = await schema(dataToValidate, req);
            if (!validationResult.isValid) {
              Object.assign(errors, validationResult.errors || {});
              hasErrors = true;
            } else if (validationResult.data) {
              this.setDataToRequest(req, source, validationResult.data);
            }
          }
        }

        if (hasErrors) {
          logger.warn('Request validation failed', {
            errors,
            endpoint: req.originalUrl,
            method: req.method,
            userAgent: req.get('User-Agent'),
          });

          return next(new ValidationError('Request validation failed', errors));
        }

        next();
      } catch (error) {
        logger.error('Request validation error', {
          error: error instanceof Error ? error : new Error(String(error)),
          endpoint: req.originalUrl,
          method: req.method,
        });
        next(error);
      }
    };
  }

  /**
   * Register custom validation rule
   */
  static registerCustomRule(name: string, rule: CustomValidationRule): void {
    this.customRules.set(name, rule);
    logger.info('Custom validation rule registered', { name });
  }

  /**
   * Get custom validation rule
   */
  static getCustomRule(name: string): CustomValidationRule | undefined {
    return this.customRules.get(name);
  }

  /**
   * Sanitize array validation
   */
  static sanitizeArray<T>(
    items: any[],
    itemValidator: (item: any) => T | null,
    options: { maxItems?: number; minItems?: number; unique?: boolean } = {}
  ): T[] {
    const { maxItems = 1000, minItems = 0, unique = false } = options;
    
    if (!Array.isArray(items)) {
      return [];
    }

    // Limit array size for security
    const limitedItems = items.slice(0, maxItems);
    
    // Validate and filter items
    const validatedItems = limitedItems
      .map(itemValidator)
      .filter((item): item is T => item !== null);

    // Remove duplicates if unique is required
    const result = unique 
      ? validatedItems.filter((item, index, arr) => 
          arr.findIndex(other => JSON.stringify(other) === JSON.stringify(item)) === index
        )
      : validatedItems;

    // Check minimum items
    if (result.length < minItems) {
      throw new ValidationError(`Array must contain at least ${minItems} valid items`);
    }

    return result;
  }

  /**
   * Advanced sanitization
   */
  static sanitizeInput(input: any, options: {
    maxLength?: number;
    allowedChars?: RegExp;
    trim?: boolean;
    toLowerCase?: boolean;
    escapeHtml?: boolean;
  } = {}): string {
    const {
      maxLength = 10000,
      allowedChars,
      trim = true,
      toLowerCase = false,
      escapeHtml = true,
    } = options;

    if (typeof input !== 'string') {
      input = String(input || '');
    }

    let sanitized = input;

    // Trim whitespace
    if (trim) {
      sanitized = sanitized.trim();
    }

    // Convert to lowercase
    if (toLowerCase) {
      sanitized = sanitized.toLowerCase();
    }

    // Limit length
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    // Filter allowed characters
    if (allowedChars) {
      sanitized = sanitized.replace(new RegExp(`[^${allowedChars.source}]`, 'g'), '');
    }

    // Escape HTML
    if (escapeHtml) {
      sanitized = validator.escape(sanitized);
    }

    return sanitized;
  }

  /**
   * Process Joi validation errors
   */
  private static processJoiErrors(details: Joi.ValidationErrorItem[]): Record<string, string[]> {
    const errors: Record<string, string[]> = {};
    
    details.forEach(detail => {
      const key = detail.path.join('.');
      if (!errors[key]) {
        errors[key] = [];
      }
      
      // Customize error messages
      let message = detail.message;
      if (detail.type === 'string.email') {
        message = 'Please provide a valid email address';
      } else if (detail.type === 'string.min') {
        message = `Must be at least ${detail.context?.limit} characters long`;
      } else if (detail.type === 'string.max') {
        message = `Must not exceed ${detail.context?.limit} characters`;
      } else if (detail.type === 'any.required') {
        message = 'This field is required';
      }
      
      errors[key].push(message);
    });

    return errors;
  }

  /**
   * Process Zod validation errors
   */
  private static processZodErrors(errors: z.ZodIssue[]): Record<string, string[]> {
    const processedErrors: Record<string, string[]> = {};
    
    errors.forEach(err => {
      const key = err.path.join('.');
      if (!processedErrors[key]) {
        processedErrors[key] = [];
      }
      
      // Customize error messages
      let message = err.message;
      if (err.code === z.ZodIssueCode.invalid_type) {
        message = `Expected ${err.expected}, received ${err.received}`;
      } else if (err.code === z.ZodIssueCode.too_small) {
        message = `Must be at least ${err.minimum} ${err.type === 'string' ? 'characters' : 'items'}`;
      } else if (err.code === z.ZodIssueCode.too_big) {
        message = `Must not exceed ${err.maximum} ${err.type === 'string' ? 'characters' : 'items'}`;
      }
      
      processedErrors[key].push(message);
    });

    return processedErrors;
  }

  /**
   * Get data from request based on source
   */
  private static getDataFromRequest(req: Request, source: string): any {
    switch (source) {
      case 'body':
        return req.body;
      case 'params':
        return req.params;
      case 'query':
        return req.query;
      case 'headers':
        return req.headers;
      case 'cookies':
        return req.cookies;
      default:
        return req.body;
    }
  }

  /**
   * Set data to request based on source
   */
  private static setDataToRequest(req: Request, source: string, data: any): void {
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
      case 'cookies':
        req.cookies = data;
        break;
      default:
        req.body = data;
    }
  }

  /**
   * Create validation context from request
   */
  private static createValidationContext(req: Request): ValidationContext {
    return {
      userId: (req as any).user?.id,
      userRole: (req as any).user?.role,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date(),
      endpoint: req.originalUrl,
      method: req.method,
    };
  }

  /**
   * Check if data is empty
   */
  private static isEmpty(data: any): boolean {
    if (data === null || data === undefined) return true;
    if (typeof data === 'string') return data.trim() === '';
    if (Array.isArray(data)) return data.length === 0;
    if (typeof data === 'object') return Object.keys(data).length === 0;
    return false;
  }

  /**
   * Sanitize sensitive data for logging
   */
  private static sanitizeData(data: any): any {
    const sensitiveFields = [
      'password', 'token', 'secret', 'key', 'authorization', 'apikey',
      'auth', 'credential', 'pass', 'pwd', 'otp', 'pin', 'ssn', 'credit',
    ];
    
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sanitized = Array.isArray(data) ? [] : {};
    
    for (const [key, value] of Object.entries(data)) {
      const keyLower = key.toLowerCase();
      const isSensitive = sensitiveFields.some(field => keyLower.includes(field));
      
      if (isSensitive) {
        (sanitized as any)[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        (sanitized as any)[key] = this.sanitizeData(value);
      } else {
        (sanitized as any)[key] = value;
      }
    }
    
    return sanitized;
  }
}

// Common validation schemas using Joi
export const commonSchemas = {
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  }),

  mongoId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).message('Invalid ID format'),
  
  id: Joi.object({
    id: Joi.alternatives().try(
      Joi.string().regex(/^[0-9a-fA-F]{24}$/),
      Joi.string().uuid(),
      Joi.number().integer().min(1)
    ).required(),
  }),

  email: Joi.string()
    .email({ minDomainSegments: 2, tlds: { allow: true } })
    .max(254)
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.max': 'Email address is too long',
    }),

  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    }),

  phone: Joi.string()
    .pattern(/^\+[1-9]\d{1,14}$/)
    .required()
    .messages({
      'string.pattern.base': 'Please provide a valid phone number with country code (e.g., +1234567890)',
    }),
  
  location: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    address: Joi.string().max(500).optional(),
  }),

  dateRange: Joi.object({
    from: Joi.date().iso().max('now'),
    to: Joi.date().iso().min(Joi.ref('from')).max('now'),
  }).with('from', 'to'),

  language: Joi.string().valid('en', 'es', 'fr', 'pt', 'hi', 'bn', 'id', 'vi').default('en'),

  url: Joi.string().uri({ scheme: ['http', 'https'] }).max(2048),

  slug: Joi.string().pattern(/^[a-z0-9-]+$/).min(3).max(100),

  searchQuery: Joi.string().min(2).max(100).trim(),

  base64Image: Joi.string().pattern(/^data:image\/(jpeg|jpg|png|webp);base64,/),
};

// Common validation schemas using Zod
export const zodSchemas = {
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),

  mongoId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format'),
  
  id: z.object({
    id: z.union([
      z.string().regex(/^[0-9a-fA-F]{24}$/),
      z.string().uuid(),
      z.coerce.number().int().min(1),
    ]),
  }),

  email: z.string()
    .email('Please provide a valid email address')
    .max(254, 'Email address is too long'),

  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password is too long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),

  phone: z.string()
    .regex(/^\+[1-9]\d{1,14}$/, 'Please provide a valid phone number with country code (e.g., +1234567890)'),
  
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    address: z.string().max(500).optional(),
  }),

  dateRange: z.object({
    from: z.coerce.date().max(new Date(), 'Date cannot be in the future'),
    to: z.coerce.date().max(new Date(), 'Date cannot be in the future'),
  }).refine(data => data.to >= data.from, {
    message: 'End date must be after start date',
    path: ['to'],
  }),

  language: z.enum(['en', 'es', 'fr', 'pt', 'hi', 'bn', 'id', 'vi']).default('en'),

  url: z.string().url().max(2048),

  slug: z.string().regex(/^[a-z0-9-]+$/).min(3).max(100),

  searchQuery: z.string().min(2).max(100).trim(),

  base64Image: z.string().regex(/^data:image\/(jpeg|jpg|png|webp);base64,/),
};

// Pre-built middleware functions
export const validateRequest = ValidationMiddleware.validateRequest;
export const validatePagination = ValidationMiddleware.joi(commonSchemas.pagination, { source: 'query' });
export const validateId = ValidationMiddleware.joi(commonSchemas.id, { source: 'params' });
export const validateLocation = ValidationMiddleware.joi(commonSchemas.location, { source: 'body' });
export const validateDateRange = ValidationMiddleware.joi(commonSchemas.dateRange, { source: 'query' });
export const validateSearchQuery = ValidationMiddleware.joi(
  Joi.object({ q: commonSchemas.searchQuery.required() }), 
  { source: 'query' }
);

// Zod middleware functions
export const validatePaginationZod = ValidationMiddleware.zod(zodSchemas.pagination, { source: 'query' });
export const validateIdZod = ValidationMiddleware.zod(zodSchemas.id, { source: 'params' });
export const validateLocationZod = ValidationMiddleware.zod(zodSchemas.location, { source: 'body' });
export const validateDateRangeZod = ValidationMiddleware.zod(zodSchemas.dateRange, { source: 'query' });

// Utility functions
export const sanitizeArray = ValidationMiddleware.sanitizeArray;
export const sanitizeInput = ValidationMiddleware.sanitizeInput;
export const registerCustomRule = ValidationMiddleware.registerCustomRule;

export { ValidationMiddleware };
export default ValidationMiddleware;