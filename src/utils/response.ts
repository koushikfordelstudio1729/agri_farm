import { Response } from 'express';
import { PaginationResponse } from '@/types/common.types';
import { ValidationErrorDetail } from './errors.types';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: ResponseMeta;
  pagination?: PaginationResponse;
  timestamp: string;
  requestId?: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    name: string;
    message: string;
    code?: string;
    details?: ValidationErrorDetail[] | Record<string, unknown>;
    statusCode: number;
  };
  timestamp: string;
  requestId?: string;
}

export interface ResponseMeta {
  total?: number;
  count?: number;
  version?: string;
  cached?: boolean;
  cacheExpiry?: string;
  source?: string;
  processingTime?: string;
}

export class ApiResponseBuilder {
  private response: Partial<ApiResponse> = {
    success: true,
    timestamp: new Date().toISOString(),
  };

  static success<T>(data?: T, message?: string): ApiResponseBuilder {
    const builder = new ApiResponseBuilder();
    builder.response.success = true;
    if (data !== undefined) builder.response.data = data;
    if (message) builder.response.message = message;
    return builder;
  }

  static error(message: string, code?: string, statusCode: number = 400): ErrorResponse {
    return {
      success: false,
      error: {
        name: 'ApiError',
        message,
        code,
        statusCode,
      },
      timestamp: new Date().toISOString(),
    };
  }

  static validationError(
    message: string,
    details: ValidationErrorDetail[]
  ): ErrorResponse {
    return {
      success: false,
      error: {
        name: 'ValidationError',
        message,
        details,
        statusCode: 400,
      },
      timestamp: new Date().toISOString(),
    };
  }

  withMessage(message: string): ApiResponseBuilder {
    this.response.message = message;
    return this;
  }

  withData<T>(data: T): ApiResponseBuilder {
    this.response.data = data;
    return this;
  }

  withMeta(meta: Partial<ResponseMeta>): ApiResponseBuilder {
    this.response.meta = { ...this.response.meta, ...meta };
    return this;
  }

  withPagination(pagination: PaginationResponse): ApiResponseBuilder {
    this.response.pagination = pagination;
    return this;
  }

  withRequestId(requestId: string): ApiResponseBuilder {
    this.response.requestId = requestId;
    return this;
  }

  withProcessingTime(startTime: number): ApiResponseBuilder {
    const processingTime = `${Date.now() - startTime}ms`;
    this.response.meta = {
      ...this.response.meta,
      processingTime,
    };
    return this;
  }

  withCache(cached: boolean, expiry?: Date): ApiResponseBuilder {
    this.response.meta = {
      ...this.response.meta,
      cached,
      ...(expiry && { cacheExpiry: expiry.toISOString() }),
    };
    return this;
  }

  build(): ApiResponse {
    return this.response as ApiResponse;
  }
}

// Utility functions for standard responses
export const responseUtils = {
  success: <T>(res: Response, data?: T, message?: string, statusCode: number = 200): Response => {
    const response = ApiResponseBuilder.success(data, message).build();
    return res.status(statusCode).json(response);
  },

  created: <T>(res: Response, data: T, message: string = 'Resource created successfully'): Response => {
    const response = ApiResponseBuilder.success(data, message).build();
    return res.status(201).json(response);
  },

  updated: <T>(res: Response, data: T, message: string = 'Resource updated successfully'): Response => {
    const response = ApiResponseBuilder.success(data, message).build();
    return res.status(200).json(response);
  },

  deleted: (res: Response, message: string = 'Resource deleted successfully'): Response => {
    const response = ApiResponseBuilder.success(null, message).build();
    return res.status(200).json(response);
  },

  paginated: <T>(
    res: Response,
    data: T[],
    pagination: PaginationResponse,
    message?: string
  ): Response => {
    const response = ApiResponseBuilder
      .success(data, message)
      .withPagination(pagination)
      .withMeta({ 
        count: Array.isArray(data) ? data.length : 0,
        total: pagination.total 
      })
      .build();
    
    return res.status(200).json(response);
  },

  cached: <T>(
    res: Response,
    data: T,
    expiry: Date,
    message?: string
  ): Response => {
    const response = ApiResponseBuilder
      .success(data, message)
      .withCache(true, expiry)
      .build();
    
    return res.status(200).json(response);
  },

  error: (
    res: Response,
    message: string,
    statusCode: number = 400,
    code?: string,
    details?: ValidationErrorDetail[] | Record<string, unknown>
  ): Response => {
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        name: 'ApiError',
        message,
        statusCode,
        ...(code && { code }),
        ...(details && { details }),
      },
      timestamp: new Date().toISOString(),
    };

    return res.status(statusCode).json(errorResponse);
  },

  validationError: (
    res: Response,
    message: string,
    details: ValidationErrorDetail[]
  ): Response => {
    const errorResponse = ApiResponseBuilder.validationError(message, details);
    return res.status(400).json(errorResponse);
  },

  notFound: (res: Response, resource: string = 'Resource'): Response => {
    const errorResponse = ApiResponseBuilder.error(`${resource} not found`, 'NOT_FOUND', 404);
    return res.status(404).json(errorResponse);
  },

  unauthorized: (res: Response, message: string = 'Unauthorized access'): Response => {
    const errorResponse = ApiResponseBuilder.error(message, 'UNAUTHORIZED', 401);
    return res.status(401).json(errorResponse);
  },

  forbidden: (res: Response, message: string = 'Access denied'): Response => {
    const errorResponse = ApiResponseBuilder.error(message, 'FORBIDDEN', 403);
    return res.status(403).json(errorResponse);
  },

  conflict: (res: Response, message: string = 'Resource already exists'): Response => {
    const errorResponse = ApiResponseBuilder.error(message, 'CONFLICT', 409);
    return res.status(409).json(errorResponse);
  },

  rateLimited: (
    res: Response,
    message: string = 'Too many requests',
    retryAfter?: number
  ): Response => {
    if (retryAfter) {
      res.set('Retry-After', retryAfter.toString());
    }
    
    const errorResponse = ApiResponseBuilder.error(message, 'RATE_LIMITED', 429);
    return res.status(429).json(errorResponse);
  },

  internalError: (
    res: Response,
    message: string = 'Internal server error',
    includeDetails: boolean = false
  ): Response => {
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        name: 'InternalServerError',
        message: includeDetails ? message : 'An internal error occurred',
        statusCode: 500,
      },
      timestamp: new Date().toISOString(),
    };

    return res.status(500).json(errorResponse);
  },

  serviceUnavailable: (
    res: Response,
    message: string = 'Service temporarily unavailable'
  ): Response => {
    const errorResponse = ApiResponseBuilder.error(message, 'SERVICE_UNAVAILABLE', 503);
    return res.status(503).json(errorResponse);
  },

  maintenance: (
    res: Response,
    message: string = 'System under maintenance',
    estimatedDuration?: number
  ): Response => {
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        name: 'MaintenanceError',
        message,
        statusCode: 503,
        ...(estimatedDuration && { 
          details: { estimatedDuration: `${estimatedDuration} minutes` }
        }),
      },
      timestamp: new Date().toISOString(),
    };

    return res.status(503).json(errorResponse);
  },
};

// Middleware to add request ID to responses
export const addRequestId = (requestId: string) => {
  return (res: Response) => {
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      if (body && typeof body === 'object') {
        body.requestId = requestId;
      }
      return originalJson(body);
    };
    return res;
  };
};

// Response transformation utilities
export const responseTransformers = {
  removeFields: <T extends Record<string, any>>(
    data: T,
    fieldsToRemove: (keyof T)[]
  ): Partial<T> => {
    const result = { ...data };
    fieldsToRemove.forEach(field => delete result[field]);
    return result;
  },

  pickFields: <T extends Record<string, any>, K extends keyof T>(
    data: T,
    fieldsToPick: K[]
  ): Pick<T, K> => {
    const result = {} as Pick<T, K>;
    fieldsToPick.forEach(field => {
      if (field in data) {
        result[field] = data[field];
      }
    });
    return result;
  },

  transformDates: <T>(data: T): T => {
    if (data === null || data === undefined) return data;
    
    if (data instanceof Date) {
      return data.toISOString() as unknown as T;
    }
    
    if (Array.isArray(data)) {
      return data.map(item => responseTransformers.transformDates(item)) as unknown as T;
    }
    
    if (typeof data === 'object') {
      const result: any = {};
      Object.keys(data).forEach(key => {
        result[key] = responseTransformers.transformDates((data as any)[key]);
      });
      return result;
    }
    
    return data;
  },

  sanitizeUser: (user: any): any => {
    return responseTransformers.removeFields(user, [
      'password',
      'passwordResetToken',
      'emailVerificationToken',
      'phoneVerificationToken',
      'twoFactorSecret',
      '__v'
    ]);
  },

  addHateoas: <T>(
    data: T,
    links: Record<string, { href: string; method?: string; description?: string }>
  ): T & { _links: typeof links } => {
    return {
      ...data,
      _links: links,
    };
  },
};

// Content negotiation utilities
export const contentNegotiation = {
  handleAcceptHeader: (res: Response, acceptHeader: string, data: any): Response => {
    const accepts = acceptHeader.split(',').map(type => type.trim().toLowerCase());
    
    if (accepts.includes('application/xml') || accepts.includes('text/xml')) {
      res.set('Content-Type', 'application/xml');
      return res.send(contentNegotiation.toXML(data));
    }
    
    if (accepts.includes('text/csv')) {
      res.set('Content-Type', 'text/csv');
      return res.send(contentNegotiation.toCSV(data));
    }
    
    // Default to JSON
    return res.json(data);
  },

  toXML: (data: any): string => {
    const xmlify = (obj: any, indent: string = ''): string => {
      if (obj === null || obj === undefined) return '';
      
      if (typeof obj !== 'object') {
        return `${obj}`;
      }
      
      if (Array.isArray(obj)) {
        return obj.map(item => 
          `${indent}<item>\n${xmlify(item, indent + '  ')}\n${indent}</item>`
        ).join('\n');
      }
      
      return Object.keys(obj).map(key => 
        `${indent}<${key}>${xmlify(obj[key])}</${key}>`
      ).join('\n');
    };
    
    return `<?xml version="1.0" encoding="UTF-8"?>\n<response>\n${xmlify(data, '  ')}\n</response>`;
  },

  toCSV: (data: any): string => {
    if (!Array.isArray(data)) {
      data = [data];
    }
    
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    const csvRows = data.map((item: any) => 
      headers.map(header => {
        const value = item[header];
        return typeof value === 'string' && value.includes(',') 
          ? `"${value.replace(/"/g, '""')}"` 
          : value;
      }).join(',')
    );
    
    return [csvHeaders, ...csvRows].join('\n');
  },
};

export default responseUtils;