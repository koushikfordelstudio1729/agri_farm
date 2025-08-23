import { Request, Response, NextFunction } from 'express';
import { NotFoundError, createErrorContext } from '@/utils/errors';
import logger from '@/utils/logger';

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  rollout?: {
    percentage: number;
    userGroups?: string[];
    userIds?: string[];
  };
  conditions?: {
    userRole?: string[];
    apiVersion?: string[];
    environment?: string[];
    customCondition?: (req: Request) => boolean;
  };
  expiry?: Date;
  description?: string;
}

export interface FeatureFlagsOptions {
  flags: Record<string, FeatureFlag>;
  storage?: 'memory' | 'database' | 'redis';
  defaultEnabled?: boolean;
  enableLogging?: boolean;
  enableAnalytics?: boolean;
}

class FeatureFlagsMiddleware {
  private static flags: Map<string, FeatureFlag> = new Map();
  private static userGroups: Map<string, string[]> = new Map(); // userId -> groups[]

  // Initialize feature flags
  static initialize(options: FeatureFlagsOptions) {
    const { flags, enableLogging = true } = options;

    Object.entries(flags).forEach(([name, flag]) => {
      this.flags.set(name, flag);
    });

    if (enableLogging) {
      logger.info('Feature flags initialized', {
        totalFlags: Object.keys(flags).length,
        enabledFlags: Object.values(flags).filter(f => f.enabled).length,
      });
    }

    return (req: Request, res: Response, next: NextFunction): void => {
      (req as any).featureFlags = this.getEnabledFeatures(req);
      next();
    };
  }

  // Check if a feature is enabled
  static isEnabled(flagName: string) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const isEnabled = this.checkFeatureFlag(flagName, req);
      
      if (!isEnabled) {
        logger.warn('Feature access blocked', {
          feature: flagName,
          userId: (req as any).user?.id,
          reason: 'feature disabled',
        });

        return next(new NotFoundError(
          'Feature not available',
          createErrorContext(req)
        ));
      }

      logger.debug('Feature access granted', {
        feature: flagName,
        userId: (req as any).user?.id,
      });

      next();
    };
  }

  // Require specific feature flags
  static require(flagNames: string | string[]) {
    const flags = Array.isArray(flagNames) ? flagNames : [flagNames];
    
    return (req: Request, res: Response, next: NextFunction): void => {
      const missingFlags = flags.filter(flag => !this.checkFeatureFlag(flag, req));
      
      if (missingFlags.length > 0) {
        logger.warn('Required features not enabled', {
          required: flags,
          missing: missingFlags,
          userId: (req as any).user?.id,
        });

        return next(new NotFoundError(
          'Required features not available',
          createErrorContext(req)
        ));
      }

      next();
    };
  }

  // Gradual rollout based on user ID
  static gradualRollout(flagName: string, percentage: number) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const user = (req as any).user;
      
      if (!user) {
        return next();
      }

      // Use user ID for consistent rollout
      const userHash = this.hashUserId(user.id);
      const userPercentile = userHash % 100;
      
      if (userPercentile < percentage) {
        (req as any).featureFlags = {
          ...(req as any).featureFlags,
          [flagName]: true,
        };
        
        logger.debug('Gradual rollout: feature enabled', {
          feature: flagName,
          userId: user.id,
          userPercentile,
          rolloutPercentage: percentage,
        });
      } else {
        logger.debug('Gradual rollout: feature disabled', {
          feature: flagName,
          userId: user.id,
          userPercentile,
          rolloutPercentage: percentage,
        });
      }

      next();
    };
  }

  // A/B testing middleware
  static abTest(testName: string, variants: Record<string, number>) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const user = (req as any).user;
      
      if (!user) {
        return next();
      }

      const userHash = this.hashUserId(user.id + testName);
      const totalWeight = Object.values(variants).reduce((sum, weight) => sum + weight, 0);
      const userValue = userHash % totalWeight;
      
      let currentWeight = 0;
      let selectedVariant = 'control';
      
      for (const [variant, weight] of Object.entries(variants)) {
        currentWeight += weight;
        if (userValue < currentWeight) {
          selectedVariant = variant;
          break;
        }
      }

      (req as any).abTests = {
        ...(req as any).abTests,
        [testName]: selectedVariant,
      };

      logger.debug('A/B test variant assigned', {
        test: testName,
        variant: selectedVariant,
        userId: user.id,
      });

      next();
    };
  }

  // User group based features
  static userGroup(groupName: string, requiredFlags: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const user = (req as any).user;
      
      if (!user) {
        return next();
      }

      const userGroups = this.userGroups.get(user.id) || [];
      
      if (!userGroups.includes(groupName)) {
        return next();
      }

      // Enable flags for this user group
      const enabledFlags = (req as any).featureFlags || {};
      requiredFlags.forEach(flag => {
        enabledFlags[flag] = true;
      });
      
      (req as any).featureFlags = enabledFlags;

      logger.debug('User group features enabled', {
        group: groupName,
        flags: requiredFlags,
        userId: user.id,
      });

      next();
    };
  }

  // Time-based feature flags
  static timeBased(flagName: string, schedule: {
    start?: Date;
    end?: Date;
    timeZone?: string;
    daysOfWeek?: number[]; // 0-6, Sunday-Saturday
    hoursOfDay?: number[]; // 0-23
  }) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const now = new Date();
      const { start, end, daysOfWeek, hoursOfDay } = schedule;

      let isEnabled = true;

      // Check start/end dates
      if (start && now < start) isEnabled = false;
      if (end && now > end) isEnabled = false;

      // Check days of week
      if (daysOfWeek && !daysOfWeek.includes(now.getDay())) isEnabled = false;

      // Check hours of day
      if (hoursOfDay && !hoursOfDay.includes(now.getHours())) isEnabled = false;

      if (isEnabled) {
        (req as any).featureFlags = {
          ...(req as any).featureFlags,
          [flagName]: true,
        };

        logger.debug('Time-based feature enabled', {
          feature: flagName,
          currentTime: now.toISOString(),
          schedule,
        });
      }

      next();
    };
  }

  // Feature flag analytics
  static analytics() {
    const flagUsage: Map<string, { enabled: number; disabled: number }> = new Map();

    return (req: Request, res: Response, next: NextFunction): void => {
      const enabledFeatures = (req as any).featureFlags || {};
      
      // Track usage of each flag
      this.flags.forEach((flag, name) => {
        const usage = flagUsage.get(name) || { enabled: 0, disabled: 0 };
        
        if (enabledFeatures[name]) {
          usage.enabled++;
        } else {
          usage.disabled++;
        }
        
        flagUsage.set(name, usage);
      });

      // Log analytics periodically
      if (Math.random() < 0.001) { // 0.1% chance
        const analytics = Object.fromEntries(flagUsage.entries());
        logger.info('Feature flag usage analytics', { analytics });
      }

      next();
    };
  }

  // Dynamic feature flag updates
  static updateFlag(flagName: string, updates: Partial<FeatureFlag>) {
    const existingFlag = this.flags.get(flagName);
    
    if (!existingFlag) {
      throw new Error(`Feature flag '${flagName}' not found`);
    }

    const updatedFlag = { ...existingFlag, ...updates };
    this.flags.set(flagName, updatedFlag);

    logger.info('Feature flag updated', {
      flagName,
      updates,
      newConfig: updatedFlag,
    });
  }

  // Feature flag management endpoint
  static managementEndpoint() {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.path.startsWith('/admin/feature-flags')) {
        return next();
      }

      // GET /admin/feature-flags - List all flags
      if (req.method === 'GET' && req.path === '/admin/feature-flags') {
        const flags = Object.fromEntries(this.flags.entries());
        return res.json({ flags });
      }

      // PUT /admin/feature-flags/:flagName - Update flag
      if (req.method === 'PUT' && req.path.startsWith('/admin/feature-flags/')) {
        const flagName = req.path.split('/').pop();
        
        if (!flagName || !this.flags.has(flagName)) {
          return res.status(404).json({ error: 'Feature flag not found' });
        }

        try {
          this.updateFlag(flagName, req.body);
          return res.json({ 
            message: 'Feature flag updated',
            flag: this.flags.get(flagName),
          });
        } catch (error) {
          return res.status(400).json({ error: (error as Error).message });
        }
      }

      next();
    };
  }

  // Feature flag debugging
  static debug() {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (req.query.debug === 'features' || req.headers['x-debug-features']) {
        const user = (req as any).user;
        const enabledFeatures = (req as any).featureFlags || {};
        
        const debugInfo = {
          userId: user?.id,
          userGroups: user ? this.userGroups.get(user.id) : [],
          enabledFeatures,
          allFlags: Object.fromEntries(
            Array.from(this.flags.entries()).map(([name, flag]) => [
              name,
              {
                enabled: flag.enabled,
                conditions: flag.conditions,
                rollout: flag.rollout,
              },
            ])
          ),
        };

        res.set('X-Feature-Debug', JSON.stringify(debugInfo));
        
        logger.debug('Feature flags debug info', debugInfo);
      }

      next();
    };
  }

  // Helper methods
  private static checkFeatureFlag(flagName: string, req: Request): boolean {
    const flag = this.flags.get(flagName);
    
    if (!flag) {
      return false;
    }

    // Check if flag is globally enabled
    if (!flag.enabled) {
      return false;
    }

    // Check expiry
    if (flag.expiry && new Date() > flag.expiry) {
      return false;
    }

    // Check conditions
    if (flag.conditions && !this.checkConditions(flag.conditions, req)) {
      return false;
    }

    // Check rollout conditions
    if (flag.rollout && !this.checkRollout(flag.rollout, req)) {
      return false;
    }

    return true;
  }

  private static checkConditions(conditions: NonNullable<FeatureFlag['conditions']>, req: Request): boolean {
    const user = (req as any).user;

    // Check user role
    if (conditions.userRole && user) {
      if (!conditions.userRole.includes(user.role)) {
        return false;
      }
    }

    // Check API version
    if (conditions.apiVersion && (req as any).apiVersion) {
      if (!conditions.apiVersion.includes((req as any).apiVersion)) {
        return false;
      }
    }

    // Check environment
    if (conditions.environment) {
      const env = process.env.NODE_ENV || 'development';
      if (!conditions.environment.includes(env)) {
        return false;
      }
    }

    // Check custom condition
    if (conditions.customCondition) {
      if (!conditions.customCondition(req)) {
        return false;
      }
    }

    return true;
  }

  private static checkRollout(rollout: NonNullable<FeatureFlag['rollout']>, req: Request): boolean {
    const user = (req as any).user;

    // Check specific user IDs
    if (rollout.userIds && user && rollout.userIds.includes(user.id)) {
      return true;
    }

    // Check user groups
    if (rollout.userGroups && user) {
      const userGroups = this.userGroups.get(user.id) || [];
      if (rollout.userGroups.some(group => userGroups.includes(group))) {
        return true;
      }
    }

    // Check percentage rollout
    if (rollout.percentage > 0 && user) {
      const userHash = this.hashUserId(user.id);
      const userPercentile = userHash % 100;
      return userPercentile < rollout.percentage;
    }

    return rollout.percentage >= 100;
  }

  private static getEnabledFeatures(req: Request): Record<string, boolean> {
    const enabledFeatures: Record<string, boolean> = {};

    this.flags.forEach((flag, name) => {
      if (this.checkFeatureFlag(name, req)) {
        enabledFeatures[name] = true;
      }
    });

    return enabledFeatures;
  }

  private static hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Public API for managing user groups
  static setUserGroups(userId: string, groups: string[]): void {
    this.userGroups.set(userId, groups);
  }

  static addUserToGroup(userId: string, group: string): void {
    const existing = this.userGroups.get(userId) || [];
    if (!existing.includes(group)) {
      existing.push(group);
      this.userGroups.set(userId, existing);
    }
  }

  static removeUserFromGroup(userId: string, group: string): void {
    const existing = this.userGroups.get(userId) || [];
    const filtered = existing.filter(g => g !== group);
    this.userGroups.set(userId, filtered);
  }
}

export default FeatureFlagsMiddleware;