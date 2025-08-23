import { ValidatorOptions } from './validators.types';
export declare class Validators {
    static email(email: string): boolean;
    static phone(phoneNumber: string, countryCode?: string): boolean;
    static password(password: string, options?: ValidatorOptions['password']): {
        isValid: boolean;
        errors: string[];
    };
    static url(url: string): boolean;
    static mongoId(id: string): boolean;
    static uuid(id: string): boolean;
    static ipAddress(ip: string): boolean;
    static creditCard(cardNumber: string): boolean;
    static dateRange(startDate: Date, endDate: Date, maxRange?: number): boolean;
    static fileSize(sizeInBytes: number, maxSizeInMB: number): boolean;
    static fileExtension(filename: string, allowedExtensions: string[]): boolean;
    static mimeType(mimeType: string, allowedTypes: string[]): boolean;
    static coordinates(latitude: number, longitude: number): boolean;
    static postalCode(postalCode: string, countryCode?: string): boolean;
    static age(birthDate: Date, minAge?: number, maxAge?: number): boolean;
    static strongPassword(password: string): {
        score: number;
        feedback: string[];
    };
    static sanitizeString(input: string, options?: {
        maxLength?: number;
        allowedChars?: string;
        removeHtml?: boolean;
        trim?: boolean;
    }): string;
    static isValidJSON(str: string): boolean;
    static isValidBase64(str: string): boolean;
    static businessRules: {
        cropName(name: string): boolean;
        pesticidesAmount(amount: number, unit: string): boolean;
        farmSize(sizeInHectares: number): boolean;
        plantingDate(date: Date): boolean;
        harvestDate(plantingDate: Date, harvestDate: Date, cropType: string): boolean;
        weatherCondition(temperature: number, humidity: number): boolean;
        marketPrice(price: number, currency: string): boolean;
    };
}
export default Validators;
//# sourceMappingURL=validators.d.ts.map