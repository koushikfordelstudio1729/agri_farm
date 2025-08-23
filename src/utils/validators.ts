import { parsePhoneNumber } from 'libphonenumber-js';
import { ValidatorOptions } from './validators.types';

export class Validators {
  static email(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.toLowerCase());
  }

  static phone(phoneNumber: string, countryCode?: string): boolean {
    try {
      const parsed = parsePhoneNumber(phoneNumber, countryCode as any);
      return parsed.isValid();
    } catch {
      return false;
    }
  }

  static password(password: string, options: ValidatorOptions['password'] = {}): {
    isValid: boolean;
    errors: string[];
  } {
    const {
      minLength = 8,
      maxLength = 128,
      requireUppercase = true,
      requireLowercase = true,
      requireNumbers = true,
      requireSpecialChars = true,
    } = options;

    const errors: string[] = [];

    if (password.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters long`);
    }

    if (password.length > maxLength) {
      errors.push(`Password must not exceed ${maxLength} characters`);
    }

    if (requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static url(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  static mongoId(id: string): boolean {
    return /^[0-9a-fA-F]{24}$/.test(id);
  }

  static uuid(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

  static ipAddress(ip: string): boolean {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  static creditCard(cardNumber: string): boolean {
    // Luhn algorithm
    const digits = cardNumber.replace(/\D/g, '');
    
    if (digits.length < 13 || digits.length > 19) {
      return false;
    }

    let sum = 0;
    let isEven = false;

    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i] || '0', 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  static dateRange(startDate: Date, endDate: Date, maxRange?: number): boolean {
    if (endDate <= startDate) {
      return false;
    }

    if (maxRange) {
      const diffInMs = endDate.getTime() - startDate.getTime();
      const maxRangeInMs = maxRange * 24 * 60 * 60 * 1000; // Convert days to milliseconds
      return diffInMs <= maxRangeInMs;
    }

    return true;
  }

  static fileSize(sizeInBytes: number, maxSizeInMB: number): boolean {
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    return sizeInBytes <= maxSizeInBytes;
  }

  static fileExtension(filename: string, allowedExtensions: string[]): boolean {
    const extension = filename.toLowerCase().split('.').pop();
    return allowedExtensions.some(ext => ext.toLowerCase() === extension);
  }

  static mimeType(mimeType: string, allowedTypes: string[]): boolean {
    return allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        return mimeType.startsWith(type.replace('/*', '/'));
      }
      return type === mimeType;
    });
  }

  static coordinates(latitude: number, longitude: number): boolean {
    return (
      latitude >= -90 && 
      latitude <= 90 && 
      longitude >= -180 && 
      longitude <= 180
    );
  }

  static postalCode(postalCode: string, countryCode?: string): boolean {
    const patterns: Record<string, RegExp> = {
      US: /^\d{5}(-\d{4})?$/,
      CA: /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/,
      UK: /^[A-Za-z]{1,2}\d[A-Za-z\d]?\s?\d[A-Za-z]{2}$/,
      IN: /^\d{6}$/,
      DE: /^\d{5}$/,
      FR: /^\d{5}$/,
      AU: /^\d{4}$/,
      JP: /^\d{3}-\d{4}$/,
    };

    if (!countryCode) {
      return /^\d{4,6}$/.test(postalCode.replace(/\s|-/g, ''));
    }

    const pattern = patterns[countryCode.toUpperCase()];
    return pattern ? pattern.test(postalCode) : false;
  }

  static age(birthDate: Date, minAge?: number, maxAge?: number): boolean {
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      // age--;
    }

    if (minAge && age < minAge) {
      return false;
    }

    if (maxAge && age > maxAge) {
      return false;
    }

    return true;
  }

  static strongPassword(password: string): {
    score: number;
    feedback: string[];
  } {
    let score = 0;
    const feedback: string[] = [];

    // Length check
    if (password.length >= 8) score += 1;
    else feedback.push('Use at least 8 characters');

    if (password.length >= 12) score += 1;
    else if (password.length >= 8) feedback.push('Consider using 12+ characters for better security');

    // Character variety
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Add lowercase letters');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Add uppercase letters');

    if (/\d/.test(password)) score += 1;
    else feedback.push('Add numbers');

    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?]/.test(password)) score += 1;
    else feedback.push('Add special characters');

    // Common patterns
    if (/(.)\1{2,}/.test(password)) {
      score -= 1;
      feedback.push('Avoid repeating characters');
    }

    if (/123|abc|qwe/i.test(password)) {
      score -= 1;
      feedback.push('Avoid sequential characters');
    }

    // Dictionary check (simplified)
    const commonPasswords = [
      'password', '123456', 'password123', 'admin', 'qwerty',
      'letmein', 'welcome', 'monkey', '1234567890'
    ];

    if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
      score -= 2;
      feedback.push('Avoid common passwords');
    }

    return {
      score: Math.max(0, score),
      feedback: feedback.length ? feedback : ['Strong password!'],
    };
  }

  static sanitizeString(input: string, options: {
    maxLength?: number;
    allowedChars?: string;
    removeHtml?: boolean;
    trim?: boolean;
  } = {}): string {
    const {
      maxLength,
      allowedChars,
      removeHtml = false,
      trim = true,
    } = options;

    let result = input;

    if (trim) {
      result = result.trim();
    }

    if (removeHtml) {
      result = result.replace(/<[^>]*>/g, '');
    }

    if (allowedChars) {
      const regex = new RegExp(`[^${allowedChars.replace(/[[\]\\-]/g, '\\$&')}]`, 'g');
      result = result.replace(regex, '');
    }

    if (maxLength && result.length > maxLength) {
      result = result.substring(0, maxLength);
    }

    return result;
  }

  static isValidJSON(str: string): boolean {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }

  static isValidBase64(str: string): boolean {
    try {
      return btoa(atob(str)) === str;
    } catch {
      return false;
    }
  }

  static businessRules = {
    // Agricultural-specific validators
    cropName(name: string): boolean {
      return /^[a-zA-Z\s\-]{2,50}$/.test(name.trim());
    },

    pesticidesAmount(amount: number, unit: string): boolean {
      if (amount <= 0) return false;
      
      const maxLimits: Record<string, number> = {
        'ml/l': 50,
        'g/l': 100,
        'kg/ha': 5,
        'l/ha': 10,
      };

      return amount <= (maxLimits[unit] || Number.MAX_VALUE);
    },

    farmSize(sizeInHectares: number): boolean {
      return sizeInHectares > 0 && sizeInHectares <= 100000; // Max 100,000 hectares
    },

    plantingDate(date: Date): boolean {
      const now = new Date();
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
      
      return date >= oneYearAgo && date <= oneYearFromNow;
    },

    harvestDate(plantingDate: Date, harvestDate: Date, cropType: string): boolean {
      const growthPeriods: Record<string, { min: number; max: number }> = {
        rice: { min: 90, max: 180 },
        wheat: { min: 90, max: 150 },
        corn: { min: 60, max: 120 },
        tomato: { min: 60, max: 90 },
        potato: { min: 70, max: 120 },
        cotton: { min: 150, max: 200 },
      };

      const period = growthPeriods[cropType.toLowerCase()];
      if (!period) return true; // Unknown crop type, allow any reasonable date

      const diffInDays = Math.floor(
        (harvestDate.getTime() - plantingDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      return diffInDays >= period.min && diffInDays <= period.max;
    },

    weatherCondition(temperature: number, humidity: number): boolean {
      return (
        temperature >= -50 && temperature <= 60 && // Celsius
        humidity >= 0 && humidity <= 100
      );
    },

    marketPrice(price: number, currency: string): boolean {
      if (price < 0) return false;
      
      const maxPrices: Record<string, number> = {
        USD: 10000,
        EUR: 10000,
        INR: 500000,
        BRL: 50000,
      };

      return price <= (maxPrices[currency] || Number.MAX_VALUE);
    },
  };
}

export default Validators;