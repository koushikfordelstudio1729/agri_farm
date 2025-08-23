export interface ImageProcessingOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'jpg' | 'png' | 'webp' | 'gif';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  crop?: 'center' | 'top' | 'right' | 'bottom' | 'left' | 'left top' | 'right top' | 'left bottom' | 'right bottom';
  sharpen?: boolean;
  normalize?: boolean;
  withoutEnlargement?: boolean;
  background?: string;
}

export interface ThumbnailOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'jpg' | 'png' | 'webp';
  fit?: 'cover' | 'contain' | 'fill';
}

export interface WatermarkOptions {
  type: 'text' | 'image';
  content: string; // Text content or base64 image
  position?: 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  opacity?: number;
  fontSize?: number;
  fontColor?: string;
  fontFamily?: string;
}

export interface ImageUploadResult {
  success: boolean;
  url: string;
  publicId?: string;
  width?: number;
  height?: number;
  format?: string;
  size?: number;
  thumbnailUrl?: string;
  error?: string;
}

export interface ImageValidationOptions {
  maxWidth?: number;
  maxHeight?: number;
  minWidth?: number;
  minHeight?: number;
  maxSize?: number; // in bytes
  allowedFormats?: string[];
  aspectRatio?: number;
  allowAnimated?: boolean;
}

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  hasAlpha: boolean;
  colorSpace: string;
  density?: number;
  orientation?: number;
  pages?: number;
}

export interface ImageFilterOptions {
  blur?: number;
  sharpen?: boolean;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  hue?: number;
  gamma?: number;
  negate?: boolean;
  grayscale?: boolean;
  sepia?: boolean;
}

export interface ImageTransformation {
  resize?: {
    width?: number;
    height?: number;
    fit?: string;
  };
  crop?: {
    width: number;
    height: number;
    x: number;
    y: number;
  };
  rotate?: number;
  flip?: 'horizontal' | 'vertical' | 'both';
  filters?: ImageFilterOptions;
  watermark?: WatermarkOptions;
  format?: string;
  quality?: number;
}

export interface CloudinaryUploadOptions {
  folder?: string;
  publicId?: string;
  overwrite?: boolean;
  tags?: string[];
  context?: Record<string, string>;
  transformation?: CloudinaryTransformation[];
  uploadPreset?: string;
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
  format?: string;
  quality?: string | number;
}

export interface CloudinaryTransformation {
  width?: number;
  height?: number;
  crop?: string;
  gravity?: string;
  quality?: string | number;
  format?: string;
  effect?: string;
  overlay?: string;
  underlay?: string;
  border?: string;
  radius?: string | number;
  angle?: number;
  opacity?: number;
  color?: string;
  dpr?: string | number;
  flags?: string;
}

export interface S3UploadOptions {
  bucket: string;
  key?: string;
  acl?: 'private' | 'public-read' | 'public-read-write';
  contentType?: string;
  metadata?: Record<string, string>;
  tags?: Record<string, string>;
  storageClass?: 'STANDARD' | 'REDUCED_REDUNDANCY' | 'STANDARD_IA' | 'ONEZONE_IA' | 'GLACIER';
  serverSideEncryption?: 'AES256' | 'aws:kms';
  expires?: Date;
  cacheControl?: string;
}

export interface ImageServiceConfig {
  provider: 'local' | 'cloudinary' | 's3' | 'gcs';
  maxFileSize: number;
  allowedFormats: string[];
  thumbnailSizes: Array<{
    name: string;
    width: number;
    height: number;
  }>;
  watermarkOptions?: WatermarkOptions;
  defaultQuality: number;
  enableWebP: boolean;
  enableProgressive: boolean;
}

export interface BatchImageProcessingOptions {
  concurrency?: number;
  failFast?: boolean;
  retries?: number;
  generateThumbnails?: boolean;
  uploadToCloud?: boolean;
  processOptions?: ImageProcessingOptions;
  thumbnailOptions?: ThumbnailOptions;
  validationOptions?: ImageValidationOptions;
}

export interface ImageProcessingResult {
  originalFile: {
    name: string;
    size: number;
  };
  processedFile?: {
    buffer: Buffer;
    size: number;
    format: string;
  };
  thumbnail?: {
    buffer: Buffer;
    size: number;
  };
  uploadResult?: ImageUploadResult;
  errors?: string[];
  processingTime: number;
}

export type ImageFormat = 'jpeg' | 'jpg' | 'png' | 'webp' | 'gif' | 'svg' | 'bmp' | 'tiff';
export type ImageFit = 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
export type ImagePosition = 'center' | 'top' | 'right' | 'bottom' | 'left' | 'left top' | 'right top' | 'left bottom' | 'right bottom';