#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const logger_1 = require("@/utils/logger");
// Handle unhandled promise rejections and uncaught exceptions early
process.on('unhandledRejection', (reason) => {
    logger_1.logger.error('Unhandled Promise Rejection', reason instanceof Error ? reason : new Error(String(reason)), {
        category: 'system',
        severity: 'critical',
    });
    process.exit(1);
});
process.on('uncaughtException', (error) => {
    logger_1.logger.error('Uncaught Exception', error, {
        category: 'system',
        severity: 'critical',
    });
    process.exit(1);
});
// Create and start the application
const startServer = async () => {
    try {
        logger_1.logger.info('Starting Agri Farm API server...', {
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            pid: process.pid,
            environment: process.env.NODE_ENV || 'development',
        });
        const app = new app_1.default();
        await app.start();
        logger_1.logger.info('Agri Farm API server started successfully');
    }
    catch (error) {
        logger_1.logger.error('Failed to start Agri Farm API server', error instanceof Error ? error : new Error(String(error)), {
            category: 'system',
            severity: 'critical',
        });
        process.exit(1);
    }
};
// Start the server
startServer().catch((error) => {
    logger_1.logger.error('Unexpected error during server startup', error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
});
exports.default = startServer;
//# sourceMappingURL=server.js.map