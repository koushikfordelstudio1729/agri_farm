import { config as dotenvConfig } from 'dotenv';
import mongoose from 'mongoose';
import logger from '@/utils/logger';

// Load environment variables
dotenvConfig();

interface DatabaseConfig {
  uri: string;
  testUri: string;
  options: mongoose.ConnectOptions;
}

const config: DatabaseConfig = {
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

export const connectDatabase = async (): Promise<typeof mongoose | null> => {
  try {
    // Check if database is optional (for development)
    if (process.env.DATABASE_OPTIONAL === 'true' && process.env.NODE_ENV === 'development') {
      logger.warn('Database connection is optional in development mode');
      try {
        const uri = process.env.NODE_ENV === 'test' ? config.testUri : config.uri;
        
        logger.info('Attempting to connect to MongoDB...', {
          uri: uri.replace(/\/\/.*@/, '//***:***@'), // Hide credentials in logs
          environment: process.env.NODE_ENV || 'development',
        });

        mongoose.set('strictQuery', true);
        
        // Use shorter timeout for optional connection
        const quickConnectOptions = {
          ...config.options,
          serverSelectionTimeoutMS: 2000, // 2 seconds timeout
        };

        const connection = await mongoose.connect(uri, quickConnectOptions);
        
        // Set up event listeners
        setupEventListeners();

        logger.info('Successfully connected to MongoDB', {
          database: connection.connection.db?.databaseName,
          host: connection.connection.host,
          port: connection.connection.port,
          readyState: connection.connection.readyState,
        });

        return connection;
      } catch (error) {
        logger.warn('MongoDB not available - running without database', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return null;
      }
    }

    const uri = process.env.NODE_ENV === 'test' ? config.testUri : config.uri;
    
    logger.info('Attempting to connect to MongoDB...', {
      uri: uri.replace(/\/\/.*@/, '//***:***@'), // Hide credentials in logs
      environment: process.env.NODE_ENV || 'development',
    });

    mongoose.set('strictQuery', true);

    const connection = await mongoose.connect(uri, config.options);

    // Set up event listeners
    setupEventListeners();

    logger.info('Successfully connected to MongoDB', {
      database: connection.connection.db?.databaseName,
      host: connection.connection.host,
      port: connection.connection.port,
      readyState: connection.connection.readyState,
    });

    return connection;
  } catch (error) {
    logger.error('Failed to connect to MongoDB', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    logger.info('Successfully disconnected from MongoDB');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
};

export const clearDatabase = async (): Promise<void> => {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('clearDatabase can only be used in test environment');
  }

  try {
    const collections = await mongoose.connection.db?.collections();
    if (collections) {
      await Promise.all(collections.map(collection => collection.deleteMany({})));
    }
    logger.info('Successfully cleared test database');
  } catch (error) {
    logger.error('Error clearing test database', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
};

const setupEventListeners = (): void => {
  const { connection } = mongoose;

  connection.on('connected', () => {
    logger.info('MongoDB connection established');
  });

  connection.on('error', (error: Error) => {
    logger.error('MongoDB connection error', {
      error: error.message,
      stack: error.stack,
    });
  });

  connection.on('disconnected', () => {
    logger.warn('MongoDB connection lost');
  });

  connection.on('reconnected', () => {
    logger.info('MongoDB reconnected');
  });

  connection.on('close', () => {
    logger.info('MongoDB connection closed');
  });

  // Graceful shutdown
  const gracefulShutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received. Closing MongoDB connection...`);
    try {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed through app termination');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      process.exit(1);
    }
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // nodemon restart
};

export const getDatabaseInfo = async (): Promise<{
  status: string;
  database: string;
  host: string;
  port: number;
  readyState: number;
  collections: string[];
}> => {
  const { connection } = mongoose;
  
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

const getConnectionStatus = (readyState: number): string => {
  const states: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return states[readyState] || 'unknown';
};

export const healthCheck = async (): Promise<{
  status: 'up' | 'down';
  responseTime: number;
  details: Record<string, unknown>;
}> => {
  const start = Date.now();
  
  try {
    // Simple ping to check connection
    await mongoose.connection.db?.admin().ping();
    const responseTime = Date.now() - start;
    
    const info = await getDatabaseInfo();
    
    return {
      status: 'up',
      responseTime,
      details: info,
    };
  } catch (error) {
    const responseTime = Date.now() - start;
    
    return {
      status: 'down',
      responseTime,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        readyState: mongoose.connection.readyState,
      },
    };
  }
};

export default {
  connectDatabase,
  disconnectDatabase,
  clearDatabase,
  getDatabaseInfo,
  healthCheck,
};