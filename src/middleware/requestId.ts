import { Request, Response, NextFunction } from 'express';
import { generateSecureToken } from '@/utils/helpers';

export interface RequestIdOptions {
  header?: string;
  generator?: () => string;
  setResponseHeader?: boolean;
  attributeName?: string;
}

class RequestIdMiddleware {
  // Generate and attach request ID to requests
  static generate(options: RequestIdOptions = {}) {
    const {
      header = 'x-request-id',
      generator = () => `req_${Date.now()}_${generateSecureToken(8)}`,
      setResponseHeader = true,
      attributeName = 'id',
    } = options;

    return (req: Request, res: Response, next: NextFunction): void => {
      // Check if request ID already exists in header
      let requestId = req.headers[header.toLowerCase()] as string;
      
      // Generate new ID if not provided
      if (!requestId) {
        requestId = generator();
      }

      // Attach to request object
      (req as any)[attributeName] = requestId;
      
      // Set response header
      if (setResponseHeader) {
        res.set(header, requestId);
      }

      next();
    };
  }

  // UUID-based request ID
  static uuid(options: Omit<RequestIdOptions, 'generator'> = {}) {
    return this.generate({
      generator: () => require('crypto').randomUUID(),
      ...options,
    });
  }

  // Short request ID for logs
  static short(options: Omit<RequestIdOptions, 'generator'> = {}) {
    return this.generate({
      generator: () => Math.random().toString(36).substr(2, 9),
      ...options,
    });
  }

  // Hierarchical request ID (useful for microservices)
  static hierarchical(serviceId: string, options: Omit<RequestIdOptions, 'generator'> = {}) {
    let counter = 0;
    
    return this.generate({
      generator: () => `${serviceId}.${Date.now()}.${++counter}`,
      ...options,
    });
  }

  // Request ID with correlation support
  static withCorrelation(options: RequestIdOptions & {
    correlationHeader?: string;
    correlationAttributeName?: string;
  } = {}) {
    const {
      correlationHeader = 'x-correlation-id',
      correlationAttributeName = 'correlationId',
      ...requestIdOptions
    } = options;

    const requestIdMiddleware = this.generate(requestIdOptions);

    return (req: Request, res: Response, next: NextFunction): void => {
      // Apply request ID middleware first
      requestIdMiddleware(req, res, () => {
        // Handle correlation ID
        let correlationId = req.headers[correlationHeader.toLowerCase()] as string;
        
        if (!correlationId) {
          // Use request ID as correlation ID if not provided
          correlationId = (req as any)[requestIdOptions.attributeName || 'id'];
        }

        // Attach correlation ID
        (req as any)[correlationAttributeName] = correlationId;
        
        // Set correlation header in response
        res.set(correlationHeader, correlationId);
        
        next();
      });
    };
  }

  // Request ID validation
  static validate(options: {
    header?: string;
    required?: boolean;
    pattern?: RegExp;
    maxLength?: number;
  } = {}) {
    const {
      header = 'x-request-id',
      required = false,
      pattern,
      maxLength = 255,
    } = options;

    return (req: Request, res: Response, next: NextFunction): void => {
      const requestId = req.headers[header.toLowerCase()] as string;

      // Check if required
      if (required && !requestId) {
        return res.status(400).json({
          success: false,
          error: {
            message: `${header} header is required`,
            code: 'MISSING_REQUEST_ID',
          },
        });
      }

      if (requestId) {
        // Check length
        if (requestId.length > maxLength) {
          return res.status(400).json({
            success: false,
            error: {
              message: `${header} header is too long`,
              code: 'INVALID_REQUEST_ID',
            },
          });
        }

        // Check pattern
        if (pattern && !pattern.test(requestId)) {
          return res.status(400).json({
            success: false,
            error: {
              message: `${header} header format is invalid`,
              code: 'INVALID_REQUEST_ID',
            },
          });
        }
      }

      next();
    };
  }
}

export default RequestIdMiddleware;