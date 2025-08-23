import multer from 'multer';
import path from 'path';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import sharp from 'sharp';
import { logger } from '@/utils/logger';

export interface UploadConfig {
  storage: 'local' | 'cloudinary' | 's3';
  local?: {
    uploadPath: string;
    publicPath: string;
  };
  cloudinary?: {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
    folder: string;
  };
  s3?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    bucket: string;
  };
  limits: {
    fileSize: number; // in bytes
    files: number;
  };
  allowedMimeTypes: string[];
  imageProcessing: {
    quality: number;
    maxWidth: number;
    maxHeight: number;
    generateThumbnails: boolean;
    thumbnailSizes: Array<{ name: string; width: number; height: number }>;
  };
}

const uploadConfig: UploadConfig = {
  storage: (process.env.UPLOAD_STORAGE as 'local' | 'cloudinary' | 's3') || 'cloudinary',
  local: {
    uploadPath: process.env.UPLOAD_PATH || './uploads',
    publicPath: process.env.PUBLIC_UPLOAD_PATH || '/uploads',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    folder: process.env.CLOUDINARY_FOLDER || 'plantix',
  },
  s3: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_S3_REGION || 'us-east-1',
    bucket: process.env.AWS_S3_BUCKET || '',
  },
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB default
    files: parseInt(process.env.MAX_FILES_PER_UPLOAD || '10', 10),
  },
  allowedMimeTypes: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/tiff',
  ],
  imageProcessing: {
    quality: parseInt(process.env.IMAGE_QUALITY || '80', 10),
    maxWidth: parseInt(process.env.MAX_IMAGE_WIDTH || '1920', 10),
    maxHeight: parseInt(process.env.MAX_IMAGE_HEIGHT || '1080', 10),
    generateThumbnails: process.env.GENERATE_THUMBNAILS === 'true',
    thumbnailSizes: [
      { name: 'small', width: 150, height: 150 },
      { name: 'medium', width: 300, height: 300 },
      { name: 'large', width: 600, height: 600 },
    ],
  },
};

// Configure Cloudinary if using cloudinary storage
if (uploadConfig.storage === 'cloudinary' && uploadConfig.cloudinary) {
  cloudinary.config({
    cloud_name: uploadConfig.cloudinary.cloudName,
    api_key: uploadConfig.cloudinary.apiKey,
    api_secret: uploadConfig.cloudinary.apiSecret,
  });
}

// File storage configuration for multer
const createMulterStorage = (): multer.StorageEngine => {
  if (uploadConfig.storage === 'local') {
    return multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, uploadConfig.local!.uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
      },
    });
  }
  
  // For cloud storage, use memory storage
  return multer.memoryStorage();
};

// Multer configuration
export const upload = multer({
  storage: createMulterStorage(),
  limits: {
    fileSize: uploadConfig.limits.fileSize,
    files: uploadConfig.limits.files,
  },
  fileFilter: (req, file, cb) => {
    // Check MIME type
    if (uploadConfig.allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed. Allowed types: ${uploadConfig.allowedMimeTypes.join(', ')}`));
    }
  },
});

// Image processing interface
export interface ProcessedImage {
  original: {
    url: string;
    width: number;
    height: number;
    size: number;
    format: string;
  };
  thumbnails?: Array<{
    name: string;
    url: string;
    width: number;
    height: number;
  }>;
  metadata: {
    uploadedAt: Date;
    originalName: string;
    mimeType: string;
    publicId?: string;
  };
}

export interface UploadResult {
  success: boolean;
  data?: ProcessedImage;
  error?: string;
}

// Upload service class
export class UploadService {
  static async uploadImage(
    file: Express.Multer.File,
    options: {
      folder?: string;
      generateThumbnails?: boolean;
      userId?: string;
    } = {}
  ): Promise<UploadResult> {
    try {
      // Process the image
      const processedBuffer = await this.processImage(file.buffer);
      
      let uploadResult: ProcessedImage;

      switch (uploadConfig.storage) {
        case 'cloudinary':
          uploadResult = await this.uploadToCloudinary(processedBuffer, file, options);
          break;
        case 's3':
          uploadResult = await this.uploadToS3(processedBuffer, file, options);
          break;
        case 'local':
          uploadResult = await this.uploadToLocal(processedBuffer, file, options);
          break;
        default:
          throw new Error(`Unsupported storage type: ${uploadConfig.storage}`);
      }

      logger.info('Image uploaded successfully', {
        originalName: file.originalname,
        storage: uploadConfig.storage,
        userId: options.userId,
        size: file.size,
      });

      return { success: true, data: uploadResult };
    } catch (error) {
      logger.error('Image upload failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        originalName: file.originalname,
        storage: uploadConfig.storage,
        userId: options.userId,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  static async uploadMultipleImages(
    files: Express.Multer.File[],
    options: {
      folder?: string;
      generateThumbnails?: boolean;
      userId?: string;
    } = {}
  ): Promise<{
    success: boolean;
    results: UploadResult[];
    successCount: number;
    failCount: number;
  }> {
    const results: UploadResult[] = [];
    let successCount = 0;
    let failCount = 0;

    // Process uploads in parallel
    const uploadPromises = files.map(async (file) => {
      const result = await this.uploadImage(file, options);
      results.push(result);
      
      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }
      
      return result;
    });

    await Promise.allSettled(uploadPromises);

    return {
      success: successCount > 0,
      results,
      successCount,
      failCount,
    };
  }

  static async deleteImage(publicId: string): Promise<boolean> {
    try {
      switch (uploadConfig.storage) {
        case 'cloudinary':
          await cloudinary.uploader.destroy(publicId);
          break;
        case 's3':
          // S3 deletion would go here
          throw new Error('S3 deletion not implemented');
        case 'local':
          // Local file deletion would go here
          const fs = await import('fs/promises');
          await fs.unlink(path.join(uploadConfig.local!.uploadPath, publicId));
          break;
      }

      logger.info('Image deleted successfully', { publicId, storage: uploadConfig.storage });
      return true;
    } catch (error) {
      logger.error('Image deletion failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        publicId,
        storage: uploadConfig.storage,
      });
      return false;
    }
  }

  // Private helper methods
  private static async processImage(buffer: Buffer): Promise<Buffer> {
    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();

      let processedImage = image;

      // Resize if image is too large
      if (
        (metadata.width && metadata.width > uploadConfig.imageProcessing.maxWidth) ||
        (metadata.height && metadata.height > uploadConfig.imageProcessing.maxHeight)
      ) {
        processedImage = processedImage.resize(
          uploadConfig.imageProcessing.maxWidth,
          uploadConfig.imageProcessing.maxHeight,
          { fit: 'inside', withoutEnlargement: true }
        );
      }

      // Apply quality settings
      processedImage = processedImage.jpeg({
        quality: uploadConfig.imageProcessing.quality,
        progressive: true,
      });

      return await processedImage.toBuffer();
    } catch (error) {
      logger.error('Image processing failed', { error });
      return buffer; // Return original buffer if processing fails
    }
  }

  private static async uploadToCloudinary(
    buffer: Buffer,
    file: Express.Multer.File,
    options: { folder?: string; generateThumbnails?: boolean }
  ): Promise<ProcessedImage> {
    const uploadOptions = {
      folder: `${uploadConfig.cloudinary!.folder}/${options.folder || 'general'}`,
      resource_type: 'image' as const,
      format: 'jpg',
      quality: uploadConfig.imageProcessing.quality,
    };

    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        uploadOptions,
        async (error, result: UploadApiResponse | undefined) => {
          if (error || !result) {
            reject(error || new Error('Upload failed'));
            return;
          }

          const processedImage: ProcessedImage = {
            original: {
              url: result.secure_url,
              width: result.width,
              height: result.height,
              size: result.bytes,
              format: result.format,
            },
            metadata: {
              uploadedAt: new Date(),
              originalName: file.originalname,
              mimeType: file.mimetype,
              publicId: result.public_id,
            },
          };

          // Generate thumbnails if requested
          if (options.generateThumbnails && uploadConfig.imageProcessing.generateThumbnails) {
            processedImage.thumbnails = uploadConfig.imageProcessing.thumbnailSizes.map(size => ({
              name: size.name,
              url: cloudinary.url(result.public_id, {
                width: size.width,
                height: size.height,
                crop: 'fill',
                quality: 'auto',
                format: 'jpg',
              }),
              width: size.width,
              height: size.height,
            }));
          }

          resolve(processedImage);
        }
      ).end(buffer);
    });
  }

  private static async uploadToS3(
    buffer: Buffer,
    file: Express.Multer.File,
    options: { folder?: string }
  ): Promise<ProcessedImage> {
    // S3 upload implementation would go here
    throw new Error('S3 upload not implemented');
  }

  private static async uploadToLocal(
    buffer: Buffer,
    file: Express.Multer.File,
    options: { folder?: string }
  ): Promise<ProcessedImage> {
    const fs = await import('fs/promises');
    const crypto = await import('crypto');
    
    const hash = crypto.createHash('md5').update(buffer).digest('hex');
    const ext = path.extname(file.originalname) || '.jpg';
    const filename = `${hash}${ext}`;
    const folder = options.folder || 'general';
    const relativePath = path.join(folder, filename);
    const fullPath = path.join(uploadConfig.local!.uploadPath, relativePath);

    // Ensure directory exists
    await fs.mkdir(path.dirname(fullPath), { recursive: true });

    // Write file
    await fs.writeFile(fullPath, buffer);

    // Get image metadata
    const image = sharp(buffer);
    const metadata = await image.metadata();

    const processedImage: ProcessedImage = {
      original: {
        url: `${uploadConfig.local!.publicPath}/${relativePath}`,
        width: metadata.width || 0,
        height: metadata.height || 0,
        size: buffer.length,
        format: metadata.format || 'jpg',
      },
      metadata: {
        uploadedAt: new Date(),
        originalName: file.originalname,
        mimeType: file.mimetype,
        publicId: filename,
      },
    };

    return processedImage;
  }

  // Utility methods
  static getStorageInfo(): {
    type: string;
    config: Record<string, unknown>;
    health: 'healthy' | 'unhealthy';
  } {
    let health: 'healthy' | 'unhealthy' = 'healthy';
    const config: Record<string, unknown> = {};

    switch (uploadConfig.storage) {
      case 'cloudinary':
        config.cloudName = uploadConfig.cloudinary?.cloudName;
        config.folder = uploadConfig.cloudinary?.folder;
        health = uploadConfig.cloudinary?.cloudName ? 'healthy' : 'unhealthy';
        break;
      case 's3':
        config.region = uploadConfig.s3?.region;
        config.bucket = uploadConfig.s3?.bucket;
        health = uploadConfig.s3?.bucket ? 'healthy' : 'unhealthy';
        break;
      case 'local':
        config.uploadPath = uploadConfig.local?.uploadPath;
        config.publicPath = uploadConfig.local?.publicPath;
        break;
    }

    return {
      type: uploadConfig.storage,
      config,
      health,
    };
  }

  static async validateImageBuffer(buffer: Buffer): Promise<{
    valid: boolean;
    metadata?: sharp.Metadata;
    error?: string;
  }> {
    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();
      
      if (!metadata.format) {
        return { valid: false, error: 'Invalid image format' };
      }

      return { valid: true, metadata };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid image',
      };
    }
  }

  static generateImageHash(buffer: Buffer): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }
}

// Health check function
export const checkUploadHealth = async (): Promise<{
  status: 'up' | 'down';
  details: Record<string, unknown>;
}> => {
  try {
    const storageInfo = UploadService.getStorageInfo();
    
    // Perform storage-specific health checks
    let connectionTest = true;
    switch (uploadConfig.storage) {
      case 'cloudinary':
        try {
          await cloudinary.api.ping();
        } catch {
          connectionTest = false;
        }
        break;
      case 'local':
        try {
          const fs = await import('fs/promises');
          await fs.access(uploadConfig.local!.uploadPath);
        } catch {
          connectionTest = false;
        }
        break;
      case 's3':
        // S3 connection test would go here
        break;
    }

    return {
      status: connectionTest && storageInfo.health === 'healthy' ? 'up' : 'down',
      details: {
        storage: storageInfo,
        connectionTest,
        limits: uploadConfig.limits,
        allowedMimeTypes: uploadConfig.allowedMimeTypes,
        imageProcessing: uploadConfig.imageProcessing,
      },
    };
  } catch (error) {
    return {
      status: 'down',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        storage: uploadConfig.storage,
      },
    };
  }
};

export default {
  config: uploadConfig,
  upload,
  service: UploadService,
  checkUploadHealth,
};