"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthCheck = exports.getDatabaseInfo = exports.clearDatabase = exports.disconnectDatabase = exports.connectDatabase = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = require("@/utils/logger");
const config = {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/agri_farm',
    testUri: process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/agri_farm_test',
    options: {
        maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE || '10', 10),
        serverSelectionTimeoutMS: parseInt(process.env.DB_SERVER_SELECTION_TIMEOUT || '5000', 10),
        socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT || '45000', 10),
        family: 4,
        retryWrites: true,
        retryReads: true,
        writeConcern: {
            w: 'majority',
            j: true,
        },
        readPreference: 'primaryPreferred',
    },
};
const connectDatabase = async () => {
    try {
        const uri = process.env.NODE_ENV === 'test' ? config.testUri : config.uri;
        logger_1.logger.info('Attempting to connect to MongoDB...', {
            uri: uri.replace(/\/\/.*@/, '//***:***@'), // Hide credentials in logs
            environment: process.env.NODE_ENV || 'development',
        });
        mongoose_1.default.set('strictQuery', true);
        const connection = await mongoose_1.default.connect(uri, config.options);
        // Set up event listeners
        setupEventListeners();
        logger_1.logger.info('Successfully connected to MongoDB', {
            database: connection.connection.db?.databaseName,
            host: connection.connection.host,
            port: connection.connection.port,
            readyState: connection.connection.readyState,
        });
        return connection;
    }
    catch (error) {
        logger_1.logger.error('Failed to connect to MongoDB', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
    }
};
exports.connectDatabase = connectDatabase;
const disconnectDatabase = async () => {
    try {
        await mongoose_1.default.disconnect();
        logger_1.logger.info('Successfully disconnected from MongoDB');
    }
    catch (error) {
        logger_1.logger.error('Error disconnecting from MongoDB', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
    }
};
exports.disconnectDatabase = disconnectDatabase;
const clearDatabase = async () => {
    if (process.env.NODE_ENV !== 'test') {
        throw new Error('clearDatabase can only be used in test environment');
    }
    try {
        const collections = await mongoose_1.default.connection.db?.collections();
        if (collections) {
            await Promise.all(collections.map(collection => collection.deleteMany({})));
        }
        logger_1.logger.info('Successfully cleared test database');
    }
    catch (error) {
        logger_1.logger.error('Error clearing test database', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
    }
};
exports.clearDatabase = clearDatabase;
const setupEventListeners = () => {
    const { connection } = mongoose_1.default;
    connection.on('connected', () => {
        logger_1.logger.info('MongoDB connection established');
    });
    connection.on('error', (error) => {
        logger_1.logger.error('MongoDB connection error', {
            error: error.message,
            stack: error.stack,
        });
    });
    connection.on('disconnected', () => {
        logger_1.logger.warn('MongoDB connection lost');
    });
    connection.on('reconnected', () => {
        logger_1.logger.info('MongoDB reconnected');
    });
    connection.on('close', () => {
        logger_1.logger.info('MongoDB connection closed');
    });
    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
        logger_1.logger.info(`${signal} received. Closing MongoDB connection...`);
        try {
            await mongoose_1.default.connection.close();
            logger_1.logger.info('MongoDB connection closed through app termination');
            process.exit(0);
        }
        catch (error) {
            logger_1.logger.error('Error during graceful shutdown', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            process.exit(1);
        }
    };
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // nodemon restart
};
const getDatabaseInfo = async () => {
    const { connection } = mongoose_1.default;
    const collections = await connection.db?.listCollections().toArray();
    const collectionNames = collections?.map(col => col.name) || [];
    return {
        status: getConnectionStatus(connection.readyState),
        database: connection.db?.databaseName || 'unknown',
        host: connection.host || 'unknown',
        port: connection.port || 0,
        readyState: connection.readyState,
        collections: collectionNames,
    };
};
exports.getDatabaseInfo = getDatabaseInfo;
const getConnectionStatus = (readyState) => {
    const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting',
    };
    return states[readyState] || 'unknown';
};
const healthCheck = async () => {
    const start = Date.now();
    try {
        // Simple ping to check connection
        await mongoose_1.default.connection.db?.admin().ping();
        const responseTime = Date.now() - start;
        const info = await (0, exports.getDatabaseInfo)();
        return {
            status: 'up',
            responseTime,
            details: info,
        };
    }
    catch (error) {
        const responseTime = Date.now() - start;
        return {
            status: 'down',
            responseTime,
            details: {
                error: error instanceof Error ? error.message : 'Unknown error',
                readyState: mongoose_1.default.connection.readyState,
            },
        };
    }
};
exports.healthCheck = healthCheck;
exports.default = {
    connectDatabase: exports.connectDatabase,
    disconnectDatabase: exports.disconnectDatabase,
    clearDatabase: exports.clearDatabase,
    getDatabaseInfo: exports.getDatabaseInfo,
    healthCheck: exports.healthCheck,
};
//# sourceMappingURL=database.js.map