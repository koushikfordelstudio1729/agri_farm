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
export declare const initializeCloudinary: () => void;
export declare const uploadImage: (file: Express.Multer.File, options?: UploadOptions) => Promise<CloudinaryUploadResult>;
export declare const uploadMultipleImages: (files: Express.Multer.File[], options?: UploadOptions) => Promise<CloudinaryUploadResult[]>;
export declare const deleteImage: (publicId: string) => Promise<void>;
export declare const generateThumbnail: (publicId: string, options?: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string | number;
    format?: string;
}) => string;
export declare const generateResponsiveImages: (publicId: string) => {
    thumbnail: string;
    small: string;
    medium: string;
    large: string;
    original: string;
};
export declare const getImageInfo: (publicId: string) => Promise<{
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
}>;
export declare const healthCheck: () => Promise<{
    status: "up" | "down";
    responseTime: number;
    details: Record<string, unknown>;
}>;
declare const _default: {
    initializeCloudinary: () => void;
    uploadImage: (file: Express.Multer.File, options?: UploadOptions) => Promise<CloudinaryUploadResult>;
    uploadMultipleImages: (files: Express.Multer.File[], options?: UploadOptions) => Promise<CloudinaryUploadResult[]>;
    deleteImage: (publicId: string) => Promise<void>;
    generateThumbnail: (publicId: string, options?: {
        width?: number;
        height?: number;
        crop?: string;
        quality?: string | number;
        format?: string;
    }) => string;
    generateResponsiveImages: (publicId: string) => {
        thumbnail: string;
        small: string;
        medium: string;
        large: string;
        original: string;
    };
    getImageInfo: (publicId: string) => Promise<{
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
    }>;
    healthCheck: () => Promise<{
        status: "up" | "down";
        responseTime: number;
        details: Record<string, unknown>;
    }>;
};
export default _default;
//# sourceMappingURL=cloudinary.d.ts.map