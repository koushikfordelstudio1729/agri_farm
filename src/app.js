"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var cors_1 = __importDefault(require("cors"));
var helmet_1 = __importDefault(require("helmet"));
var express_rate_limit_1 = __importDefault(require("express-rate-limit"));
var dotenv_1 = require("dotenv");
var database_1 = require("@/config/database");
var cloudinary_1 = require("@/config/cloudinary");
var logger_1 = require("@/utils/logger");
var errors_1 = require("@/utils/errors");
// Load environment variables
(0, dotenv_1.config)();
var App = /** @class */ (function () {
    function App() {
        var _this = this;
        this.healthCheck = function (req, res) { return __awaiter(_this, void 0, void 0, function () {
            var start, dbHealth, cloudinaryHealth, responseTime, health, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        start = Date.now();
                        return [4 /*yield*/, this.checkDatabaseHealth()];
                    case 1:
                        dbHealth = _a.sent();
                        return [4 /*yield*/, this.checkCloudinaryHealth()];
                    case 2:
                        cloudinaryHealth = _a.sent();
                        responseTime = Date.now() - start;
                        health = {
                            status: 'healthy',
                            timestamp: new Date().toISOString(),
                            uptime: process.uptime(),
                            version: '1.0.0',
                            environment: process.env.NODE_ENV || 'development',
                            responseTime: responseTime,
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
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _a.sent();
                        logger_1.logger.error('Health check failed', error_1 instanceof Error ? error_1 : new Error(String(error_1)));
                        res.status(503).json({
                            success: false,
                            message: 'System health check failed',
                            error: 'ServiceUnavailable',
                        });
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        }); };
        this.app = (0, express_1.default)();
        this.port = parseInt(process.env.PORT || '3000', 10);
        this.isDevelopment = process.env.NODE_ENV === 'development';
        this.initializeMiddlewares();
        this.initializeRoutes();
        this.initializeErrorHandling();
    }
    App.prototype.initializeMiddlewares = function () {
        var _this = this;
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
        var corsOptions = {
            origin: function (origin, callback) {
                var _a;
                var allowedOrigins = ((_a = process.env.CORS_ORIGIN) === null || _a === void 0 ? void 0 : _a.split(',')) || ['http://localhost:3000'];
                // Allow requests with no origin (like mobile apps or curl requests)
                if (!origin)
                    return callback(null, true);
                if (allowedOrigins.includes(origin) || _this.isDevelopment) {
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
        var limiter = (0, express_rate_limit_1.default)({
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '15', 10) * 60 * 1000, // 15 minutes
            max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10), // limit each IP to 100 requests per windowMs
            message: {
                success: false,
                message: 'Too many requests from this IP, please try again later.',
                error: 'Rate limit exceeded',
            },
            standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
            legacyHeaders: false, // Disable the `X-RateLimit-*` headers
            handler: function (req, res) {
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
            verify: function (req, res, buf) {
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
        this.app.use(function (req, res, next) {
            var requestId = req.headers['x-request-id'] || _this.generateRequestId();
            req.id = requestId;
            res.setHeader('x-request-id', requestId);
            next();
        });
        // Health check endpoint (before authentication)
        this.app.get('/health', this.healthCheck);
        this.app.get('/api/health', this.healthCheck);
    };
    App.prototype.initializeRoutes = function () {
        // API routes
        this.app.use('/api', this.createApiRouter());
        // Catch-all for undefined routes
        this.app.all('*', function (req, res) {
            var message = "Route ".concat(req.originalUrl, " not found");
            logger_1.logger.warn(message, {
                method: req.method,
                url: req.originalUrl,
                ip: req.ip,
                userAgent: req.headers['user-agent'],
            });
            res.status(404).json({
                success: false,
                message: message,
                error: 'Not Found',
            });
        });
    };
    App.prototype.createApiRouter = function () {
        var router = express_1.default.Router();
        // API version info
        router.get('/', function (req, res) {
            res.json({
                success: true,
                message: 'Agri Farm API',
                data: {
                    version: '1.0.0',
                    environment: process.env.NODE_ENV || 'development',
                    timestamp: new Date().toISOString(),
                    docs: '/api/docs',
                },
            });
        });
        // TODO: Add route imports here as they are created
        // router.use('/auth', authRoutes);
        // router.use('/users', userRoutes);
        // router.use('/diagnosis', diagnosisRoutes);
        // router.use('/crops', cropRoutes);
        // router.use('/diseases', diseaseRoutes);
        // router.use('/weather', weatherRoutes);
        // router.use('/community', communityRoutes);
        // router.use('/experts', expertRoutes);
        // router.use('/market', marketRoutes);
        // router.use('/notifications', notificationRoutes);
        return router;
    };
    App.prototype.initializeErrorHandling = function () {
        var _this = this;
        // Error handling middleware
        this.app.use(function (error, req, res, next) {
            _this.handleError(error, req, res);
        });
        // Handle uncaught exceptions
        process.on('uncaughtException', function (error) {
            logger_1.logger.error('Uncaught Exception', error, {
                category: 'system',
                severity: 'critical',
            });
            // Gracefully close the server
            _this.gracefulShutdown();
        });
        // Handle unhandled promise rejections
        process.on('unhandledRejection', function (reason, promise) {
            logger_1.logger.error('Unhandled Rejection', reason instanceof Error ? reason : new Error(String(reason)), {
                category: 'system',
                severity: 'critical',
                promise: promise.toString(),
            });
            // Gracefully close the server
            _this.gracefulShutdown();
        });
        // Handle SIGTERM (used by process managers like PM2)
        process.on('SIGTERM', function () {
            logger_1.logger.info('SIGTERM signal received, shutting down gracefully');
            _this.gracefulShutdown();
        });
        // Handle SIGINT (Ctrl+C)
        process.on('SIGINT', function () {
            logger_1.logger.info('SIGINT signal received, shutting down gracefully');
            _this.gracefulShutdown();
        });
    };
    App.prototype.handleError = function (error, req, res) {
        var _a, _b;
        var requestId = req.id;
        // Log the error
        logger_1.logger.error('Request error', error, {
            requestId: requestId,
            method: req.method,
            url: req.originalUrl,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id,
        });
        // Handle known errors
        if (error instanceof errors_1.BaseError) {
            var response = {
                success: false,
                message: error.message,
                error: error.name,
                requestId: requestId,
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
            var validationErrors_1 = {};
            if ('errors' in error) {
                var mongooseErrors_1 = error.errors;
                Object.keys(mongooseErrors_1).forEach(function (field) {
                    validationErrors_1[field] = [mongooseErrors_1[field].message];
                });
            }
            res.status(400).json(__assign({ success: false, message: 'Validation failed', error: 'ValidationError', errors: validationErrors_1, requestId: requestId }, (this.isDevelopment && { stack: error.stack })));
            return;
        }
        // Handle MongoDB duplicate key errors
        if (error.name === 'MongoServerError' && 'code' in error && error.code === 11000) {
            var field = Object.keys(error.keyValue || {})[0] || 'field';
            var value = ((_b = error.keyValue) === null || _b === void 0 ? void 0 : _b[field]) || 'unknown';
            res.status(409).json(__assign({ success: false, message: "".concat(field, " '").concat(value, "' already exists"), error: 'ConflictError', requestId: requestId }, (this.isDevelopment && { stack: error.stack })));
            return;
        }
        // Handle JWT errors
        if (error.name === 'JsonWebTokenError') {
            res.status(401).json(__assign({ success: false, message: 'Invalid token', error: 'AuthenticationError', requestId: requestId }, (this.isDevelopment && { stack: error.stack })));
            return;
        }
        if (error.name === 'TokenExpiredError') {
            res.status(401).json(__assign({ success: false, message: 'Token expired', error: 'AuthenticationError', requestId: requestId }, (this.isDevelopment && { stack: error.stack })));
            return;
        }
        // Handle unknown errors
        var internalError = new errors_1.InternalServerError('An unexpected error occurred');
        res.status(internalError.statusCode).json(__assign({ success: false, message: internalError.message, error: internalError.name, requestId: requestId }, (this.isDevelopment && { stack: error.stack })));
    };
    App.prototype.checkDatabaseHealth = function () {
        return __awaiter(this, void 0, void 0, function () {
            var start, responseTime;
            return __generator(this, function (_a) {
                try {
                    start = Date.now();
                    responseTime = Date.now() - start;
                    return [2 /*return*/, {
                            status: 'up',
                            responseTime: responseTime,
                        }];
                }
                catch (error) {
                    return [2 /*return*/, {
                            status: 'down',
                            responseTime: 0,
                        }];
                }
                return [2 /*return*/];
            });
        });
    };
    App.prototype.checkCloudinaryHealth = function () {
        return __awaiter(this, void 0, void 0, function () {
            var start, responseTime;
            return __generator(this, function (_a) {
                try {
                    start = Date.now();
                    responseTime = Date.now() - start;
                    return [2 /*return*/, {
                            status: 'up',
                            responseTime: responseTime,
                        }];
                }
                catch (error) {
                    return [2 /*return*/, {
                            status: 'down',
                            responseTime: 0,
                        }];
                }
                return [2 /*return*/];
            });
        });
    };
    App.prototype.generateRequestId = function () {
        return Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);
    };
    App.prototype.gracefulShutdown = function () {
        // Set a timeout to forcefully shutdown if graceful shutdown takes too long
        var forceShutdown = setTimeout(function () {
            logger_1.logger.error('Forced shutdown due to timeout');
            process.exit(1);
        }, 10000);
        // Clear the force shutdown timeout if graceful shutdown completes
        process.on('exit', function () {
            clearTimeout(forceShutdown);
        });
        // Close the server
        if (this.server) {
            this.server.close(function (err) {
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
    };
    App.prototype.start = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_2;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        // Initialize external services
                        return [4 /*yield*/, (0, database_1.connectDatabase)()];
                    case 1:
                        // Initialize external services
                        _a.sent();
                        (0, cloudinary_1.initializeCloudinary)();
                        // Start the server
                        this.server = this.app.listen(this.port, function () {
                            logger_1.logger.info("Server started successfully", {
                                port: _this.port,
                                environment: process.env.NODE_ENV || 'development',
                                nodeVersion: process.version,
                                pid: process.pid,
                            });
                            if (_this.isDevelopment) {
                                console.log("\uD83D\uDE80 Server running on http://localhost:".concat(_this.port));
                                console.log("\uD83D\uDCDA Health check: http://localhost:".concat(_this.port, "/health"));
                                console.log("\uD83D\uDD17 API docs: http://localhost:".concat(_this.port, "/api/docs"));
                            }
                        });
                        // Handle server errors
                        this.server.on('error', function (error) {
                            logger_1.logger.error('Server error', error);
                            _this.gracefulShutdown();
                        });
                        return [3 /*break*/, 3];
                    case 2:
                        error_2 = _a.sent();
                        logger_1.logger.error('Failed to start server', error_2 instanceof Error ? error_2 : new Error(String(error_2)));
                        process.exit(1);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return App;
}());
exports.default = App;
