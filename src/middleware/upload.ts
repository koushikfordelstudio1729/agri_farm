import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { v2 as cloudinary } from 'cloudinary';
import { logger } from '@/utils/logger';
import { FileUploadError } from '@/utils/errors';
import type {
  UploadOptions,
  FileFilterFunction,
  StorageType,
  CloudinaryOptions,
  FileProcessingOptions,
  ProcessedFile,
  UploadResult,
} from '@/types/upload.types';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

class UploadMiddleware {
  /**
   * Get storage engine based on configuration
   */
  private static getStorage(options: UploadOptions): multer.StorageEngine {
    const { storage = 'memory', destination = 'uploads/' } = options;

    switch (storage) {
      case 'disk':
        return multer.diskStorage({
          destination: (req, file, cb) => {
            cb(null, destination);
          },
          filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + crypto.randomUUID();
            const ext = path.extname(file.originalname);
            cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
          },
        });

      case 'memory':
      default:
        return multer.memoryStorage();
    }
  }

  /**
   * Get file filter function with validation
   */
  private static getFileFilter(options: UploadOptions): FileFilterFunction {
    const {
      allowedMimeTypes = [],
      allowedExtensions = [],
      blockedMimeTypes = [],
      blockedExtensions = [],
      customValidator,
    } = options;

    return (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
      try {
        // Check blocked mime types first
        if (blockedMimeTypes.length > 0) {
          const isMimeTypeBlocked = blockedMimeTypes.some(type => {
            if (type.endsWith('/*')) {
              return file.mimetype.startsWith(type.replace('/*', '/'));
            }
            return file.mimetype === type;
          });

          if (isMimeTypeBlocked) {
            logger.warn('File upload rejected: Blocked mime type', {
              filename: file.originalname,
              mimetype: file.mimetype,
              blockedMimeTypes,
            });
            return cb(new FileUploadError(`File type ${file.mimetype} is not allowed`));
          }
        }

        // Check blocked extensions
        const ext = path.extname(file.originalname).toLowerCase();
        if (blockedExtensions.includes(ext)) {
          logger.warn('File upload rejected: Blocked extension', {
            filename: file.originalname,
            extension: ext,
            blockedExtensions,
          });
          return cb(new FileUploadError(`File extension ${ext} is not allowed`));
        }

        // Check allowed mime types
        if (allowedMimeTypes.length > 0) {
          const isMimeTypeAllowed = allowedMimeTypes.some(type => {
            if (type.endsWith('/*')) {
              return file.mimetype.startsWith(type.replace('/*', '/'));
            }
            return file.mimetype === type;
          });

          if (!isMimeTypeAllowed) {
            logger.warn('File upload rejected: Invalid mime type', {
              filename: file.originalname,
              mimetype: file.mimetype,
              allowedMimeTypes,
            });
            return cb(new FileUploadError(`File type ${file.mimetype} not allowed`));
          }
        }

        // Check allowed file extensions
        if (allowedExtensions.length > 0) {
          if (!allowedExtensions.includes(ext)) {
            logger.warn('File upload rejected: Invalid extension', {
              filename: file.originalname,
              extension: ext,
              allowedExtensions,
            });
            return cb(new FileUploadError(`File extension ${ext} not allowed`));
          }
        }

        // Run custom validator if provided
        if (customValidator) {
          const validationResult = customValidator(file);
          if (!validationResult.isValid) {
            logger.warn('File upload rejected: Custom validation failed', {
              filename: file.originalname,
              error: validationResult.error,
            });
            return cb(new FileUploadError(validationResult.error || 'File validation failed'));
          }
        }

        // Validate file name for security
        if (this.containsSuspiciousPatterns(file.originalname)) {
          logger.warn('File upload rejected: Suspicious filename', {
            filename: file.originalname,
          });
          return cb(new FileUploadError('Filename contains invalid characters'));
        }

        logger.info('File upload accepted', {
          filename: file.originalname,
          mimetype: file.mimetype,
          size: file.size || 'unknown',
        });

        cb(null, true);
      } catch (error) {
        logger.error('File filter error', error instanceof Error ? error : new Error(String(error)));
        cb(new FileUploadError('File validation failed'));
      }
    };
  }

  /**
   * Check for suspicious patterns in filename
   */
  private static containsSuspiciousPatterns(filename: string): boolean {
    const suspiciousPatterns = [
      /\.\./,        // Directory traversal
      /[<>:"|?*]/,   // Invalid filename characters
      /^\./,         // Hidden files
      /\.(exe|bat|cmd|com|pif|scr|vbs|js)$/i, // Executable extensions
    ];

    return suspiciousPatterns.some(pattern => pattern.test(filename));
  }

  /**
   * Create multer instance with options
   */
  static create(options: UploadOptions = {}): multer.Multer {
    const {
      maxFileSize = 10 * 1024 * 1024, // 10MB
      maxFiles = 5,
      maxFieldSize = 1024 * 1024, // 1MB
      preservePath = false,
    } = options;

    const storage = this.getStorage(options);
    const fileFilter = this.getFileFilter(options);

    return multer({
      storage,
      fileFilter,
      limits: {
        fileSize: maxFileSize,
        files: maxFiles,
        fieldSize: maxFieldSize,
        fieldNameSize: 100,
        fields: 20,
      },
      preservePath,
    });
  }

  /**
   * Image upload configuration
   */
  static image(options: Partial<UploadOptions> = {}): multer.Multer {
    const imageOptions: UploadOptions = {
      maxFileSize: 5 * 1024 * 1024, // 5MB
      maxFiles: 10,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
      blockedExtensions: ['.svg', '.bmp'], // Potentially unsafe formats
      storage: 'memory',
      customValidator: (file) => {
        // Additional image validation
        if (file.size && file.size < 1024) {
          return { isValid: false, error: 'Image file too small (min 1KB)' };
        }
        return { isValid: true };
      },
      ...options,
    };

    return this.create(imageOptions);
  }

  /**
   * Document upload configuration
   */
  static document(options: Partial<UploadOptions> = {}): multer.Multer {
    const documentOptions: UploadOptions = {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      allowedMimeTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/csv',
      ],
      allowedExtensions: ['.pdf', '.doc', '.docx', '.txt', '.csv'],
      blockedMimeTypes: ['application/x-executable', 'application/x-msdownload'],
      storage: 'memory',
      ...options,
    };

    return this.create(documentOptions);
  }

  /**
   * Video upload configuration
   */
  static video(options: Partial<UploadOptions> = {}): multer.Multer {
    const videoOptions: UploadOptions = {
      maxFileSize: 100 * 1024 * 1024, // 100MB
      maxFiles: 3,
      allowedMimeTypes: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/webm'],
      allowedExtensions: ['.mp4', '.avi', '.mov', '.wmv', '.webm'],
      storage: 'memory',
      customValidator: (file) => {
        // Additional video validation
        if (file.size && file.size < 10 * 1024) {
          return { isValid: false, error: 'Video file too small (min 10KB)' };
        }
        return { isValid: true };
      },
      ...options,
    };

    return this.create(videoOptions);
  }

  /**
   * Audio upload configuration
   */
  static audio(options: Partial<UploadOptions> = {}): multer.Multer {
    const audioOptions: UploadOptions = {
      maxFileSize: 50 * 1024 * 1024, // 50MB
      maxFiles: 5,
      allowedMimeTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm'],
      allowedExtensions: ['.mp3', '.wav', '.ogg', '.m4a', '.webm'],
      storage: 'memory',
      ...options,
    };

    return this.create(audioOptions);
  }

  /**
   * Any file type configuration (use with caution)
   */
  static any(options: Partial<UploadOptions> = {}): multer.Multer {
    const anyOptions: UploadOptions = {
      maxFileSize: 50 * 1024 * 1024, // 50MB
      maxFiles: 10,
      storage: 'memory',
      // Still block dangerous file types
      blockedExtensions: ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js'],
      blockedMimeTypes: ['application/x-executable', 'application/x-msdownload'],
      ...options,
    };

    return this.create(anyOptions);
  }

  /**
   * Error handling middleware
   */
  static errorHandler() {
    return (err: any, req: Request, res: Response, next: NextFunction) => {
      if (err instanceof multer.MulterError) {
        let message = 'File upload error';
        let statusCode = 400;
        
        switch (err.code) {
          case 'LIMIT_FILE_SIZE':
            message = 'File size too large';
            break;
          case 'LIMIT_FILE_COUNT':
            message = 'Too many files';
            break;
          case 'LIMIT_FIELD_KEY':
            message = 'Field name too long';
            break;
          case 'LIMIT_FIELD_VALUE':
            message = 'Field value too long';
            break;
          case 'LIMIT_FIELD_COUNT':
            message = 'Too many fields';
            break;
          case 'LIMIT_UNEXPECTED_FILE':
            message = 'Unexpected file field';
            break;
          case 'LIMIT_PART_COUNT':
            message = 'Too many parts';
            break;
        }

        logger.warn('Multer error', {
          code: err.code,
          message: err.message,
          field: err.field,
          limit: err.limit,
        });

        const error = new FileUploadError(message);
        (error as any).statusCode = statusCode;
        return next(error);
      }

      if (err instanceof FileUploadError) {
        return next(err);
      }

      next(err);
    };
  }

  /**
   * File validation middleware
   */
  static validateFiles(options: {
    required?: boolean;
    minFiles?: number;
    maxFiles?: number;
    fieldName?: string;
    allowEmpty?: boolean;
  } = {}) {
    return (req: Request, res: Response, next: NextFunction) => {
      const { required = false, minFiles = 0, maxFiles, fieldName, allowEmpty = false } = options;
      
      let fileArray: Express.Multer.File[] = [];
      
      if (fieldName) {
        const fieldFiles = (req.files as any)?.[fieldName];
        fileArray = Array.isArray(fieldFiles) ? fieldFiles : fieldFiles ? [fieldFiles] : [];
      } else {
        const files = req.files;
        if (Array.isArray(files)) {
          fileArray = files;
        } else if (files) {
          fileArray = Object.values(files).flat();
        } else if (req.file) {
          fileArray = [req.file];
        }
      }

      if (required && fileArray.length === 0) {
        return next(new FileUploadError('At least one file is required'));
      }

      if (!allowEmpty && fileArray.length === 0 && (minFiles > 0 || required)) {
        return next(new FileUploadError('Files are required'));
      }

      if (fileArray.length < minFiles) {
        return next(new FileUploadError(`At least ${minFiles} files are required`));
      }

      if (maxFiles && fileArray.length > maxFiles) {
        return next(new FileUploadError(`Maximum ${maxFiles} files allowed`));
      }

      logger.info('File validation passed', {
        fileCount: fileArray.length,
        fieldName,
        totalSize: fileArray.reduce((sum, file) => sum + (file.size || 0), 0),
      });

      next();
    };
  }

  /**
   * Process images with Sharp
   */
  static processImages(options: FileProcessingOptions = {}) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.files && !req.file) {
          return next();
        }

        const files = req.files ? 
          (Array.isArray(req.files) ? req.files : Object.values(req.files).flat()) :
          [req.file].filter(Boolean);

        const processedFiles: ProcessedFile[] = [];

        for (const file of files as Express.Multer.File[]) {
          if (file.mimetype.startsWith('image/')) {
            const processed = await this.processImage(file, options);
            processedFiles.push(processed);
          } else {
            // Keep non-image files as-is
            processedFiles.push({
              originalName: file.originalname,
              mimetype: file.mimetype,
              size: file.size,
              buffer: file.buffer,
              fieldname: file.fieldname,
              encoding: file.encoding,
              processed: false,
              uploadedAt: new Date(),
            });
          }
        }

        (req as any).processedFiles = processedFiles;
        next();
      } catch (error) {
        logger.error('Image processing error', { error });
        next(new FileUploadError('Image processing failed'));
      }
    };
  }

  /**
   * Process single image
   */
  private static async processImage(
    file: Express.Multer.File,
    options: FileProcessingOptions
  ): Promise<ProcessedFile> {
    const {
      resize,
      quality = 80,
      format = 'jpeg',
      removeExif = true,
      generateThumbnail = false,
      thumbnailSize = { width: 150, height: 150 },
    } = options;

    let sharpInstance = sharp(file.buffer);

    // Remove EXIF data for privacy
    if (removeExif) {
      sharpInstance = sharpInstance.withMetadata({ exif: {} });
    }

    // Resize if specified
    if (resize) {
      sharpInstance = sharpInstance.resize(resize.width, resize.height, {
        fit: resize.fit || 'cover',
        position: resize.position || 'center',
        withoutEnlargement: resize.withoutEnlargement !== false,
      });
    }

    // Convert format and set quality
    if (format === 'jpeg') {
      sharpInstance = sharpInstance.jpeg({ quality });
    } else if (format === 'png') {
      sharpInstance = sharpInstance.png({ quality });
    } else if (format === 'webp') {
      sharpInstance = sharpInstance.webp({ quality });
    }

    const processedBuffer = await sharpInstance.toBuffer();
    const { width, height } = await sharp(processedBuffer).metadata();

    const result: ProcessedFile = {
      originalName: file.originalname,
      mimetype: `image/${format}`,
      size: processedBuffer.length,
      buffer: processedBuffer,
      fieldname: file.fieldname,
      encoding: file.encoding,
      processed: true,
      dimensions: width && height ? { width, height } : undefined,
      uploadedAt: new Date(),
    };

    // Generate thumbnail if requested
    if (generateThumbnail) {
      const thumbnailBuffer = await sharp(file.buffer)
        .resize(thumbnailSize.width, thumbnailSize.height, { fit: 'cover' })
        .jpeg({ quality: 70 })
        .toBuffer();

      result.thumbnail = {
        buffer: thumbnailBuffer,
        size: thumbnailBuffer.length,
        dimensions: thumbnailSize,
      };
    }

    return result;
  }

  /**
   * Upload to Cloudinary
   */
  static uploadToCloudinary(options: CloudinaryOptions = {}) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const files = (req as any).processedFiles || [];
        if (files.length === 0) {
          return next();
        }

        const uploadResults: UploadResult[] = [];

        for (const file of files) {
          const result = await this.uploadSingleToCloudinary(file, options);
          uploadResults.push(result);
        }

        (req as any).uploadResults = uploadResults;
        next();
      } catch (error) {
        logger.error('Cloudinary upload error', { error });
        next(new FileUploadError('File upload to cloud storage failed'));
      }
    };
  }

  /**
   * Upload single file to Cloudinary
   */
  private static async uploadSingleToCloudinary(
    file: ProcessedFile,
    options: CloudinaryOptions
  ): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const uploadOptions = {
        folder: options.folder || 'agri-farm',
        public_id: options.generatePublicId ? 
          `${Date.now()}-${crypto.randomUUID()}` : undefined,
        overwrite: options.overwrite !== false,
        resource_type: 'auto' as const,
        ...options.cloudinaryOptions,
      };

      cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            logger.error('Cloudinary upload failed', { error });
            reject(new FileUploadError('Cloud upload failed'));
            return;
          }

          if (!result) {
            reject(new FileUploadError('No result from cloud upload'));
            return;
          }

          resolve({
            publicId: result.public_id,
            url: result.secure_url,
            originalName: file.originalName,
            size: result.bytes,
            format: result.format,
            width: result.width,
            height: result.height,
            resourceType: result.resource_type,
            uploadedAt: new Date(),
          });
        }
      ).end(file.buffer);
    });
  }

  /**
   * Extract file metadata
   */
  static extractMetadata() {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.files && !req.file) {
          return next();
        }

        const files = req.files ? 
          (Array.isArray(req.files) ? req.files : Object.values(req.files).flat()) :
          [req.file].filter(Boolean);

        (req as any).fileMetadata = files.map((file: Express.Multer.File) => ({
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          fieldname: file.fieldname,
          encoding: file.encoding,
          uploadedAt: new Date(),
          checksum: file.buffer ? crypto.createHash('md5').update(file.buffer).digest('hex') : null,
        }));

        next();
      } catch (error) {
        logger.error('Metadata extraction error', { error });
        next(new FileUploadError('Failed to extract file metadata'));
      }
    };
  }

  /**
   * Security scan middleware (basic implementation)
   */
  static securityScan() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const files = (req as any).processedFiles || [];
        
        for (const file of files) {
          // Basic security checks
          await this.performSecurityCheck(file);
        }

        next();
      } catch (error) {
        logger.error('Security scan failed', { error });
        next(new FileUploadError('File security check failed'));
      }
    };
  }

  /**
   * Perform basic security check on file
   */
  private static async performSecurityCheck(file: ProcessedFile): Promise<void> {
    // Check for embedded scripts in images
    if (file.mimetype.startsWith('image/') && file.buffer) {
      const content = file.buffer.toString('utf8');
      
      // Look for script tags or suspicious patterns
      const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /onload=/i,
        /onerror=/i,
        /<iframe/i,
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(content)) {
          throw new FileUploadError('File contains potentially malicious content');
        }
      }
    }

    // Check file size consistency
    if (file.size === 0) {
      throw new FileUploadError('Empty files are not allowed');
    }

    // Additional checks can be added here (virus scanning, etc.)
  }
}

// Export instance methods for backward compatibility
export const uploadMiddleware = {
  single: (fieldName: string, options?: Partial<UploadOptions>) => 
    UploadMiddleware.create(options).single(fieldName),
  array: (fieldName: string, maxCount?: number, options?: Partial<UploadOptions>) =>
    UploadMiddleware.create(options).array(fieldName, maxCount),
  fields: (fields: multer.Field[], options?: Partial<UploadOptions>) =>
    UploadMiddleware.create(options).fields(fields),
  none: (options?: Partial<UploadOptions>) =>
    UploadMiddleware.create(options).none(),
  any: (options?: Partial<UploadOptions>) =>
    UploadMiddleware.create(options).any(),
};

export { UploadMiddleware };
export default UploadMiddleware;