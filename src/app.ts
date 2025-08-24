import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import passport from 'passport';
import { config } from 'dotenv';
import { connectDatabase } from '@/config/database';
import { initializeCloudinary } from '@/config/cloudinary';
import logger, { loggerUtils } from '@/utils/logger';
import LoggingMiddleware from '@/middleware/logging';
import { BaseError, InternalServerError } from '@/utils/errors';
import { ApiResponse } from '@/types';

// Initialize social auth service
import '@/services/socialAuthService';

// Load environment variables
config();

interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
  errors?: Record<string, string[]>;
  stack?: string;
  requestId?: string;
}

class App {
  public app: Application;
  private readonly port: number;
  private readonly isDevelopment: boolean;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3000', 10);
    this.isDevelopment = process.env.NODE_ENV === 'development';

    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          fontSrc: ["'self'"],
          connectSrc: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }));

    // CORS configuration
    const corsOptions: cors.CorsOptions = {
      origin: (origin, callback) => {
        const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'];
        
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin) || this.isDevelopment) {
          return callback(null, true);
        }
        
        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
    };

    this.app.use(cors(corsOptions));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '15', 10) * 60 * 1000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10), // limit each IP to 100 requests per windowMs
      message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.',
        error: 'Rate limit exceeded',
      } as ApiResponse,
      standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
      legacyHeaders: false, // Disable the `X-RateLimit-*` headers
      handler: (req: Request, res: Response) => {
        logger.warn('Rate limit exceeded', {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          endpoint: req.originalUrl,
          method: req.method,
        });

        res.status(429).json({
          success: false,
          message: 'Too many requests from this IP, please try again later.',
          error: 'Rate limit exceeded',
        } as ApiResponse);
      },
    });

    this.app.use(limiter);

    // Body parsing middleware
    this.app.use(express.json({ 
      limit: process.env.JSON_LIMIT || '10mb',
      verify: (req: Request, res: Response, buf: Buffer) => {
        (req as any).rawBody = buf;
      },
    }));
    
    this.app.use(express.urlencoded({ 
      extended: true, 
      limit: process.env.URL_ENCODED_LIMIT || '10mb',
    }));

    // Initialize passport for OAuth
    this.app.use(passport.initialize());

    // Trust proxy for accurate IP addresses
    this.app.set('trust proxy', 1);

    // Request logging
    this.app.use(LoggingMiddleware.requestResponse());

    // Request ID middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const requestId = (req.headers['x-request-id'] as string) || this.generateRequestId();
      (req as any).id = requestId;
      res.setHeader('x-request-id', requestId);
      next();
    });

    // Health check endpoint (before authentication)
    this.app.get('/health', this.healthCheck);
    this.app.get('/api/health', this.healthCheck);
  }

  private initializeRoutes(): void {
    // API routes
    this.app.use('/api', this.createApiRouter());

    // Catch-all for undefined routes
    this.app.all('*', (req: Request, res: Response) => {
      const message = `Route ${req.originalUrl} not found`;
      logger.warn(message, {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(404).json({
        success: false,
        message,
        error: 'Not Found',
      } as ApiResponse);
    });
  }

  private createApiRouter(): express.Router {
    // Import the main routes router
    const apiRoutes = require('./routes').default;
    return apiRoutes;
  }

  private initializeErrorHandling(): void {
    // Error handling middleware
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      this.handleError(error, req, res);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception', error, {
        category: 'system',
        severity: 'critical',
      });
      
      // Gracefully close the server
      this.gracefulShutdown();
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
      logger.error('Unhandled Rejection', reason instanceof Error ? reason : new Error(String(reason)), {
        category: 'system',
        severity: 'critical',
        promise: promise.toString(),
      });
      
      // Gracefully close the server
      this.gracefulShutdown();
    });

    // Handle SIGTERM (used by process managers like PM2)
    process.on('SIGTERM', () => {
      logger.info('SIGTERM signal received, shutting down gracefully');
      this.gracefulShutdown();
    });

    // Handle SIGINT (Ctrl+C)
    process.on('SIGINT', () => {
      logger.info('SIGINT signal received, shutting down gracefully');
      this.gracefulShutdown();
    });
  }

  private handleError(error: Error, req: Request, res: Response): void {
    const requestId = (req as any).id;
    
    // Log the error
    logger.error('Request error', error, {
      requestId,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      userId: (req as any).user?.id,
    });

    // Handle known errors
    if (error instanceof BaseError) {
      const response: ErrorResponse = {
        success: false,
        message: error.message,
        error: error.name,
        requestId,
      };

      // Add validation errors if present
      if ('errors' in error && error.errors) {
        response.errors = error.errors as Record<string, string[]>;
      }

      // Add stack trace in development
      if (this.isDevelopment) {
        response.stack = error.stack;
      }

      res.status(error.statusCode).json(response);
      return;
    }

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors: Record<string, string[]> = {};
      
      if ('errors' in error) {
        const mongooseErrors = error.errors as Record<string, { message: string }>;
        Object.keys(mongooseErrors).forEach(field => {
          validationErrors[field] = [mongooseErrors[field]?.message || 'Validation error'];
        });
      }

      res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: 'ValidationError',
        errors: validationErrors,
        requestId,
        ...(this.isDevelopment && { stack: error.stack }),
      } as ErrorResponse);
      return;
    }

    // Handle MongoDB duplicate key errors
    if (error.name === 'MongoServerError' && 'code' in error && error.code === 11000) {
      const field = Object.keys((error as any).keyValue || {})[0] || 'field';
      const value = (error as any).keyValue?.[field] || 'unknown';
      
      res.status(409).json({
        success: false,
        message: `${field} '${value}' already exists`,
        error: 'ConflictError',
        requestId,
        ...(this.isDevelopment && { stack: error.stack }),
      } as ErrorResponse);
      return;
    }

    // Handle JWT errors
    if (error.name === 'JsonWebTokenError') {
      res.status(401).json({
        success: false,
        message: 'Invalid token',
        error: 'AuthenticationError',
        requestId,
        ...(this.isDevelopment && { stack: error.stack }),
      } as ErrorResponse);
      return;
    }

    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        message: 'Token expired',
        error: 'AuthenticationError',
        requestId,
        ...(this.isDevelopment && { stack: error.stack }),
      } as ErrorResponse);
      return;
    }

    // Handle unknown errors
    const internalError = new InternalServerError('An unexpected error occurred');
    res.status(internalError.statusCode).json({
      success: false,
      message: internalError.message,
      error: internalError.name,
      requestId,
      ...(this.isDevelopment && { stack: error.stack }),
    } as ErrorResponse);
  }

  private healthCheck = async (req: Request, res: Response): Promise<void> => {
    try {
      const start = Date.now();
      
      // Check database connection
      const dbHealth = await this.checkDatabaseHealth();
      
      // Check Cloudinary connection (if configured)
      const cloudinaryHealth = await this.checkCloudinaryHealth();
      
      const responseTime = Date.now() - start;
      
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        responseTime,
        services: {
          database: dbHealth,
          cloudinary: cloudinaryHealth,
        },
        resources: {
          memory: {
            used: process.memoryUsage().heapUsed,
            total: process.memoryUsage().heapTotal,
            external: process.memoryUsage().external,
          },
          cpu: process.cpuUsage(),
        },
      };

      res.json({
        success: true,
        message: 'System is healthy',
        data: health,
      });
    } catch (error) {
      logger.error('Health check failed', error instanceof Error ? error : new Error(String(error)));
      
      res.status(503).json({
        success: false,
        message: 'System health check failed',
        error: 'ServiceUnavailable',
      });
    }
  };

  private async checkDatabaseHealth(): Promise<{
    status: 'up' | 'down';
    responseTime: number;
  }> {
    try {
      const start = Date.now();
      // This will be implemented when database connection is available
      // await mongoose.connection.db.admin().ping();
      const responseTime = Date.now() - start;
      
      return {
        status: 'up',
        responseTime,
      };
    } catch (error) {
      return {
        status: 'down',
        responseTime: 0,
      };
    }
  }

  private async checkCloudinaryHealth(): Promise<{
    status: 'up' | 'down';
    responseTime: number;
  }> {
    try {
      const start = Date.now();
      // This will be implemented when Cloudinary is configured
      const responseTime = Date.now() - start;
      
      return {
        status: 'up',
        responseTime,
      };
    } catch (error) {
      return {
        status: 'down',
        responseTime: 0,
      };
    }
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  private gracefulShutdown(): void {
    // Set a timeout to forcefully shutdown if graceful shutdown takes too long
    const forceShutdown = setTimeout(() => {
      logger.error('Forced shutdown due to timeout');
      process.exit(1);
    }, 10000);

    // Clear the force shutdown timeout if graceful shutdown completes
    process.on('exit', () => {
      clearTimeout(forceShutdown);
    });

    // Close the server
    if (this.server) {
      this.server.close((err?: Error) => {
        if (err) {
          logger.error('Error during server shutdown', err);
          process.exit(1);
        }
        
        logger.info('Server closed successfully');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  }

  private server: any;

  public async start(): Promise<void> {
    try {
      // Initialize external services
      await connectDatabase();
      initializeCloudinary();

      // Start the server
      this.server = this.app.listen(this.port, () => {
        logger.info(`Server started successfully`, {
          port: this.port,
          environment: process.env.NODE_ENV || 'development',
          nodeVersion: process.version,
          pid: process.pid,
        });

        if (this.isDevelopment) {
          console.log(`🚀 Server running on http://localhost:${this.port}`);
          console.log(`📚 Health check: http://localhost:${this.port}/health`);
          console.log(`🔗 API docs: http://localhost:${this.port}/api/docs`);
        }
      });

      // Handle server errors
      this.server.on('error', (error: Error) => {
        logger.error('Server error', error);
        this.gracefulShutdown();
      });

    } catch (error) {
      logger.error('Failed to start server', error instanceof Error ? error : new Error(String(error)));
      process.exit(1);
    }
  }
}

export default App;