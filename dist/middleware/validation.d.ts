import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { z } from 'zod';
import { ValidatorSchema, ValidationOptions } from './validation.types';
export declare class ValidationMiddleware {
    static joi(schema: Joi.Schema, options?: ValidationOptions): (req: Request, res: Response, next: NextFunction) => void;
    static zod<T>(schema: z.ZodSchema<T>, options?: ValidationOptions): (req: Request, res: Response, next: NextFunction) => void;
    static custom(validator: ValidatorSchema, options?: ValidationOptions): (req: Request, res: Response, next: NextFunction) => Promise<void>;
    private static getDataFromRequest;
    private static setDataToRequest;
    private static sanitizeData;
}
export declare const commonSchemas: {
    pagination: Joi.ObjectSchema<any>;
    id: Joi.ObjectSchema<any>;
    email: Joi.StringSchema<string>;
    password: Joi.StringSchema<string>;
    phone: Joi.StringSchema<string>;
    location: Joi.ObjectSchema<any>;
    dateRange: Joi.ObjectSchema<any>;
    language: Joi.StringSchema<string>;
};
export declare const zodSchemas: {
    pagination: z.ZodObject<{
        page: z.ZodDefault<z.ZodNumber>;
        limit: z.ZodDefault<z.ZodNumber>;
        sortBy: z.ZodOptional<z.ZodString>;
        sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        page: number;
        sortOrder: "asc" | "desc";
        sortBy?: string | undefined;
    }, {
        limit?: number | undefined;
        page?: number | undefined;
        sortBy?: string | undefined;
        sortOrder?: "asc" | "desc" | undefined;
    }>;
    id: z.ZodObject<{
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
    }, {
        id: string;
    }>;
    email: z.ZodString;
    password: z.ZodString;
    phone: z.ZodString;
    location: z.ZodObject<{
        latitude: z.ZodNumber;
        longitude: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        latitude: number;
        longitude: number;
    }, {
        latitude: number;
        longitude: number;
    }>;
    dateRange: z.ZodEffects<z.ZodObject<{
        from: z.ZodDate;
        to: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        from: Date;
        to: Date;
    }, {
        from: Date;
        to: Date;
    }>, {
        from: Date;
        to: Date;
    }, {
        from: Date;
        to: Date;
    }>;
    language: z.ZodEnum<["en", "es", "fr", "pt", "hi", "bn", "id", "vi"]>;
};
export declare const validatePagination: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateId: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateLocation: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateDateRange: (req: Request, res: Response, next: NextFunction) => void;
export declare const validatePaginationZod: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateIdZod: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateLocationZod: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateDateRangeZod: (req: Request, res: Response, next: NextFunction) => void;
export default ValidationMiddleware;
//# sourceMappingURL=validation.d.ts.map