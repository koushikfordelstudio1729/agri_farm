export interface ValidatorOptions {
  password?: {
    minLength?: number;
    maxLength?: number;
    requireUppercase?: boolean;
    requireLowercase?: boolean;
    requireNumbers?: boolean;
    requireSpecialChars?: boolean;
  };
  
  email?: {
    allowInternational?: boolean;
    blacklistDomains?: string[];
    whitelistDomains?: string[];
  };
  
  phone?: {
    countryCode?: string;
    allowInternational?: boolean;
    format?: 'e164' | 'national' | 'international';
  };
  
  file?: {
    maxSize?: number; // in MB
    allowedTypes?: string[];
    allowedExtensions?: string[];
    maxFiles?: number;
  };
  
  image?: {
    maxWidth?: number;
    maxHeight?: number;
    minWidth?: number;
    minHeight?: number;
    maxSize?: number; // in MB
    allowedFormats?: string[];
    quality?: number;
  };
  
  location?: {
    precision?: number; // decimal places
    bounds?: {
      north: number;
      south: number;
      east: number;
      west: number;
    };
  };
  
  date?: {
    minDate?: Date;
    maxDate?: Date;
    allowFuture?: boolean;
    allowPast?: boolean;
  };
  
  string?: {
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    allowEmpty?: boolean;
    trim?: boolean;
    transform?: 'lowercase' | 'uppercase' | 'capitalize';
  };
  
  number?: {
    min?: number;
    max?: number;
    integer?: boolean;
    positive?: boolean;
    precision?: number;
  };
  
  array?: {
    minItems?: number;
    maxItems?: number;
    uniqueItems?: boolean;
    itemValidator?: (item: any) => boolean;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors?: string[];
  warnings?: string[];
  sanitized?: any;
}

export interface ValidatorFunction<T = any> {
  (value: T, options?: any): boolean | ValidationResult;
}

export interface AsyncValidatorFunction<T = any> {
  (value: T, options?: any): Promise<boolean | ValidationResult>;
}

export interface CustomValidator {
  name: string;
  validator: ValidatorFunction | AsyncValidatorFunction;
  message: string;
  async?: boolean;
}

export interface BusinessRule {
  name: string;
  description: string;
  validator: ValidatorFunction;
  errorMessage: string;
  warningMessage?: string;
}

export interface AgricultureValidationRules {
  crop: {
    name: ValidatorFunction<string>;
    variety: ValidatorFunction<string>;
    plantingDate: ValidatorFunction<Date>;
    harvestDate: ValidatorFunction<Date>;
    area: ValidatorFunction<number>;
    yield: ValidatorFunction<number>;
  };
  
  disease: {
    severity: ValidatorFunction<number>;
    confidence: ValidatorFunction<number>;
    symptoms: ValidatorFunction<string[]>;
    affectedArea: ValidatorFunction<number>;
  };
  
  weather: {
    temperature: ValidatorFunction<number>;
    humidity: ValidatorFunction<number>;
    rainfall: ValidatorFunction<number>;
    windSpeed: ValidatorFunction<number>;
    uvIndex: ValidatorFunction<number>;
  };
  
  treatment: {
    dosage: ValidatorFunction<number>;
    frequency: ValidatorFunction<string>;
    duration: ValidatorFunction<number>;
    method: ValidatorFunction<string>;
  };
  
  market: {
    price: ValidatorFunction<number>;
    quantity: ValidatorFunction<number>;
    quality: ValidatorFunction<string>;
    location: ValidatorFunction<string>;
  };
  
  expert: {
    experience: ValidatorFunction<number>;
    specialization: ValidatorFunction<string[]>;
    rating: ValidatorFunction<number>;
    availability: ValidatorFunction<string>;
  };
}

export type ValidatorType = 
  | 'email'
  | 'phone'
  | 'password'
  | 'url'
  | 'ip'
  | 'uuid'
  | 'mongoId'
  | 'creditCard'
  | 'postalCode'
  | 'coordinates'
  | 'date'
  | 'dateRange'
  | 'file'
  | 'image'
  | 'json'
  | 'base64'
  | 'custom';

export interface ValidatorConfig {
  type: ValidatorType;
  options?: ValidatorOptions[keyof ValidatorOptions];
  required?: boolean;
  message?: string;
  transform?: (value: any) => any;
  condition?: (data: any) => boolean;
}