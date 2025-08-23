import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { z } from 'zod';
import { ValidationError } from '@/utils/errors';
import { ValidatorSchema, ValidationOptions } from './validation.types';
import { logger } from '@/utils/logger';

export class ValidationMiddleware {
  static joi(schema: Joi.Schema, options: ValidationOptions = {}) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const { source = 'body', allowUnknown = false, stripUnknown = true } = options;
      
      const dataToValidate = this.getDataFromRequest(req, source);
      
      const { error, value } = schema.validate(dataToValidate, {
        allowUnknown,
        stripUnknown,
        abortEarly: false,
      });

      if (error) {
        const errors: Record<string, string[]> = {};
        
        error.details.forEach(detail => {
          const key = detail.path.join('.');
          if (!errors[key]) {
            errors[key] = [];
          }
          errors[key].push(detail.message);
        });

        logger.warn('Validation failed', {
          source,
          errors,
          data: this.sanitizeData(dataToValidate),
          endpoint: req.originalUrl,
          method: req.method,
        });

        return next(new ValidationError('Validation failed', errors));
      }

      // Replace the original data with validated data
      this.setDataToRequest(req, source, value);
      next();
    };
  }

  static zod<T>(schema: z.ZodSchema<T>, options: ValidationOptions = {}) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const { source = 'body' } = options;
      
      const dataToValidate = this.getDataFromRequest(req, source);
      
      try {
        const validatedData = schema.parse(dataToValidate);
        this.setDataToRequest(req, source, validatedData);
        next();
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errors: Record<string, string[]> = {};
          
          error.errors.forEach(err => {
            const key = err.path.join('.');
            if (!errors[key]) {
              errors[key] = [];
            }
            errors[key].push(err.message);
          });

          logger.warn('Zod validation failed', {
            source,
            errors,
            data: this.sanitizeData(dataToValidate),
            endpoint: req.originalUrl,
            method: req.method,
          });

          return next(new ValidationError('Validation failed', errors));
        }
        
        next(error);
      }
    };
  }

  static custom(validator: ValidatorSchema, options: ValidationOptions = {}) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { source = 'body' } = options;
      
      try {
        const dataToValidate = this.getDataFromRequest(req, source);
        const result = await validator(dataToValidate, req);
        
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
          });

          next(new ValidationError('Validation failed', result.errors || {}));
        }
      } catch (error) {
        logger.error('Custom validation error', error instanceof Error ? error : new Error(String(error)));
        next(error);
      }
    };
  }

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
      default:
        return req.body;
    }
  }

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
      default:
        req.body = data;
    }
  }

  private static sanitizeData(data: any): any {
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
    
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sanitized = Array.isArray(data) ? [] : {};
    
    for (const [key, value] of Object.entries(data)) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
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
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(10),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  }),

  id: Joi.object({
    id: Joi.string().required(),
  }),

  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  phone: Joi.string().pattern(/^\+[1-9]\d{1,14}$/).required(),
  
  location: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
  }),

  dateRange: Joi.object({
    from: Joi.date().iso(),
    to: Joi.date().iso().min(Joi.ref('from')),
  }),

  language: Joi.string().valid('en', 'es', 'fr', 'pt', 'hi', 'bn', 'id', 'vi'),
};

// Common validation schemas using Zod
export const zodSchemas = {
  pagination: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(10),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),

  id: z.object({
    id: z.string().min(1),
  }),

  email: z.string().email(),
  password: z.string().min(8).max(128),
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/),
  
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),

  dateRange: z.object({
    from: z.coerce.date(),
    to: z.coerce.date(),
  }).refine(data => data.to >= data.from, {
    message: "To date must be after from date",
  }),

  language: z.enum(['en', 'es', 'fr', 'pt', 'hi', 'bn', 'id', 'vi']),
};

// Middleware functions
export const validatePagination = ValidationMiddleware.joi(commonSchemas.pagination, { source: 'query' });
export const validateId = ValidationMiddleware.joi(commonSchemas.id, { source: 'params' });
export const validateLocation = ValidationMiddleware.joi(commonSchemas.location, { source: 'body' });
export const validateDateRange = ValidationMiddleware.joi(commonSchemas.dateRange, { source: 'query' });

// Zod middleware functions
export const validatePaginationZod = ValidationMiddleware.zod(zodSchemas.pagination, { source: 'query' });
export const validateIdZod = ValidationMiddleware.zod(zodSchemas.id, { source: 'params' });
export const validateLocationZod = ValidationMiddleware.zod(zodSchemas.location, { source: 'body' });
export const validateDateRangeZod = ValidationMiddleware.zod(zodSchemas.dateRange, { source: 'query' });

export default ValidationMiddleware;