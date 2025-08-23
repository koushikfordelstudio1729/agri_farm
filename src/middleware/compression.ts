import { Request, Response, NextFunction } from 'express';
import compression from 'compression';
import logger from '@/utils/logger';

export interface CompressionOptions {
  level?: number;
  threshold?: string | number;
  filter?: (req: Request, res: Response) => boolean;
  chunkSize?: number;
  windowBits?: number;
  memLevel?: number;
  strategy?: number;
  dictionary?: Buffer;
}

class CompressionMiddleware {
  // Basic compression middleware
  static basic(options: CompressionOptions = {}) {
    const {
      level = 6,
      threshold = 1024, // 1KB
      filter,
      chunkSize = 16 * 1024, // 16KB
    } = options;

    const compressionOptions: compression.CompressionOptions = {
      level,
      threshold: typeof threshold === 'string' ? this.parseSize(threshold) : threshold,
      filter: filter || this.defaultFilter,
      chunkSize,
    };

    return compression(compressionOptions);
  }

  // High compression (slower but better ratio)
  static high(options: Omit<CompressionOptions, 'level'> = {}) {
    return this.basic({
      level: 9, // Maximum compression
      threshold: 512, // Lower threshold for high compression
      ...options,
    });
  }

  // Fast compression (faster but lower ratio)
  static fast(options: Omit<CompressionOptions, 'level'> = {}) {
    return this.basic({
      level: 1, // Minimum compression for speed
      threshold: 2048, // Higher threshold
      ...options,
    });
  }

  // Conditional compression based on content type
  static conditional(contentTypes: string[], options: CompressionOptions = {}) {
    return this.basic({
      filter: (req: Request, res: Response) => {
        const contentType = res.getHeader('Content-Type') as string;
        return contentType && contentTypes.some(type => contentType.includes(type));
      },
      ...options,
    });
  }

  // API response compression
  static api(options: CompressionOptions = {}) {
    return this.basic({
      filter: (req: Request, res: Response) => {
        // Compress JSON and text responses
        const contentType = res.getHeader('Content-Type') as string;
        return contentType && (
          contentType.includes('application/json') ||
          contentType.includes('text/') ||
          contentType.includes('application/javascript')
        );
      },
      threshold: 512, // Lower threshold for API responses
      ...options,
    });
  }

  // Dynamic compression based on client capabilities
  static dynamic(options: CompressionOptions = {}) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const acceptEncoding = req.headers['accept-encoding'] || '';
      const supportsGzip = acceptEncoding.includes('gzip');
      const supportsBrotli = acceptEncoding.includes('br');

      if (!supportsGzip && !supportsBrotli) {
        // Client doesn't support compression
        return next();
      }

      // Choose compression level based on client connection
      let level = 6; // Default
      const connection = req.headers.connection;
      const userAgent = req.headers['user-agent'] || '';

      // Use faster compression for mobile clients
      if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
        level = 3; // Faster compression for mobile
      }

      // Use higher compression for slow connections
      if (connection === 'keep-alive') {
        level = 7; // Slightly higher compression for persistent connections
      }

      const compressionMiddleware = this.basic({
        level,
        ...options,
      });

      compressionMiddleware(req, res, next);
    };
  }

  // Compression with performance monitoring
  static monitored(options: CompressionOptions = {}) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const startTime = Date.now();
      let originalSize = 0;
      let compressedSize = 0;

      // Capture original response size
      const originalWrite = res.write;
      const originalEnd = res.end;

      res.write = function(chunk: any, encoding?: any): boolean {
        if (chunk) {
          originalSize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk);
        }
        return originalWrite.call(this, chunk, encoding);
      };

      res.end = function(chunk?: any, encoding?: any): Response {
        if (chunk) {
          originalSize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk);
        }

        // Get compressed size from Content-Length header
        const contentLength = this.getHeader('Content-Length');
        if (contentLength) {
          compressedSize = parseInt(contentLength as string, 10);
        }

        // Log compression metrics
        const compressionTime = Date.now() - startTime;
        const compressionRatio = originalSize > 0 ? (1 - compressedSize / originalSize) * 100 : 0;

        logger.debug('Compression metrics', {
          originalSize,
          compressedSize,
          compressionRatio: Math.round(compressionRatio * 100) / 100,
          compressionTime,
          endpoint: req.originalUrl,
        });

        return originalEnd.call(this, chunk, encoding);
      };

      const compressionMiddleware = this.basic(options);
      compressionMiddleware(req, res, next);
    };
  }

  // Size-aware compression
  static sizeAware(sizeThresholds: Array<{ size: number; level: number }>) {
    return (req: Request, res: Response, next: NextFunction): void => {
      // Estimate response size (this is a simplified approach)
      const estimatedSize = this.estimateResponseSize(req);
      
      // Find appropriate compression level
      let level = 6; // Default
      for (const threshold of sizeThresholds.sort((a, b) => a.size - b.size)) {
        if (estimatedSize >= threshold.size) {
          level = threshold.level;
        }
      }

      const compressionMiddleware = this.basic({ level });
      compressionMiddleware(req, res, next);
    };
  }

  // Compression bypass for certain conditions
  static bypass(conditions: {
    skipUserAgents?: string[];
    skipPaths?: string[];
    skipMethods?: string[];
    skipHeaders?: Record<string, string>;
  }) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const {
        skipUserAgents = [],
        skipPaths = [],
        skipMethods = [],
        skipHeaders = {},
      } = conditions;

      // Check skip conditions
      const userAgent = req.headers['user-agent'] || '';
      const shouldSkip = 
        skipUserAgents.some(ua => userAgent.includes(ua)) ||
        skipPaths.some(path => req.path.includes(path)) ||
        skipMethods.includes(req.method) ||
        Object.entries(skipHeaders).some(([header, value]) => 
          req.headers[header.toLowerCase()] === value
        );

      if (shouldSkip) {
        logger.debug('Compression bypassed', {
          reason: 'skip condition met',
          path: req.path,
          userAgent: userAgent.substring(0, 50),
        });
        return next();
      }

      const compressionMiddleware = this.basic();
      compressionMiddleware(req, res, next);
    };
  }

  // Compression with caching integration
  static cached(options: CompressionOptions = {}) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const acceptEncoding = req.headers['accept-encoding'] || '';
      
      // Modify cache key to include encoding preferences
      if ((req as any).cacheKey) {
        (req as any).cacheKey += `:encoding:${Buffer.from(acceptEncoding).toString('base64')}`;
      }

      const compressionMiddleware = this.basic(options);
      compressionMiddleware(req, res, next);
    };
  }

  // Private helper methods
  private static defaultFilter(req: Request, res: Response): boolean {
    // Default compression filter
    const contentType = res.getHeader('Content-Type') as string;
    
    if (!contentType) return false;

    // Compress text-based content types
    const compressibleTypes = [
      'text/',
      'application/json',
      'application/javascript',
      'application/xml',
      'application/rss+xml',
      'application/atom+xml',
      'image/svg+xml',
    ];

    return compressibleTypes.some(type => contentType.includes(type));
  }

  private static parseSize(size: string): number {
    const units: Record<string, number> = {
      b: 1,
      kb: 1024,
      mb: 1024 * 1024,
      gb: 1024 * 1024 * 1024,
    };

    const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)([a-z]+)?$/);
    if (!match) return parseInt(size, 10) || 0;

    const value = parseFloat(match[1]);
    const unit = match[2] || 'b';

    return Math.floor(value * (units[unit] || 1));
  }

  private static estimateResponseSize(req: Request): number {
    // This is a simplified estimation - in practice, you might want to
    // analyze the route, query parameters, etc.
    const query = JSON.stringify(req.query);
    const pathComplexity = req.path.split('/').length;
    
    // Basic estimation based on path and query complexity
    let estimatedSize = 1024; // Base size
    
    if (query.length > 100) estimatedSize += 5120; // Large query
    if (pathComplexity > 4) estimatedSize += 2048; // Complex path
    if (req.path.includes('list') || req.path.includes('search')) {
      estimatedSize += 10240; // Likely to return arrays
    }

    return estimatedSize;
  }
}

export default CompressionMiddleware;