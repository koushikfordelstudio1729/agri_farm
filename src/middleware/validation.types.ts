import { Request, Response, NextFunction } from 'express';

export interface ValidationOptions {
  source?: 'body' | 'query' | 'params' | 'headers';
  allowUnknown?: boolean;
  stripUnknown?: boolean;
  abortEarly?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors?: Record<string, string[]>;
  data?: any;
}

export type ValidatorSchema = (data: any, req: Request) => Promise<ValidationResult> | ValidationResult;

export interface FileValidationOptions {
  maxSize?: number;
  allowedTypes?: string[];
  allowedExtensions?: string[];
  maxFiles?: number;
  required?: boolean;
}

export interface ImageValidationOptions extends FileValidationOptions {
  maxWidth?: number;
  maxHeight?: number;
  minWidth?: number;
  minHeight?: number;
  aspectRatio?: number;
  quality?: number;
}

export interface DocumentValidationOptions extends FileValidationOptions {
  maxPages?: number;
  allowedFormats?: ('pdf' | 'doc' | 'docx' | 'txt' | 'rtf')[];
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
  value?: any;
  code?: string;
}

export interface CustomValidator {
  field: string;
  validator: (value: any, data: any, req: Request) => Promise<boolean> | boolean;
  message: string;
}

export interface ConditionalValidation {
  condition: (data: any, req: Request) => boolean;
  schema: any;
  message?: string;
}

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date' | 'email' | 'url';
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: any[];
  custom?: CustomValidator[];
  conditional?: ConditionalValidation;
  transform?: (value: any) => any;
}

export interface ValidationSchema {
  rules: ValidationRule[];
  options?: ValidationOptions;
}

export interface SanitizationOptions {
  trim?: boolean;
  lowercase?: boolean;
  uppercase?: boolean;
  removeSpecialChars?: boolean;
  allowedChars?: string;
  maxLength?: number;
  htmlEncode?: boolean;
  stripTags?: boolean;
}

export interface RequestValidationConfig {
  body?: ValidationSchema;
  query?: ValidationSchema;
  params?: ValidationSchema;
  headers?: ValidationSchema;
  files?: FileValidationOptions;
}

export type ValidationMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => void | Promise<void>;