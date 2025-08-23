"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = require("dotenv");
const database_1 = require("@/config/database");
const cloudinary_1 = require("@/config/cloudinary");
const logger_1 = require("@/utils/logger");
const errors_1 = require("@/utils/errors");
// Load environment variables
(0, dotenv_1.config)();
class App {
    app;
    port;
    isDevelopment;
    constructor() {
        this.app = (0, express_1.default)();
        this.port = parseInt(process.env.PORT || '3000', 10);
        this.isDevelopment = process.env.NODE_ENV === 'development';
        this.initializeMiddlewares();
        this.initializeRoutes();
        this.initializeErrorHandling();
    }
    initializeMiddlewares() {
        // Security middleware
        this.app.use((0, helmet_1.default)({
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
        const corsOptions = {
            origin: (origin, callback) => {
                const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'];
                // Allow requests with no origin (like mobile apps or curl requests)
                if (!origin)
                    return callback(null, true);
                if (allowedOrigins.includes(origin) || this.isDevelopment) {
                    return callback(null, true);
                }
                return callback(new Error('Not allowed by CORS'));
            },
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
        };
        this.app.use((0, cors_1.default)(corsOptions));
        // Rate limiting
        const limiter = (0, express_rate_limit_1.default)({
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '15', 10) * 60 * 1000, // 15 minutes
            max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10), // limit each IP to 100 requests per windowMs
            message: {
                success: false,
                message: 'Too many requests from this IP, please try again later.',
                error: 'Rate limit exceeded',
            },
            standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
            legacyHeaders: false, // Disable the `X-RateLimit-*` headers
            handler: (req, res) => {
                logger_1.logger.warn('Rate limit exceeded', {
                    ip: req.ip,
                    userAgent: req.headers['user-agent'],
                    endpoint: req.originalUrl,
                    method: req.method,
                });
                res.status(429).json({
                    success: false,
                    message: 'Too many requests from this IP, please try again later.',
                    error: 'Rate limit exceeded',
                });
            },
        });
        this.app.use(limiter);
        // Body parsing middleware
        this.app.use(express_1.default.json({
            limit: process.env.JSON_LIMIT || '10mb',
            verify: (req, res, buf) => {
                req.rawBody = buf;
            },
        }));
        this.app.use(express_1.default.urlencoded({
            extended: true,
            limit: process.env.URL_ENCODED_LIMIT || '10mb',
        }));
        // Trust proxy for accurate IP addresses
        this.app.set('trust proxy', 1);
        // Request logging
        this.app.use(logger_1.requestLogger);
        // Request ID middleware
        this.app.use((req, res, next) => {
            const requestId = req.headers['x-request-id'] || this.generateRequestId();
            req.id = requestId;
            res.setHeader('x-request-id', requestId);
            next();
        });
        // Health check endpoint (before authentication)
        this.app.get('/health', this.healthCheck);
        this.app.get('/api/health', this.healthCheck);
    }
    initializeRoutes() {
        // API routes
        this.app.use('/api', this.createApiRouter());
        // Catch-all for undefined routes
        this.app.all('*', (req, res) => {
            const message = `Route ${req.originalUrl} not found`;
            logger_1.logger.warn(message, {
                method: req.method,
                url: req.originalUrl,
                ip: req.ip,
                userAgent: req.headers['user-agent'],
            });
            res.status(404).json({
                success: false,
                message,
                error: 'Not Found',
            });
        });
    }
    createApiRouter() {
        // Import the main routes router
        const apiRoutes = require('./routes').default;
        return apiRoutes;
    }
    initializeErrorHandling() {
        // Error handling middleware
        this.app.use((error, req, res, next) => {
            this.handleError(error, req, res);
        });
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            logger_1.logger.error('Uncaught Exception', error, {
                category: 'system',
                severity: 'critical',
            });
            // Gracefully close the server
            this.gracefulShutdown();
        });
        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            logger_1.logger.error('Unhandled Rejection', reason instanceof Error ? reason : new Error(String(reason)), {
                category: 'system',
                severity: 'critical',
                promise: promise.toString(),
            });
            // Gracefully close the server
            this.gracefulShutdown();
        });
        // Handle SIGTERM (used by process managers like PM2)
        process.on('SIGTERM', () => {
            logger_1.logger.info('SIGTERM signal received, shutting down gracefully');
            this.gracefulShutdown();
        });
        // Handle SIGINT (Ctrl+C)
        process.on('SIGINT', () => {
            logger_1.logger.info('SIGINT signal received, shutting down gracefully');
            this.gracefulShutdown();
        });
    }
    handleError(error, req, res) {
        const requestId = req.id;
        // Log the error
        logger_1.logger.error('Request error', error, {
            requestId,
            method: req.method,
            url: req.originalUrl,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            userId: req.user?.id,
        });
        // Handle known errors
        if (error instanceof errors_1.BaseError) {
            const response = {
                success: false,
                message: error.message,
                error: error.name,
                requestId,
            };
            // Add validation errors if present
            if ('errors' in error && error.errors) {
                response.errors = error.errors;
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
            const validationErrors = {};
            if ('errors' in error) {
                const mongooseErrors = error.errors;
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
            });
            return;
        }
        // Handle MongoDB duplicate key errors
        if (error.name === 'MongoServerError' && 'code' in error && error.code === 11000) {
            const field = Object.keys(error.keyValue || {})[0] || 'field';
            const value = error.keyValue?.[field] || 'unknown';
            res.status(409).json({
                success: false,
                message: `${field} '${value}' already exists`,
                error: 'ConflictError',
                requestId,
                ...(this.isDevelopment && { stack: error.stack }),
            });
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
            });
            return;
        }
        if (error.name === 'TokenExpiredError') {
            res.status(401).json({
                success: false,
                message: 'Token expired',
                error: 'AuthenticationError',
                requestId,
                ...(this.isDevelopment && { stack: error.stack }),
            });
            return;
        }
        // Handle unknown errors
        const internalError = new errors_1.InternalServerError('An unexpected error occurred');
        res.status(internalError.statusCode).json({
            success: false,
            message: internalError.message,
            error: internalError.name,
            requestId,
            ...(this.isDevelopment && { stack: error.stack }),
        });
    }
    healthCheck = async (req, res) => {
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
        }
        catch (error) {
            logger_1.logger.error('Health check failed', error instanceof Error ? error : new Error(String(error)));
            res.status(503).json({
                success: false,
                message: 'System health check failed',
                error: 'ServiceUnavailable',
            });
        }
    };
    async checkDatabaseHealth() {
        try {
            const start = Date.now();
            // This will be implemented when database connection is available
            // await mongoose.connection.db.admin().ping();
            const responseTime = Date.now() - start;
            return {
                status: 'up',
                responseTime,
            };
        }
        catch (error) {
            return {
                status: 'down',
                responseTime: 0,
            };
        }
    }
    async checkCloudinaryHealth() {
        try {
            const start = Date.now();
            // This will be implemented when Cloudinary is configured
            const responseTime = Date.now() - start;
            return {
                status: 'up',
                responseTime,
            };
        }
        catch (error) {
            return {
                status: 'down',
                responseTime: 0,
            };
        }
    }
    generateRequestId() {
        return Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);
    }
    gracefulShutdown() {
        // Set a timeout to forcefully shutdown if graceful shutdown takes too long
        const forceShutdown = setTimeout(() => {
            logger_1.logger.error('Forced shutdown due to timeout');
            process.exit(1);
        }, 10000);
        // Clear the force shutdown timeout if graceful shutdown completes
        process.on('exit', () => {
            clearTimeout(forceShutdown);
        });
        // Close the server
        if (this.server) {
            this.server.close((err) => {
                if (err) {
                    logger_1.logger.error('Error during server shutdown', err);
                    process.exit(1);
                }
                logger_1.logger.info('Server closed successfully');
                process.exit(0);
            });
        }
        else {
            process.exit(0);
        }
    }
    server;
    async start() {
        try {
            // Initialize external services
            await (0, database_1.connectDatabase)();
            (0, cloudinary_1.initializeCloudinary)();
            // Start the server
            this.server = this.app.listen(this.port, () => {
                logger_1.logger.info(`Server started successfully`, {
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
            this.server.on('error', (error) => {
                logger_1.logger.error('Server error', error);
                this.gracefulShutdown();
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to start server', error instanceof Error ? error : new Error(String(error)));
            process.exit(1);
        }
    }
}
exports.default = App;
//# sourceMappingURL=app.js.map