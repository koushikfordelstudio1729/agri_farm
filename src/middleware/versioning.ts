import { Request, Response, NextFunction } from 'express';
import { BadRequestError, createErrorContext } from '@/utils/errors';
import logger from '@/utils/logger';

export interface VersioningOptions {
  versions: string[];
  defaultVersion?: string;
  strategy: 'header' | 'query' | 'path' | 'accept-header';
  headerName?: string;
  queryParam?: string;
  pathPrefix?: string;
  acceptHeaderFormat?: string;
  strict?: boolean;
  deprecatedVersions?: Record<string, { sunset?: string; message?: string }>;
}

class VersioningMiddleware {
  // Header-based versioning (X-API-Version: v1)
  static header(options: Omit<VersioningOptions, 'strategy'>) {
    const {
      versions,
      defaultVersion = versions[0],
      headerName = 'x-api-version',
      strict = false,
      deprecatedVersions = {},
    } = options;

    return (req: Request, res: Response, next: NextFunction): void => {
      const version = req.headers[headerName.toLowerCase()] as string || defaultVersion;

      if (!this.isValidVersion(version, versions)) {
        if (strict) {
          return next(new BadRequestError(
            `Invalid API version: ${version}. Supported versions: ${versions.join(', ')}`,
            createErrorContext(req)
          ));
        }
        // Use default version if not strict
        (req as any).apiVersion = defaultVersion;
      } else {
        (req as any).apiVersion = version;
      }

      // Handle deprecated versions
      this.handleDeprecation(version, deprecatedVersions, res);

      // Set response header
      res.set('X-API-Version', (req as any).apiVersion);
      
      logger.debug('API version resolved', {
        requested: version,
        resolved: (req as any).apiVersion,
        strategy: 'header',
      });

      next();
    };
  }

  // Query parameter versioning (?version=v1)
  static query(options: Omit<VersioningOptions, 'strategy'>) {
    const {
      versions,
      defaultVersion = versions[0],
      queryParam = 'version',
      strict = false,
      deprecatedVersions = {},
    } = options;

    return (req: Request, res: Response, next: NextFunction): void => {
      const version = req.query[queryParam] as string || defaultVersion;

      if (!this.isValidVersion(version, versions)) {
        if (strict) {
          return next(new BadRequestError(
            `Invalid API version: ${version}. Supported versions: ${versions.join(', ')}`,
            createErrorContext(req)
          ));
        }
        (req as any).apiVersion = defaultVersion;
      } else {
        (req as any).apiVersion = version;
      }

      // Handle deprecated versions
      this.handleDeprecation(version, deprecatedVersions, res);

      // Set response header
      res.set('X-API-Version', (req as any).apiVersion);

      logger.debug('API version resolved', {
        requested: version,
        resolved: (req as any).apiVersion,
        strategy: 'query',
      });

      next();
    };
  }

  // Path-based versioning (/api/v1/users)
  static path(options: Omit<VersioningOptions, 'strategy'>) {
    const {
      versions,
      defaultVersion = versions[0],
      pathPrefix = '/api',
      strict = false,
      deprecatedVersions = {},
    } = options;

    return (req: Request, res: Response, next: NextFunction): void => {
      const pathRegex = new RegExp(`^${pathPrefix}/(v\\d+(?:\\.\\d+)*)`);
      const match = req.path.match(pathRegex);
      const version = match ? match[1] : defaultVersion;

      if (!this.isValidVersion(version, versions)) {
        if (strict) {
          return next(new BadRequestError(
            `Invalid API version: ${version}. Supported versions: ${versions.join(', ')}`,
            createErrorContext(req)
          ));
        }
        (req as any).apiVersion = defaultVersion;
      } else {
        (req as any).apiVersion = version;
      }

      // Handle deprecated versions
      this.handleDeprecation(version, deprecatedVersions, res);

      // Set response header
      res.set('X-API-Version', (req as any).apiVersion);

      logger.debug('API version resolved', {
        requested: version,
        resolved: (req as any).apiVersion,
        strategy: 'path',
        path: req.path,
      });

      next();
    };
  }

  // Accept header versioning (Accept: application/vnd.api+json;version=v1)
  static acceptHeader(options: Omit<VersioningOptions, 'strategy'>) {
    const {
      versions,
      defaultVersion = versions[0],
      acceptHeaderFormat = 'application/vnd.api+json',
      strict = false,
      deprecatedVersions = {},
    } = options;

    return (req: Request, res: Response, next: NextFunction): void => {
      const acceptHeader = req.headers.accept || '';
      const versionRegex = new RegExp(`${acceptHeaderFormat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')};version=(v\\d+(?:\\.\\d+)*)`);
      const match = acceptHeader.match(versionRegex);
      const version = match ? match[1] : defaultVersion;

      if (!this.isValidVersion(version, versions)) {
        if (strict) {
          return next(new BadRequestError(
            `Invalid API version: ${version}. Supported versions: ${versions.join(', ')}`,
            createErrorContext(req)
          ));
        }
        (req as any).apiVersion = defaultVersion;
      } else {
        (req as any).apiVersion = version;
      }

      // Handle deprecated versions
      this.handleDeprecation(version, deprecatedVersions, res);

      // Set response headers
      res.set('X-API-Version', (req as any).apiVersion);
      res.set('Content-Type', `${acceptHeaderFormat};version=${(req as any).apiVersion}`);

      logger.debug('API version resolved', {
        requested: version,
        resolved: (req as any).apiVersion,
        strategy: 'accept-header',
        acceptHeader,
      });

      next();
    };
  }

  // Flexible versioning (tries multiple strategies)
  static flexible(strategies: Array<{ strategy: VersioningOptions['strategy']; options: any }>) {
    return (req: Request, res: Response, next: NextFunction): void => {
      let resolved = false;

      for (const { strategy, options } of strategies) {
        if (resolved) break;

        try {
          let middleware;
          
          switch (strategy) {
            case 'header':
              middleware = this.header(options);
              break;
            case 'query':
              middleware = this.query(options);
              break;
            case 'path':
              middleware = this.path(options);
              break;
            case 'accept-header':
              middleware = this.acceptHeader(options);
              break;
            default:
              continue;
          }

          // Try to resolve version with this strategy
          middleware(req, res, (error) => {
            if (!error && (req as any).apiVersion) {
              resolved = true;
              logger.debug('API version resolved with flexible strategy', {
                strategy,
                version: (req as any).apiVersion,
              });
            }
          });

        } catch (error) {
          // Continue to next strategy
          continue;
        }
      }

      if (!resolved && !(req as any).apiVersion) {
        const defaultVersion = strategies[0]?.options?.defaultVersion || 'v1';
        (req as any).apiVersion = defaultVersion;
        res.set('X-API-Version', defaultVersion);
      }

      next();
    };
  }

  // Version routing middleware
  static router(versionRoutes: Record<string, any>) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const version = (req as any).apiVersion;
      
      if (!version) {
        return next(new BadRequestError(
          'API version not specified',
          createErrorContext(req)
        ));
      }

      const router = versionRoutes[version];
      
      if (!router) {
        return next(new BadRequestError(
          `No router found for version: ${version}`,
          createErrorContext(req)
        ));
      }

      // Apply version-specific router
      router(req, res, next);
    };
  }

  // Version compatibility middleware
  static compatibility(compatibilityMap: Record<string, string[]>) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const requestedVersion = (req as any).apiVersion;
      
      if (!requestedVersion) {
        return next();
      }

      // Check if requested version is compatible with any available versions
      const compatibleVersions = compatibilityMap[requestedVersion];
      
      if (compatibleVersions) {
        (req as any).compatibleVersions = compatibleVersions;
        
        logger.debug('Version compatibility resolved', {
          requested: requestedVersion,
          compatible: compatibleVersions,
        });
      }

      next();
    };
  }

  // Version feature flags
  static features(featureFlags: Record<string, string[]>) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const version = (req as any).apiVersion;
      
      if (version && featureFlags[version]) {
        (req as any).enabledFeatures = featureFlags[version];
        
        logger.debug('Version features enabled', {
          version,
          features: featureFlags[version],
        });
      }

      next();
    };
  }

  // Version analytics
  static analytics() {
    const versionUsage = new Map<string, number>();
    
    return (req: Request, res: Response, next: NextFunction): void => {
      const version = (req as any).apiVersion;
      
      if (version) {
        const current = versionUsage.get(version) || 0;
        versionUsage.set(version, current + 1);
        
        // Log version usage periodically
        if (Math.random() < 0.001) { // 0.1% chance
          logger.info('API version usage statistics', {
            usage: Object.fromEntries(versionUsage.entries()),
          });
        }
      }

      next();
    };
  }

  // Private helper methods
  private static isValidVersion(version: string, validVersions: string[]): boolean {
    return validVersions.includes(version);
  }

  private static handleDeprecation(
    version: string,
    deprecatedVersions: Record<string, { sunset?: string; message?: string }>,
    res: Response
  ): void {
    const deprecationInfo = deprecatedVersions[version];
    
    if (deprecationInfo) {
      res.set('Deprecation', 'true');
      
      if (deprecationInfo.sunset) {
        res.set('Sunset', deprecationInfo.sunset);
      }
      
      if (deprecationInfo.message) {
        res.set('Warning', `299 - "Deprecated API version: ${deprecationInfo.message}"`);
      }

      logger.warn('Deprecated API version used', {
        version,
        deprecationInfo,
      });
    }
  }
}

export default VersioningMiddleware;