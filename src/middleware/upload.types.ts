import { Request } from 'express';
import multer from 'multer';

export type StorageType = 'memory' | 'disk';

export interface UploadOptions {
  storage?: StorageType;
  destination?: string;
  maxFileSize?: number;
  maxFiles?: number;
  maxFieldSize?: number;
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
  preservePath?: boolean;
  fileNaming?: 'original' | 'timestamp' | 'uuid' | 'custom';
  customNaming?: (req: Request, file: Express.Multer.File) => string;
}

export type FileFilterFunction = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => void;

export interface FileMetadata {
  originalName: string;
  filename: string;
  mimetype: string;
  size: number;
  fieldname: string;
  encoding: string;
  uploadedAt: Date;
  url?: string;
  thumbnailUrl?: string;
  publicId?: string;
}

export interface ImageUploadOptions extends UploadOptions {
  resize?: {
    width?: number;
    height?: number;
    fit?: 'contain' | 'cover' | 'fill' | 'inside' | 'outside';
    quality?: number;
  };
  generateThumbnail?: {
    width: number;
    height: number;
    quality?: number;
  };
  watermark?: {
    text?: string;
    image?: string;
    position?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    opacity?: number;
  };
}

export interface DocumentUploadOptions extends UploadOptions {
  extractText?: boolean;
  convertToPdf?: boolean;
  maxPages?: number;
  allowedFormats?: string[];
}

export interface VideoUploadOptions extends UploadOptions {
  generateThumbnail?: boolean;
  maxDuration?: number; // in seconds
  allowedCodecs?: string[];
  compress?: {
    quality?: number;
    bitrate?: string;
    resolution?: string;
  };
}

export interface AudioUploadOptions extends UploadOptions {
  maxDuration?: number; // in seconds
  allowedCodecs?: string[];
  normalizeAudio?: boolean;
  extractMetadata?: boolean;
}

export interface UploadResult {
  success: boolean;
  files: FileMetadata[];
  errors?: string[];
  processingTime?: number;
}

export interface MulterRequest extends Request {
  fileMetadata?: FileMetadata[];
}

export interface CloudinaryUploadOptions {
  folder?: string;
  publicId?: string;
  overwrite?: boolean;
  format?: string;
  quality?: string | number;
  transformation?: any[];
  tags?: string[];
  context?: Record<string, string>;
}

export interface S3UploadOptions {
  bucket: string;
  key?: string;
  acl?: 'private' | 'public-read' | 'public-read-write';
  contentType?: string;
  metadata?: Record<string, string>;
  tags?: Record<string, string>;
  storageClass?: 'STANDARD' | 'REDUCED_REDUNDANCY' | 'STANDARD_IA' | 'ONEZONE_IA' | 'GLACIER';
}

export type UploadProvider = 'local' | 'cloudinary' | 's3' | 'gcs';

export interface UploadConfig {
  provider: UploadProvider;
  local?: {
    uploadDir: string;
    baseUrl: string;
  };
  cloudinary?: {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
  };
  s3?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    bucket: string;
  };
  gcs?: {
    projectId: string;
    keyFilename?: string;
    credentials?: object;
    bucket: string;
  };
}