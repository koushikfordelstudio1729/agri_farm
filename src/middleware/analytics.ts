import { Request, Response, NextFunction } from 'express';
import logger from '@/utils/logger';
import performanceMonitor from '@/utils/performance';
import { securityUtils } from '@/utils/security';

export interface AnalyticsEvent {
  event: string;
  userId?: string;
  sessionId?: string;
  properties: Record<string, any>;
  timestamp: Date;
  ip?: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
}

export interface AnalyticsOptions {
  enableRequestTracking?: boolean;
  enableUserTracking?: boolean;
  enablePerformanceTracking?: boolean;
  enableBusinessMetrics?: boolean;
  enableErrorTracking?: boolean;
  excludePaths?: string[];
  sampleRate?: number;
  customEventExtractor?: (req: Request, res: Response) => AnalyticsEvent[];
}

class AnalyticsMiddleware {
  private static events: AnalyticsEvent[] = [];
  private static maxEvents = 10000;

  // Main analytics middleware
  static track(options: AnalyticsOptions = {}) {
    const {
      enableRequestTracking = true,
      enableUserTracking = true,
      enablePerformanceTracking = true,
      enableBusinessMetrics = true,
      enableErrorTracking = true,
      excludePaths = ['/health', '/metrics', '/analytics'],
      sampleRate = 1.0,
      customEventExtractor,
    } = options;

    return (req: Request, res: Response, next: NextFunction): void => {
      // Skip tracking for excluded paths
      if (excludePaths.some(path => req.path.includes(path))) {
        return next();
      }

      // Apply sampling
      if (Math.random() > sampleRate) {
        return next();
      }

      const startTime = Date.now();
      const clientInfo = securityUtils.extractClientInfo(req);
      const user = (req as any).user;
      const sessionId = (req as any).sessionId || (req as any).id;

      // Track request start
      if (enableRequestTracking) {
        this.addEvent({
          event: 'request_start',
          userId: user?.id,
          sessionId,
          properties: {
            method: req.method,
            endpoint: req.originalUrl,
            query: req.query,
            headers: this.sanitizeHeaders(req.headers),
            referrer: req.headers.referer,
          },
          timestamp: new Date(),
          ip: clientInfo.ip,
          userAgent: clientInfo.userAgent,
          endpoint: req.originalUrl,
          method: req.method,
        });
      }

      // Track user activity
      if (enableUserTracking && user) {
        this.addEvent({
          event: 'user_activity',
          userId: user.id,
          sessionId,
          properties: {
            endpoint: req.originalUrl,
            method: req.method,
            userRole: user.role,
            isEmailVerified: user.isEmailVerified,
            isPhoneVerified: user.isPhoneVerified,
          },
          timestamp: new Date(),
          ip: clientInfo.ip,
          userAgent: clientInfo.userAgent,
          endpoint: req.originalUrl,
          method: req.method,
        });
      }

      // Track response completion
      res.on('finish', () => {
        const responseTime = Date.now() - startTime;

        // Request completion tracking
        if (enableRequestTracking) {
          this.addEvent({
            event: 'request_complete',
            userId: user?.id,
            sessionId,
            properties: {
              method: req.method,
              endpoint: req.originalUrl,
              statusCode: res.statusCode,
              responseTime,
              contentLength: res.get('content-length'),
              success: res.statusCode < 400,
            },
            timestamp: new Date(),
            ip: clientInfo.ip,
            userAgent: clientInfo.userAgent,
            endpoint: req.originalUrl,
            method: req.method,
          });
        }

        // Performance tracking
        if (enablePerformanceTracking) {
          this.addEvent({
            event: 'performance_metric',
            userId: user?.id,
            sessionId,
            properties: {
              metric: 'response_time',
              value: responseTime,
              unit: 'ms',
              endpoint: req.originalUrl,
              method: req.method,
              statusCode: res.statusCode,
            },
            timestamp: new Date(),
            ip: clientInfo.ip,
            userAgent: clientInfo.userAgent,
            endpoint: req.originalUrl,
            method: req.method,
          });

          // Track slow requests
          if (responseTime > 2000) {
            this.addEvent({
              event: 'slow_request',
              userId: user?.id,
              sessionId,
              properties: {
                responseTime,
                endpoint: req.originalUrl,
                method: req.method,
                threshold: 2000,
              },
              timestamp: new Date(),
              ip: clientInfo.ip,
              userAgent: clientInfo.userAgent,
              endpoint: req.originalUrl,
              method: req.method,
            });
          }
        }

        // Business metrics tracking
        if (enableBusinessMetrics) {
          this.trackBusinessEvents(req, res, user, sessionId, clientInfo);
        }

        // Error tracking
        if (enableErrorTracking && res.statusCode >= 400) {
          this.addEvent({
            event: 'request_error',
            userId: user?.id,
            sessionId,
            properties: {
              statusCode: res.statusCode,
              method: req.method,
              endpoint: req.originalUrl,
              errorType: this.getErrorType(res.statusCode),
            },
            timestamp: new Date(),
            ip: clientInfo.ip,
            userAgent: clientInfo.userAgent,
            endpoint: req.originalUrl,
            method: req.method,
          });
        }

        // Custom event extraction
        if (customEventExtractor) {
          const customEvents = customEventExtractor(req, res);
          customEvents.forEach(event => this.addEvent(event));
        }
      });

      next();
    };
  }

  // Page view tracking
  static pageViews() {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (req.method === 'GET') {
        const user = (req as any).user;
        const clientInfo = securityUtils.extractClientInfo(req);

        this.addEvent({
          event: 'page_view',
          userId: user?.id,
          sessionId: (req as any).sessionId,
          properties: {
            page: req.originalUrl,
            referrer: req.headers.referer,
            title: req.headers['x-page-title'] || req.originalUrl,
          },
          timestamp: new Date(),
          ip: clientInfo.ip,
          userAgent: clientInfo.userAgent,
          endpoint: req.originalUrl,
          method: req.method,
        });
      }

      next();
    };
  }

  // API usage tracking
  static apiUsage() {
    const usageStats = new Map<string, { count: number; lastUsed: Date }>();

    return (req: Request, res: Response, next: NextFunction): void => {
      const endpoint = req.route?.path || req.path;
      const key = `${req.method}:${endpoint}`;
      
      const current = usageStats.get(key) || { count: 0, lastUsed: new Date() };
      current.count++;
      current.lastUsed = new Date();
      usageStats.set(key, current);

      // Log usage statistics periodically
      if (current.count % 100 === 0) {
        logger.info('API endpoint usage milestone', {
          endpoint: key,
          totalCalls: current.count,
          lastUsed: current.lastUsed,
        });
      }

      this.addEvent({
        event: 'api_call',
        userId: (req as any).user?.id,
        properties: {
          endpoint: key,
          totalCalls: current.count,
          apiVersion: (req as any).apiVersion,
        },
        timestamp: new Date(),
      });

      next();
    };
  }

  // Feature usage tracking
  static featureUsage(features: Record<string, string>) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const matchedFeatures = Object.entries(features)
        .filter(([feature, pattern]) => req.path.match(new RegExp(pattern)))
        .map(([feature]) => feature);

      if (matchedFeatures.length > 0) {
        const user = (req as any).user;
        
        matchedFeatures.forEach(feature => {
          this.addEvent({
            event: 'feature_used',
            userId: user?.id,
            properties: {
              feature,
              endpoint: req.originalUrl,
              method: req.method,
              userRole: user?.role,
            },
            timestamp: new Date(),
          });
        });
      }

      next();
    };
  }

  // Conversion tracking
  static conversions(conversionEvents: Record<string, { path: RegExp; method?: string }>) {
    return (req: Request, res: Response, next: NextFunction): void => {
      res.on('finish', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const matchedConversions = Object.entries(conversionEvents)
            .filter(([name, config]) => {
              const pathMatch = config.path.test(req.path);
              const methodMatch = !config.method || config.method === req.method;
              return pathMatch && methodMatch;
            })
            .map(([name]) => name);

          if (matchedConversions.length > 0) {
            const user = (req as any).user;
            
            matchedConversions.forEach(conversion => {
              this.addEvent({
                event: 'conversion',
                userId: user?.id,
                properties: {
                  conversionType: conversion,
                  endpoint: req.originalUrl,
                  method: req.method,
                  statusCode: res.statusCode,
                },
                timestamp: new Date(),
              });
            });
          }
        }
      });

      next();
    };
  }

  // Real-time analytics endpoint
  static endpoint() {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (req.path === '/analytics' || req.path === '/analytics/events') {
        const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
        const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
        
        const events = this.events
          .slice(-limit - offset)
          .slice(0, limit);

        const summary = this.generateSummary();

        res.json({
          events,
          summary,
          total: this.events.length,
          limit,
          offset,
        });
        return;
      }

      if (req.path === '/analytics/summary') {
        const summary = this.generateSummary();
        res.json(summary);
        return;
      }

      next();
    };
  }

  // Custom event tracking
  static customEvent(eventName: string, properties?: Record<string, any>) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const user = (req as any).user;
      const clientInfo = securityUtils.extractClientInfo(req);

      this.addEvent({
        event: eventName,
        userId: user?.id,
        sessionId: (req as any).sessionId,
        properties: {
          ...properties,
          endpoint: req.originalUrl,
          method: req.method,
        },
        timestamp: new Date(),
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        endpoint: req.originalUrl,
        method: req.method,
      });

      next();
    };
  }

  // Private helper methods
  private static addEvent(event: AnalyticsEvent): void {
    this.events.push(event);

    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Log important events
    if (['user_signup', 'conversion', 'error'].includes(event.event)) {
      logger.info(`Analytics: ${event.event}`, {
        event: event.event,
        userId: event.userId,
        properties: event.properties,
      });
    }
  }

  private static sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    const sanitized: Record<string, any> = {};

    Object.entries(headers).forEach(([key, value]) => {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    });

    return sanitized;
  }

  private static getErrorType(statusCode: number): string {
    if (statusCode >= 400 && statusCode < 500) return 'client_error';
    if (statusCode >= 500) return 'server_error';
    return 'unknown_error';
  }

  private static trackBusinessEvents(
    req: Request,
    res: Response,
    user: any,
    sessionId: string,
    clientInfo: any
  ): void {
    const businessEvents: Record<string, string> = {
      'POST /api/auth/register': 'user_signup',
      'POST /api/auth/login': 'user_login',
      'POST /api/crops': 'crop_added',
      'POST /api/diagnosis': 'diagnosis_requested',
      'POST /api/treatments': 'treatment_created',
      'GET /api/market-prices': 'market_data_accessed',
      'POST /api/expert-consultations': 'expert_consultation_requested',
    };

    const eventKey = `${req.method} ${req.route?.path || req.path}`;
    const businessEvent = businessEvents[eventKey];

    if (businessEvent && res.statusCode < 400) {
      this.addEvent({
        event: businessEvent,
        userId: user?.id,
        sessionId,
        properties: {
          endpoint: req.originalUrl,
          method: req.method,
          statusCode: res.statusCode,
          userRole: user?.role,
        },
        timestamp: new Date(),
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        endpoint: req.originalUrl,
        method: req.method,
      });
    }
  }

  private static generateSummary(): any {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    const recentEvents = this.events.filter(e => e.timestamp.getTime() > oneHourAgo);
    const dailyEvents = this.events.filter(e => e.timestamp.getTime() > oneDayAgo);

    const eventCounts = this.events.reduce((acc: Record<string, number>, event) => {
      acc[event.event] = (acc[event.event] || 0) + 1;
      return acc;
    }, {});

    const uniqueUsers = new Set(this.events
      .filter(e => e.userId)
      .map(e => e.userId)
    ).size;

    return {
      totalEvents: this.events.length,
      recentEvents: recentEvents.length,
      dailyEvents: dailyEvents.length,
      uniqueUsers,
      topEvents: Object.entries(eventCounts)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 10),
      timeRange: {
        oldest: this.events.length > 0 ? this.events[0].timestamp : null,
        newest: this.events.length > 0 ? this.events[this.events.length - 1].timestamp : null,
      },
    };
  }

  // Clear analytics data
  static clearEvents(): void {
    this.events = [];
  }

  // Export events for external analytics services
  static exportEvents(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = ['timestamp', 'event', 'userId', 'endpoint', 'properties'];
      const rows = this.events.map(e => [
        e.timestamp.toISOString(),
        e.event,
        e.userId || '',
        e.endpoint || '',
        JSON.stringify(e.properties),
      ]);
      
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
    
    return JSON.stringify(this.events, null, 2);
  }
}

export default AnalyticsMiddleware;