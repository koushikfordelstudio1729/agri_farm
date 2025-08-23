import { Request, Response, NextFunction } from 'express';
import performanceMonitor from '@/utils/performance';
import logger from '@/utils/logger';
import { User } from '@/models/User';

export interface HealthCheck {
  name: string;
  check: () => Promise<{ status: 'healthy' | 'unhealthy'; details?: any; responseTime?: number }>;
  timeout?: number;
  critical?: boolean;
}

export interface HealthMiddlewareOptions {
  path?: string;
  checks?: HealthCheck[];
  enableDetailedInfo?: boolean;
  enableMetrics?: boolean;
  includeSystem?: boolean;
  timeout?: number;
}

class HealthMiddleware {
  private static defaultChecks: HealthCheck[] = [
    {
      name: 'database',
      check: async () => {
        const start = Date.now();
        try {
          // Simple database connectivity check
          await User.findOne().limit(1).lean();
          return {
            status: 'healthy' as const,
            responseTime: Date.now() - start,
            details: { connection: 'active' }
          };
        } catch (error) {
          return {
            status: 'unhealthy' as const,
            responseTime: Date.now() - start,
            details: { error: (error as Error).message }
          };
        }
      },
      timeout: 5000,
      critical: true,
    },
    {
      name: 'memory',
      check: async () => {
        const memUsage = process.memoryUsage();
        const memUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
        
        return {
          status: memUsedPercent < 90 ? 'healthy' as const : 'unhealthy' as const,
          details: {
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal,
            usagePercent: Math.round(memUsedPercent * 100) / 100,
          }
        };
      },
      timeout: 1000,
      critical: false,
    },
  ];

  // Basic health check endpoint
  static endpoint(options: HealthMiddlewareOptions = {}) {
    const {
      path = '/health',
      checks = this.defaultChecks,
      enableDetailedInfo = true,
      enableMetrics = true,
      includeSystem = true,
      timeout = 10000,
    } = options;

    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      if (req.path !== path) {
        return next();
      }

      const startTime = Date.now();
      const results: Record<string, any> = {};
      let overallStatus: 'healthy' | 'unhealthy' = 'healthy';

      try {
        // Run health checks
        const checkPromises = checks.map(async (check) => {
          const checkStartTime = Date.now();
          
          try {
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Health check timeout')), check.timeout || timeout);
            });

            const result = await Promise.race([
              check.check(),
              timeoutPromise,
            ]) as any;

            const checkResponseTime = Date.now() - checkStartTime;
            
            results[check.name] = {
              status: result.status,
              responseTime: result.responseTime || checkResponseTime,
              ...(enableDetailedInfo && result.details && { details: result.details }),
            };

            // If critical check fails, mark overall as unhealthy
            if (check.critical && result.status === 'unhealthy') {
              overallStatus = 'unhealthy';
            }

          } catch (error) {
            const checkResponseTime = Date.now() - checkStartTime;
            
            results[check.name] = {
              status: 'unhealthy',
              responseTime: checkResponseTime,
              ...(enableDetailedInfo && { 
                details: { error: (error as Error).message }
              }),
            };

            if (check.critical) {
              overallStatus = 'unhealthy';
            }
          }
        });

        await Promise.allSettled(checkPromises);

        // Add system information
        if (includeSystem) {
          const systemHealth = performanceMonitor.getHealthStatus();
          results.system = {
            status: systemHealth.status,
            uptime: systemHealth.uptime,
            ...(enableDetailedInfo && {
              details: {
                memory: systemHealth.memory,
                version: systemHealth.version,
                environment: systemHealth.environment,
              }
            }),
          };

          if (systemHealth.status === 'critical') {
            overallStatus = 'unhealthy';
          }
        }

        // Add metrics
        if (enableMetrics) {
          results.metrics = {
            responseTime: Date.now() - startTime,
            timestamp: new Date().toISOString(),
            checksRun: checks.length,
          };
        }

        const statusCode = overallStatus === 'healthy' ? 200 : 503;
        
        logger.debug('Health check completed', {
          status: overallStatus,
          responseTime: Date.now() - startTime,
          checksRun: checks.length,
        });

        res.status(statusCode).json({
          status: overallStatus,
          checks: results,
        });

      } catch (error) {
        logger.error('Health check error', error as Error);
        
        res.status(503).json({
          status: 'unhealthy',
          error: 'Health check failed',
          timestamp: new Date().toISOString(),
        });
      }
    };
  }

  // Liveness probe (for Kubernetes)
  static liveness(customCheck?: () => Promise<boolean>) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      if (req.path !== '/health/live' && req.path !== '/live') {
        return next();
      }

      try {
        let isAlive = true;

        if (customCheck) {
          isAlive = await customCheck();
        }

        if (isAlive) {
          res.status(200).json({
            status: 'alive',
            timestamp: new Date().toISOString(),
          });
        } else {
          res.status(503).json({
            status: 'dead',
            timestamp: new Date().toISOString(),
          });
        }

      } catch (error) {
        logger.error('Liveness check failed', error as Error);
        res.status(503).json({
          status: 'dead',
          error: 'Liveness check failed',
          timestamp: new Date().toISOString(),
        });
      }
    };
  }

  // Readiness probe (for Kubernetes)
  static readiness(readinessChecks: HealthCheck[] = []) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      if (req.path !== '/health/ready' && req.path !== '/ready') {
        return next();
      }

      try {
        let isReady = true;
        const results: Record<string, any> = {};

        // Use database check as default readiness check
        const checks = readinessChecks.length > 0 ? readinessChecks : [this.defaultChecks[0]];

        for (const check of checks) {
          try {
            const result = await check.check();
            results[check.name] = {
              status: result.status,
              responseTime: result.responseTime,
            };

            if (result.status === 'unhealthy') {
              isReady = false;
            }

          } catch (error) {
            results[check.name] = {
              status: 'unhealthy',
              error: (error as Error).message,
            };
            isReady = false;
          }
        }

        const statusCode = isReady ? 200 : 503;

        res.status(statusCode).json({
          status: isReady ? 'ready' : 'not ready',
          checks: results,
          timestamp: new Date().toISOString(),
        });

      } catch (error) {
        logger.error('Readiness check failed', error as Error);
        res.status(503).json({
          status: 'not ready',
          error: 'Readiness check failed',
          timestamp: new Date().toISOString(),
        });
      }
    };
  }

  // Startup probe (for Kubernetes)
  static startup(startupChecks: HealthCheck[] = []) {
    let startupCompleted = false;

    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      if (req.path !== '/health/startup' && req.path !== '/startup') {
        return next();
      }

      try {
        if (startupCompleted) {
          return res.status(200).json({
            status: 'started',
            timestamp: new Date().toISOString(),
          });
        }

        const checks = startupChecks.length > 0 ? startupChecks : [this.defaultChecks[0]];
        const results: Record<string, any> = {};
        let allHealthy = true;

        for (const check of checks) {
          try {
            const result = await check.check();
            results[check.name] = {
              status: result.status,
              responseTime: result.responseTime,
            };

            if (result.status === 'unhealthy') {
              allHealthy = false;
            }

          } catch (error) {
            results[check.name] = {
              status: 'unhealthy',
              error: (error as Error).message,
            };
            allHealthy = false;
          }
        }

        if (allHealthy) {
          startupCompleted = true;
          res.status(200).json({
            status: 'started',
            checks: results,
            timestamp: new Date().toISOString(),
          });
        } else {
          res.status(503).json({
            status: 'starting',
            checks: results,
            timestamp: new Date().toISOString(),
          });
        }

      } catch (error) {
        logger.error('Startup check failed', error as Error);
        res.status(503).json({
          status: 'starting',
          error: 'Startup check failed',
          timestamp: new Date().toISOString(),
        });
      }
    };
  }

  // Combined health middleware
  static combined(options: HealthMiddlewareOptions & {
    enableLiveness?: boolean;
    enableReadiness?: boolean;
    enableStartup?: boolean;
  } = {}) {
    const {
      enableLiveness = true,
      enableReadiness = true,
      enableStartup = false,
      ...healthOptions
    } = options;

    const middlewares = [
      this.endpoint(healthOptions),
    ];

    if (enableLiveness) {
      middlewares.push(this.liveness());
    }

    if (enableReadiness) {
      middlewares.push(this.readiness());
    }

    if (enableStartup) {
      middlewares.push(this.startup());
    }

    return (req: Request, res: Response, next: NextFunction): void => {
      // Run through middleware chain
      let currentIndex = 0;
      
      const runNext = (error?: any): void => {
        if (error) return next(error);
        
        if (currentIndex >= middlewares.length) {
          return next();
        }

        const middleware = middlewares[currentIndex++];
        middleware(req, res, runNext);
      };

      runNext();
    };
  }

  // Custom health check builder
  static custom(name: string, checkFunction: () => Promise<any>, options: {
    timeout?: number;
    critical?: boolean;
    transform?: (result: any) => { status: 'healthy' | 'unhealthy'; details?: any };
  } = {}): HealthCheck {
    return {
      name,
      check: async () => {
        const result = await checkFunction();
        
        if (options.transform) {
          return options.transform(result);
        }

        // Default transformation
        return {
          status: result ? 'healthy' as const : 'unhealthy' as const,
          details: typeof result === 'object' ? result : { value: result },
        };
      },
      timeout: options.timeout || 5000,
      critical: options.critical || false,
    };
  }
}

export default HealthMiddleware;