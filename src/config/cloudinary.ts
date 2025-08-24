import { v2 as cloudinary } from 'cloudinary';
import logger from '@/utils/logger';

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  secure: boolean;
}

export interface UploadOptions {
  folder?: string;
  transformation?: Record<string, unknown>;
  format?: string;
  quality?: string | number;
  tags?: string[];
  context?: Record<string, string>;
  overwrite?: boolean;
  unique_filename?: boolean;
  use_filename?: boolean;
}

export interface CloudinaryUploadResult {
  public_id: string;
  version: number;
  signature: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  url: string;
  secure_url: string;
  bytes: number;
  type: string;
  etag: string;
  placeholder: boolean;
  access_mode: string;
  created_at: string;
  tags?: string[];
  folder?: string;
}

const config: CloudinaryConfig = {
  cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  apiKey: process.env.CLOUDINARY_API_KEY || '',
  apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  secure: process.env.NODE_ENV === 'production',
};

export const initializeCloudinary = (): void => {
  if (!config.cloudName || !config.apiKey || !config.apiSecret) {
    logger.warn('Cloudinary configuration missing. File upload functionality will be limited.');
    return;
  }

  try {
    cloudinary.config({
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret,
      secure: config.secure,
    });

    logger.info('Cloudinary initialized successfully', {
      cloudName: config.cloudName,
      secure: config.secure,
    });
  } catch (error) {
    logger.error('Failed to initialize Cloudinary', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
};

export const uploadImage = async (
  file: Express.Multer.File,
  options: UploadOptions = {}
): Promise<CloudinaryUploadResult> => {
  try {
    const defaultOptions: UploadOptions = {
      folder: 'agri_farm',
      transformation: {
        quality: 'auto:good',
        fetch_format: 'auto',
      },
      overwrite: false,
      unique_filename: true,
      use_filename: false,
      tags: ['agri_farm', 'user_upload'],
    };

    const uploadOptions = { ...defaultOptions, ...options };

    const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          ...uploadOptions,
          resource_type: 'image',
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve(result);
          } else {
            reject(new Error('Upload failed - no result returned'));
          }
        }
      );

      uploadStream.end(file.buffer);
    });

    logger.info('Image uploaded successfully to Cloudinary', {
      publicId: result.public_id,
      url: result.secure_url,
      size: result.bytes,
      format: result.format,
      dimensions: `${result.width}x${result.height}`,
    });

    return result;
  } catch (error) {
    logger.error('Failed to upload image to Cloudinary', {
      error: error instanceof Error ? error.message : 'Unknown error',
      filename: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    });
    throw error;
  }
};

export const uploadMultipleImages = async (
  files: Express.Multer.File[],
  options: UploadOptions = {}
): Promise<CloudinaryUploadResult[]> => {
  try {
    const uploadPromises = files.map(file => uploadImage(file, options));
    const results = await Promise.all(uploadPromises);
    
    logger.info('Multiple images uploaded successfully', {
      count: results.length,
      totalSize: files.reduce((sum, file) => sum + file.size, 0),
    });

    return results;
  } catch (error) {
    logger.error('Failed to upload multiple images', {
      error: error instanceof Error ? error.message : 'Unknown error',
      fileCount: files.length,
    });
    throw error;
  }
};

export const deleteImage = async (publicId: string): Promise<void> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    
    if (result.result !== 'ok') {
      throw new Error(`Failed to delete image: ${result.result}`);
    }

    logger.info('Image deleted successfully from Cloudinary', {
      publicId,
    });
  } catch (error) {
    logger.error('Failed to delete image from Cloudinary', {
      error: error instanceof Error ? error.message : 'Unknown error',
      publicId,
    });
    throw error;
  }
};

export const generateThumbnail = (
  publicId: string,
  options: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string | number;
    format?: string;
  } = {}
): string => {
  const defaultOptions = {
    width: 300,
    height: 300,
    crop: 'fill',
    quality: 'auto:good',
    format: 'auto',
  };

  const transformOptions = { ...defaultOptions, ...options };

  return cloudinary.url(publicId, {
    transformation: transformOptions,
    secure: config.secure,
  });
};

export const generateResponsiveImages = (publicId: string): {
  thumbnail: string;
  small: string;
  medium: string;
  large: string;
  original: string;
} => {
  const baseTransformation = {
    quality: 'auto:good',
    fetch_format: 'auto',
  };

  return {
    thumbnail: cloudinary.url(publicId, {
      transformation: {
        ...baseTransformation,
        width: 150,
        height: 150,
        crop: 'fill',
      },
      secure: config.secure,
    }),
    small: cloudinary.url(publicId, {
      transformation: {
        ...baseTransformation,
        width: 300,
        height: 300,
        crop: 'fit',
      },
      secure: config.secure,
    }),
    medium: cloudinary.url(publicId, {
      transformation: {
        ...baseTransformation,
        width: 600,
        height: 600,
        crop: 'fit',
      },
      secure: config.secure,
    }),
    large: cloudinary.url(publicId, {
      transformation: {
        ...baseTransformation,
        width: 1200,
        height: 1200,
        crop: 'fit',
      },
      secure: config.secure,
    }),
    original: cloudinary.url(publicId, {
      transformation: baseTransformation,
      secure: config.secure,
    }),
  };
};

export const getImageInfo = async (publicId: string): Promise<{
  public_id: string;
  format: string;
  version: number;
  resource_type: string;
  type: string;
  created_at: string;
  bytes: number;
  width: number;
  height: number;
  url: string;
  secure_url: string;
}> => {
  try {
    const result = await cloudinary.api.resource(publicId);
    return result;
  } catch (error) {
    logger.error('Failed to get image info from Cloudinary', {
      error: error instanceof Error ? error.message : 'Unknown error',
      publicId,
    });
    throw error;
  }
};

export const healthCheck = async (): Promise<{
  status: 'up' | 'down';
  responseTime: number;
  details: Record<string, unknown>;
}> => {
  const start = Date.now();

  try {
    // Test API connection by getting account usage
    const result = await cloudinary.api.usage();
    const responseTime = Date.now() - start;

    return {
      status: 'up',
      responseTime,
      details: {
        cloudName: config.cloudName,
        usage: {
          credits: result.credits,
          used_credits: result.used_credits,
          limit: result.limit,
        },
      },
    };
  } catch (error) {
    const responseTime = Date.now() - start;

    return {
      status: 'down',
      responseTime,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        cloudName: config.cloudName,
      },
    };
  }
};

export default {
  initializeCloudinary,
  uploadImage,
  uploadMultipleImages,
  deleteImage,
  generateThumbnail,
  generateResponsiveImages,
  getImageInfo,
  healthCheck,
};