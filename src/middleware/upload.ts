import multer from 'multer';
import { Request } from 'express';
import path from 'path';
import crypto from 'crypto';
import { FileUploadError } from '@/utils/errors';
import { UploadOptions, FileFilterFunction, StorageType } from './upload.types';
import { logger } from '@/utils/logger';

export class UploadMiddleware {
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

  private static getFileFilter(options: UploadOptions): FileFilterFunction {
    const {
      allowedMimeTypes = [],
      allowedExtensions = [],
      maxFileSize = 10 * 1024 * 1024, // 10MB
    } = options;

    return (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
      try {
        // Check mime type
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

        // Check file extension
        if (allowedExtensions.length > 0) {
          const ext = path.extname(file.originalname).toLowerCase();
          if (!allowedExtensions.includes(ext)) {
            logger.warn('File upload rejected: Invalid extension', {
              filename: file.originalname,
              extension: ext,
              allowedExtensions,
            });
            return cb(new FileUploadError(`File extension ${ext} not allowed`));
          }
        }

        // File size is handled by multer limits, but we can add additional checks here
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
      },
      preservePath,
    });
  }

  // Predefined upload configurations
  static image(options: Partial<UploadOptions> = {}): multer.Multer {
    const imageOptions: UploadOptions = {
      maxFileSize: 5 * 1024 * 1024, // 5MB
      maxFiles: 10,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
      storage: 'memory',
      ...options,
    };

    return this.create(imageOptions);
  }

  static document(options: Partial<UploadOptions> = {}): multer.Multer {
    const documentOptions: UploadOptions = {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      allowedMimeTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
      ],
      allowedExtensions: ['.pdf', '.doc', '.docx', '.txt'],
      storage: 'memory',
      ...options,
    };

    return this.create(documentOptions);
  }

  static video(options: Partial<UploadOptions> = {}): multer.Multer {
    const videoOptions: UploadOptions = {
      maxFileSize: 100 * 1024 * 1024, // 100MB
      maxFiles: 3,
      allowedMimeTypes: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv'],
      allowedExtensions: ['.mp4', '.avi', '.mov', '.wmv'],
      storage: 'memory',
      ...options,
    };

    return this.create(videoOptions);
  }

  static audio(options: Partial<UploadOptions> = {}): multer.Multer {
    const audioOptions: UploadOptions = {
      maxFileSize: 50 * 1024 * 1024, // 50MB
      maxFiles: 5,
      allowedMimeTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4'],
      allowedExtensions: ['.mp3', '.wav', '.ogg', '.m4a'],
      storage: 'memory',
      ...options,
    };

    return this.create(audioOptions);
  }

  static any(options: Partial<UploadOptions> = {}): multer.Multer {
    const anyOptions: UploadOptions = {
      maxFileSize: 50 * 1024 * 1024, // 50MB
      maxFiles: 10,
      storage: 'memory',
      ...options,
    };

    return this.create(anyOptions);
  }

  // Error handling middleware
  static errorHandler() {
    return (err: any, req: Request, res: any, next: any) => {
      if (err instanceof multer.MulterError) {
        let message = 'File upload error';
        
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
        }

        logger.warn('Multer error', {
          code: err.code,
          message: err.message,
          field: err.field,
        });

        return next(new FileUploadError(message));
      }

      next(err);
    };
  }

  // Validation middleware for uploaded files
  static validateFiles(options: {
    required?: boolean;
    minFiles?: number;
    maxFiles?: number;
    fieldName?: string;
  } = {}) {
    return (req: Request, res: any, next: any) => {
      const { required = false, minFiles = 0, maxFiles, fieldName } = options;
      
      const files = fieldName ? req.files?.[fieldName] : req.files;
      const fileArray = Array.isArray(files) ? files : files ? [files] : [];

      if (required && fileArray.length === 0) {
        return next(new FileUploadError('At least one file is required'));
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
      });

      next();
    };
  }

  // File metadata extraction
  static extractMetadata() {
    return (req: Request, res: any, next: any) => {
      if (req.files || req.file) {
        const files = req.files ? 
          (Array.isArray(req.files) ? req.files : Object.values(req.files).flat()) :
          [req.file];

        (req as any).fileMetadata = files.map((file: any) => ({
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          fieldname: file.fieldname,
          encoding: file.encoding,
          buffer: file.buffer,
          uploadedAt: new Date(),
        }));
      }

      next();
    };
  }
}

export default UploadMiddleware;