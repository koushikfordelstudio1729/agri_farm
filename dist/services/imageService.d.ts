import { FileUpload } from '@/types/common.types';
import { ImageProcessingOptions, ImageUploadResult, ThumbnailOptions, WatermarkOptions } from './imageService.types';
export declare class ImageService {
    private static isCloudinaryConfigured;
    static processImage(buffer: Buffer, options?: ImageProcessingOptions): Promise<Buffer>;
    static generateThumbnail(buffer: Buffer, options?: ThumbnailOptions): Promise<Buffer>;
    static addWatermark(buffer: Buffer, watermarkOptions: WatermarkOptions): Promise<Buffer>;
    private static getSharpGravity;
    static uploadToCloudinary(buffer: Buffer, options?: {
        folder?: string;
        publicId?: string;
        transformation?: any[];
        tags?: string[];
    }): Promise<ImageUploadResult>;
    private static generateCloudinaryThumbnailUrl;
    static deleteFromCloudinary(publicId: string): Promise<boolean>;
    static getImageInfo(buffer: Buffer): Promise<{
        width: number;
        height: number;
        format: string;
        size: number;
        hasAlpha: boolean;
        colorSpace: string;
    }>;
    static validateImage(buffer: Buffer, options?: {
        maxWidth?: number;
        maxHeight?: number;
        minWidth?: number;
        minHeight?: number;
        maxSize?: number;
        allowedFormats?: string[];
    }): Promise<{
        isValid: boolean;
        errors: string[];
    }>;
    static processUploadedImages(files: Express.Multer.File[], options?: {
        generateThumbnails?: boolean;
        uploadToCloud?: boolean;
        processOptions?: ImageProcessingOptions;
        thumbnailOptions?: ThumbnailOptions;
    }): Promise<FileUpload[]>;
}
export default ImageService;
//# sourceMappingURL=imageService.d.ts.map