import sharp from 'sharp';
import { v2 as cloudinary } from 'cloudinary';
import { FileUpload } from '@/types/common.types';
import { 
  ImageProcessingOptions, 
  ImageUploadResult, 
  ThumbnailOptions,
  WatermarkOptions 
} from './imageService.types';
import { logger } from '@/utils/logger';
import { FileUploadError, ExternalServiceError } from '@/utils/errors';

export class ImageService {
  private static isCloudinaryConfigured(): boolean {
    return !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );
  }

  static async processImage(
    buffer: Buffer,
    options: ImageProcessingOptions = {}
  ): Promise<Buffer> {
    try {
      const {
        width,
        height,
        quality = 85,
        format = 'jpeg',
        fit = 'cover',
        crop = 'center',
        sharpen = false,
        normalize = false,
      } = options;

      let image = sharp(buffer);

      // Get metadata
      const metadata = await image.metadata();
      
      logger.info('Processing image', {
        originalWidth: metadata.width,
        originalHeight: metadata.height,
        format: metadata.format,
        targetWidth: width,
        targetHeight: height,
        targetFormat: format,
      });

      // Resize if dimensions provided
      if (width || height) {
        image = image.resize(width, height, {
          fit: fit as any,
          position: crop as any,
          withoutEnlargement: options.withoutEnlargement || false,
        });
      }

      // Apply filters
      if (normalize) {
        image = image.normalize();
      }

      if (sharpen) {
        image = image.sharpen();
      }

      // Convert format and set quality
      switch (format) {
        case 'jpeg':
        case 'jpg':
          image = image.jpeg({ quality, progressive: true });
          break;
        case 'png':
          image = image.png({ quality, progressive: true });
          break;
        case 'webp':
          image = image.webp({ quality });
          break;
        default:
          image = image.jpeg({ quality, progressive: true });
      }

      const processedBuffer = await image.toBuffer();
      
      logger.info('Image processed successfully', {
        originalSize: buffer.length,
        processedSize: processedBuffer.length,
        compressionRatio: Math.round((1 - processedBuffer.length / buffer.length) * 100),
      });

      return processedBuffer;
    } catch (error) {
      logger.error('Image processing failed', error instanceof Error ? error : new Error(String(error)));
      throw new FileUploadError('Image processing failed');
    }
  }

  static async generateThumbnail(
    buffer: Buffer,
    options: ThumbnailOptions = {}
  ): Promise<Buffer> {
    const {
      width = 300,
      height = 300,
      quality = 80,
      format = 'jpeg',
      fit = 'cover',
    } = options;

    return this.processImage(buffer, {
      width,
      height,
      quality,
      format,
      fit,
      withoutEnlargement: true,
    });
  }

  static async addWatermark(
    buffer: Buffer,
    watermarkOptions: WatermarkOptions
  ): Promise<Buffer> {
    try {
      const { type, content, position = 'bottom-right', opacity = 0.5 } = watermarkOptions;
      
      const image = sharp(buffer);
      const metadata = await image.metadata();

      if (type === 'text') {
        // For text watermarks, we would need to create an SVG
        const svgWatermark = `
          <svg width="${metadata.width}" height="${metadata.height}">
            <text x="10" y="30" font-family="Arial" font-size="20" fill="white" opacity="${opacity}">
              ${content}
            </text>
          </svg>
        `;

        return image
          .composite([{
            input: Buffer.from(svgWatermark),
            gravity: this.getSharpGravity(position),
          }])
          .toBuffer();
      } else if (type === 'image' && typeof content === 'string') {
        // For image watermarks
        const watermarkBuffer = Buffer.from(content, 'base64');
        
        return image
          .composite([{
            input: watermarkBuffer,
            gravity: this.getSharpGravity(position),
            blend: 'over',
          }])
          .toBuffer();
      }

      throw new Error('Invalid watermark configuration');
    } catch (error) {
      logger.error('Watermark application failed', error instanceof Error ? error : new Error(String(error)));
      throw new FileUploadError('Watermark application failed');
    }
  }

  private static getSharpGravity(position: string): any {
    const gravityMap: Record<string, string> = {
      'top-left': 'northwest',
      'top-center': 'north',
      'top-right': 'northeast',
      'center-left': 'west',
      'center': 'center',
      'center-right': 'east',
      'bottom-left': 'southwest',
      'bottom-center': 'south',
      'bottom-right': 'southeast',
    };

    return gravityMap[position] || 'southeast';
  }

  static async uploadToCloudinary(
    buffer: Buffer,
    options: {
      folder?: string;
      publicId?: string;
      transformation?: any[];
      tags?: string[];
    } = {}
  ): Promise<ImageUploadResult> {
    if (!this.isCloudinaryConfigured()) {
      throw new ExternalServiceError('Cloudinary', 'Cloudinary not configured');
    }

    try {
      const {
        folder = 'agri-farm',
        publicId,
        transformation = [],
        tags = [],
      } = options;

      const uploadOptions = {
        folder,
        ...(publicId && { public_id: publicId }),
        transformation,
        tags,
        resource_type: 'image' as const,
      };

      const result = await new Promise<any>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(buffer);
      });

      logger.info('Image uploaded to Cloudinary', {
        publicId: result.public_id,
        url: result.secure_url,
        size: result.bytes,
        format: result.format,
      });

      return {
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.bytes,
        thumbnailUrl: this.generateCloudinaryThumbnailUrl(result.public_id),
      };
    } catch (error) {
      logger.error('Cloudinary upload failed', error instanceof Error ? error : new Error(String(error)));
      throw new ExternalServiceError('Cloudinary', 'Image upload failed', error as Error);
    }
  }

  private static generateCloudinaryThumbnailUrl(publicId: string): string {
    if (!process.env.CLOUDINARY_CLOUD_NAME) return '';
    
    return `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/c_thumb,w_300,h_300,g_face/${publicId}.jpg`;
  }

  static async deleteFromCloudinary(publicId: string): Promise<boolean> {
    if (!this.isCloudinaryConfigured()) {
      throw new ExternalServiceError('Cloudinary', 'Cloudinary not configured');
    }

    try {
      const result = await cloudinary.uploader.destroy(publicId);
      
      logger.info('Image deleted from Cloudinary', {
        publicId,
        result: result.result,
      });

      return result.result === 'ok';
    } catch (error) {
      logger.error('Cloudinary deletion failed', error instanceof Error ? error : new Error(String(error)));
      throw new ExternalServiceError('Cloudinary', 'Image deletion failed', error as Error);
    }
  }

  static async getImageInfo(buffer: Buffer): Promise<{
    width: number;
    height: number;
    format: string;
    size: number;
    hasAlpha: boolean;
    colorSpace: string;
  }> {
    try {
      const metadata = await sharp(buffer).metadata();
      
      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: buffer.length,
        hasAlpha: metadata.hasAlpha || false,
        colorSpace: metadata.space || 'unknown',
      };
    } catch (error) {
      logger.error('Failed to get image info', error instanceof Error ? error : new Error(String(error)));
      throw new FileUploadError('Failed to analyze image');
    }
  }

  static async validateImage(buffer: Buffer, options: {
    maxWidth?: number;
    maxHeight?: number;
    minWidth?: number;
    minHeight?: number;
    maxSize?: number;
    allowedFormats?: string[];
  } = {}): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    try {
      const info = await this.getImageInfo(buffer);
      
      const {
        maxWidth,
        maxHeight,
        minWidth = 1,
        minHeight = 1,
        maxSize = 10 * 1024 * 1024, // 10MB
        allowedFormats = ['jpeg', 'jpg', 'png', 'webp', 'gif'],
      } = options;

      // Size validation
      if (info.size > maxSize) {
        errors.push(`Image size ${Math.round(info.size / 1024 / 1024)}MB exceeds maximum ${Math.round(maxSize / 1024 / 1024)}MB`);
      }

      // Dimension validation
      if (info.width < minWidth) {
        errors.push(`Image width ${info.width}px is less than minimum ${minWidth}px`);
      }

      if (info.height < minHeight) {
        errors.push(`Image height ${info.height}px is less than minimum ${minHeight}px`);
      }

      if (maxWidth && info.width > maxWidth) {
        errors.push(`Image width ${info.width}px exceeds maximum ${maxWidth}px`);
      }

      if (maxHeight && info.height > maxHeight) {
        errors.push(`Image height ${info.height}px exceeds maximum ${maxHeight}px`);
      }

      // Format validation
      if (!allowedFormats.includes(info.format.toLowerCase())) {
        errors.push(`Image format ${info.format} is not allowed. Allowed formats: ${allowedFormats.join(', ')}`);
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    } catch (error) {
      errors.push('Invalid image file');
      return {
        isValid: false,
        errors,
      };
    }
  }

  static async processUploadedImages(
    files: Express.Multer.File[],
    options: {
      generateThumbnails?: boolean;
      uploadToCloud?: boolean;
      processOptions?: ImageProcessingOptions;
      thumbnailOptions?: ThumbnailOptions;
    } = {}
  ): Promise<FileUpload[]> {
    const {
      generateThumbnails = true,
      uploadToCloud = true,
      processOptions = {},
      thumbnailOptions = {},
    } = options;

    const results: FileUpload[] = [];

    for (const file of files) {
      try {
        // Validate image
        const validation = await this.validateImage(file.buffer);
        if (!validation.isValid) {
          logger.warn('Image validation failed', {
            filename: file.originalname,
            errors: validation.errors,
          });
          continue;
        }

        // Process image
        const processedBuffer = await this.processImage(file.buffer, processOptions);
        
        let thumbnailBuffer: Buffer | undefined;
        if (generateThumbnails) {
          thumbnailBuffer = await this.generateThumbnail(processedBuffer, thumbnailOptions);
        }

        // Upload to cloud storage
        let uploadResult: ImageUploadResult | undefined;
        if (uploadToCloud && this.isCloudinaryConfigured()) {
          uploadResult = await this.uploadToCloudinary(processedBuffer, {
            folder: 'agri-farm/uploads',
            tags: ['user-upload'],
          });
        }

        const fileUpload: FileUpload = {
          originalName: file.originalname,
          filename: uploadResult?.publicId || file.filename || `${Date.now()}-${file.originalname}`,
          mimetype: file.mimetype,
          size: processedBuffer.length,
          url: uploadResult?.url || '',
          ...(uploadResult && {
            publicId: uploadResult.publicId,
            thumbnailUrl: uploadResult.thumbnailUrl,
          }),
        };

        results.push(fileUpload);

        logger.info('Image processed successfully', {
          originalName: file.originalname,
          processedSize: processedBuffer.length,
          hasUpload: !!uploadResult,
          hasThumbnail: !!thumbnailBuffer,
        });
      } catch (error) {
        logger.error('Image processing failed', error instanceof Error ? error : new Error(String(error)), {
          filename: file.originalname,
        });
      }
    }

    return results;
  }
}

export default ImageService;