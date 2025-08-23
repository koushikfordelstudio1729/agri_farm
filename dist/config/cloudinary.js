"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthCheck = exports.getImageInfo = exports.generateResponsiveImages = exports.generateThumbnail = exports.deleteImage = exports.uploadMultipleImages = exports.uploadImage = exports.initializeCloudinary = void 0;
const cloudinary_1 = require("cloudinary");
const logger_1 = require("@/utils/logger");
const config = {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    secure: process.env.NODE_ENV === 'production',
};
const initializeCloudinary = () => {
    if (!config.cloudName || !config.apiKey || !config.apiSecret) {
        logger_1.logger.warn('Cloudinary configuration missing. File upload functionality will be limited.');
        return;
    }
    try {
        cloudinary_1.v2.config({
            cloud_name: config.cloudName,
            api_key: config.apiKey,
            api_secret: config.apiSecret,
            secure: config.secure,
        });
        logger_1.logger.info('Cloudinary initialized successfully', {
            cloudName: config.cloudName,
            secure: config.secure,
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to initialize Cloudinary', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
    }
};
exports.initializeCloudinary = initializeCloudinary;
const uploadImage = async (file, options = {}) => {
    try {
        const defaultOptions = {
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
        const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary_1.v2.uploader.upload_stream({
                ...uploadOptions,
                resource_type: 'image',
            }, (error, result) => {
                if (error) {
                    reject(error);
                }
                else if (result) {
                    resolve(result);
                }
                else {
                    reject(new Error('Upload failed - no result returned'));
                }
            });
            uploadStream.end(file.buffer);
        });
        logger_1.logger.info('Image uploaded successfully to Cloudinary', {
            publicId: result.public_id,
            url: result.secure_url,
            size: result.bytes,
            format: result.format,
            dimensions: `${result.width}x${result.height}`,
        });
        return result;
    }
    catch (error) {
        logger_1.logger.error('Failed to upload image to Cloudinary', {
            error: error instanceof Error ? error.message : 'Unknown error',
            filename: file.originalname,
            size: file.size,
            mimetype: file.mimetype,
        });
        throw error;
    }
};
exports.uploadImage = uploadImage;
const uploadMultipleImages = async (files, options = {}) => {
    try {
        const uploadPromises = files.map(file => (0, exports.uploadImage)(file, options));
        const results = await Promise.all(uploadPromises);
        logger_1.logger.info('Multiple images uploaded successfully', {
            count: results.length,
            totalSize: files.reduce((sum, file) => sum + file.size, 0),
        });
        return results;
    }
    catch (error) {
        logger_1.logger.error('Failed to upload multiple images', {
            error: error instanceof Error ? error.message : 'Unknown error',
            fileCount: files.length,
        });
        throw error;
    }
};
exports.uploadMultipleImages = uploadMultipleImages;
const deleteImage = async (publicId) => {
    try {
        const result = await cloudinary_1.v2.uploader.destroy(publicId);
        if (result.result !== 'ok') {
            throw new Error(`Failed to delete image: ${result.result}`);
        }
        logger_1.logger.info('Image deleted successfully from Cloudinary', {
            publicId,
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to delete image from Cloudinary', {
            error: error instanceof Error ? error.message : 'Unknown error',
            publicId,
        });
        throw error;
    }
};
exports.deleteImage = deleteImage;
const generateThumbnail = (publicId, options = {}) => {
    const defaultOptions = {
        width: 300,
        height: 300,
        crop: 'fill',
        quality: 'auto:good',
        format: 'auto',
    };
    const transformOptions = { ...defaultOptions, ...options };
    return cloudinary_1.v2.url(publicId, {
        transformation: transformOptions,
        secure: config.secure,
    });
};
exports.generateThumbnail = generateThumbnail;
const generateResponsiveImages = (publicId) => {
    const baseTransformation = {
        quality: 'auto:good',
        fetch_format: 'auto',
    };
    return {
        thumbnail: cloudinary_1.v2.url(publicId, {
            transformation: {
                ...baseTransformation,
                width: 150,
                height: 150,
                crop: 'fill',
            },
            secure: config.secure,
        }),
        small: cloudinary_1.v2.url(publicId, {
            transformation: {
                ...baseTransformation,
                width: 300,
                height: 300,
                crop: 'fit',
            },
            secure: config.secure,
        }),
        medium: cloudinary_1.v2.url(publicId, {
            transformation: {
                ...baseTransformation,
                width: 600,
                height: 600,
                crop: 'fit',
            },
            secure: config.secure,
        }),
        large: cloudinary_1.v2.url(publicId, {
            transformation: {
                ...baseTransformation,
                width: 1200,
                height: 1200,
                crop: 'fit',
            },
            secure: config.secure,
        }),
        original: cloudinary_1.v2.url(publicId, {
            transformation: baseTransformation,
            secure: config.secure,
        }),
    };
};
exports.generateResponsiveImages = generateResponsiveImages;
const getImageInfo = async (publicId) => {
    try {
        const result = await cloudinary_1.v2.api.resource(publicId);
        return result;
    }
    catch (error) {
        logger_1.logger.error('Failed to get image info from Cloudinary', {
            error: error instanceof Error ? error.message : 'Unknown error',
            publicId,
        });
        throw error;
    }
};
exports.getImageInfo = getImageInfo;
const healthCheck = async () => {
    const start = Date.now();
    try {
        // Test API connection by getting account usage
        const result = await cloudinary_1.v2.api.usage();
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
    }
    catch (error) {
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
exports.healthCheck = healthCheck;
exports.default = {
    initializeCloudinary: exports.initializeCloudinary,
    uploadImage: exports.uploadImage,
    uploadMultipleImages: exports.uploadMultipleImages,
    deleteImage: exports.deleteImage,
    generateThumbnail: exports.generateThumbnail,
    generateResponsiveImages: exports.generateResponsiveImages,
    getImageInfo: exports.getImageInfo,
    healthCheck: exports.healthCheck,
};
//# sourceMappingURL=cloudinary.js.map