"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadMiddleware = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const errors_1 = require("@/utils/errors");
const logger_1 = require("@/utils/logger");
class UploadMiddleware {
    static getStorage(options) {
        const { storage = 'memory', destination = 'uploads/' } = options;
        switch (storage) {
            case 'disk':
                return multer_1.default.diskStorage({
                    destination: (req, file, cb) => {
                        cb(null, destination);
                    },
                    filename: (req, file, cb) => {
                        const uniqueSuffix = Date.now() + '-' + crypto_1.default.randomUUID();
                        const ext = path_1.default.extname(file.originalname);
                        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
                    },
                });
            case 'memory':
            default:
                return multer_1.default.memoryStorage();
        }
    }
    static getFileFilter(options) {
        const { allowedMimeTypes = [], allowedExtensions = [], maxFileSize = 10 * 1024 * 1024, // 10MB
         } = options;
        return (req, file, cb) => {
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
                        logger_1.logger.warn('File upload rejected: Invalid mime type', {
                            filename: file.originalname,
                            mimetype: file.mimetype,
                            allowedMimeTypes,
                        });
                        return cb(new errors_1.FileUploadError(`File type ${file.mimetype} not allowed`));
                    }
                }
                // Check file extension
                if (allowedExtensions.length > 0) {
                    const ext = path_1.default.extname(file.originalname).toLowerCase();
                    if (!allowedExtensions.includes(ext)) {
                        logger_1.logger.warn('File upload rejected: Invalid extension', {
                            filename: file.originalname,
                            extension: ext,
                            allowedExtensions,
                        });
                        return cb(new errors_1.FileUploadError(`File extension ${ext} not allowed`));
                    }
                }
                // File size is handled by multer limits, but we can add additional checks here
                logger_1.logger.info('File upload accepted', {
                    filename: file.originalname,
                    mimetype: file.mimetype,
                    size: file.size || 'unknown',
                });
                cb(null, true);
            }
            catch (error) {
                logger_1.logger.error('File filter error', error instanceof Error ? error : new Error(String(error)));
                cb(new errors_1.FileUploadError('File validation failed'));
            }
        };
    }
    static create(options = {}) {
        const { maxFileSize = 10 * 1024 * 1024, // 10MB
        maxFiles = 5, maxFieldSize = 1024 * 1024, // 1MB
        preservePath = false, } = options;
        const storage = this.getStorage(options);
        const fileFilter = this.getFileFilter(options);
        return (0, multer_1.default)({
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
    static image(options = {}) {
        const imageOptions = {
            maxFileSize: 5 * 1024 * 1024, // 5MB
            maxFiles: 10,
            allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
            allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
            storage: 'memory',
            ...options,
        };
        return this.create(imageOptions);
    }
    static document(options = {}) {
        const documentOptions = {
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
    static video(options = {}) {
        const videoOptions = {
            maxFileSize: 100 * 1024 * 1024, // 100MB
            maxFiles: 3,
            allowedMimeTypes: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv'],
            allowedExtensions: ['.mp4', '.avi', '.mov', '.wmv'],
            storage: 'memory',
            ...options,
        };
        return this.create(videoOptions);
    }
    static audio(options = {}) {
        const audioOptions = {
            maxFileSize: 50 * 1024 * 1024, // 50MB
            maxFiles: 5,
            allowedMimeTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4'],
            allowedExtensions: ['.mp3', '.wav', '.ogg', '.m4a'],
            storage: 'memory',
            ...options,
        };
        return this.create(audioOptions);
    }
    static any(options = {}) {
        const anyOptions = {
            maxFileSize: 50 * 1024 * 1024, // 50MB
            maxFiles: 10,
            storage: 'memory',
            ...options,
        };
        return this.create(anyOptions);
    }
    // Error handling middleware
    static errorHandler() {
        return (err, req, res, next) => {
            if (err instanceof multer_1.default.MulterError) {
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
                logger_1.logger.warn('Multer error', {
                    code: err.code,
                    message: err.message,
                    field: err.field,
                });
                return next(new errors_1.FileUploadError(message));
            }
            next(err);
        };
    }
    // Validation middleware for uploaded files
    static validateFiles(options = {}) {
        return (req, res, next) => {
            const { required = false, minFiles = 0, maxFiles, fieldName } = options;
            const files = fieldName ? req.files?.[fieldName] : req.files;
            const fileArray = Array.isArray(files) ? files : files ? [files] : [];
            if (required && fileArray.length === 0) {
                return next(new errors_1.FileUploadError('At least one file is required'));
            }
            if (fileArray.length < minFiles) {
                return next(new errors_1.FileUploadError(`At least ${minFiles} files are required`));
            }
            if (maxFiles && fileArray.length > maxFiles) {
                return next(new errors_1.FileUploadError(`Maximum ${maxFiles} files allowed`));
            }
            logger_1.logger.info('File validation passed', {
                fileCount: fileArray.length,
                fieldName,
            });
            next();
        };
    }
    // File metadata extraction
    static extractMetadata() {
        return (req, res, next) => {
            if (req.files || req.file) {
                const files = req.files ?
                    (Array.isArray(req.files) ? req.files : Object.values(req.files).flat()) :
                    [req.file];
                req.fileMetadata = files.map((file) => ({
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
exports.UploadMiddleware = UploadMiddleware;
exports.default = UploadMiddleware;
//# sourceMappingURL=upload.js.map