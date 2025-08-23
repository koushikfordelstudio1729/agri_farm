import multer from 'multer';
import { Request } from 'express';
import { UploadOptions } from './upload.types';
export declare class UploadMiddleware {
    private static getStorage;
    private static getFileFilter;
    static create(options?: UploadOptions): multer.Multer;
    static image(options?: Partial<UploadOptions>): multer.Multer;
    static document(options?: Partial<UploadOptions>): multer.Multer;
    static video(options?: Partial<UploadOptions>): multer.Multer;
    static audio(options?: Partial<UploadOptions>): multer.Multer;
    static any(options?: Partial<UploadOptions>): multer.Multer;
    static errorHandler(): (err: any, req: Request, res: any, next: any) => any;
    static validateFiles(options?: {
        required?: boolean;
        minFiles?: number;
        maxFiles?: number;
        fieldName?: string;
    }): (req: Request, res: any, next: any) => any;
    static extractMetadata(): (req: Request, res: any, next: any) => void;
}
export default UploadMiddleware;
//# sourceMappingURL=upload.d.ts.map