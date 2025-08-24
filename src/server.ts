#!/usr/bin/env node

import App from './app';
import logger from '@/utils/logger';

// Handle unhandled promise rejections and uncaught exceptions early
process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Promise Rejection', reason instanceof Error ? reason : new Error(String(reason)), {
    category: 'system',
    severity: 'critical',
  });
  process.exit(1);
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', error, {
    category: 'system',
    severity: 'critical',
  });
  process.exit(1);
});

// Create and start the application
const startServer = async (): Promise<void> => {
  try {
    logger.info('Starting Agri Farm API server...', {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      environment: process.env.NODE_ENV || 'development',
    });

    const app = new App();
    await app.start();

    logger.info('Agri Farm API server started successfully');
  } catch (error) {
    logger.error('Failed to start Agri Farm API server', error instanceof Error ? error : new Error(String(error)), {
      category: 'system',
      severity: 'critical',
    });
    process.exit(1);
  }
};

// Start the server
startServer().catch((error) => {
  logger.error('Unexpected error during server startup', error instanceof Error ? error : new Error(String(error)));
  process.exit(1);
});

export default startServer;