import type { Document, Model } from 'mongoose';
import type { UserProfile, UserPreferences, UserStats, UserRole, LanguageCode, LocationData, ContactInfo, Address } from '@/types';
export interface IUser extends Document {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    countryCode?: string;
    profileImage?: string;
    role: UserRole;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
    emailVerificationToken?: string;
    emailVerificationExpires?: Date;
    phoneVerificationToken?: string;
    phoneVerificationExpires?: Date;
    passwordResetToken?: string;
    passwordResetExpires?: Date;
    preferredLanguage: LanguageCode;
    location?: LocationData;
    bio?: string;
    expertise?: string[];
    farmingExperience?: number;
    cropsOfInterest?: string[];
    farmSize?: number;
    farmType?: 'organic' | 'conventional' | 'hydroponic' | 'greenhouse';
    contactInfo?: ContactInfo;
    address?: Address;
    timezone?: string;
    isActive: boolean;
    isDeleted: boolean;
    deletedAt?: Date;
    lastLoginAt?: Date;
    failedLoginAttempts: number;
    lockUntil?: Date;
    consents: Array<{
        type: 'terms' | 'privacy' | 'marketing';
        granted: boolean;
        version: string;
        timestamp: Date;
        ipAddress?: string;
    }>;
    socialAccounts?: Array<{
        provider: 'google' | 'facebook' | 'apple';
        providerId: string;
        email?: string;
        connectedAt: Date;
    }>;
    preferences: UserPreferences;
    createdAt: Date;
    updatedAt: Date;
    fullName: string;
    isAccountLocked: boolean;
    comparePassword(candidatePassword: string): Promise<boolean>;
    generateEmailVerificationToken(): string;
    generatePasswordResetToken(): string;
    generatePhoneVerificationToken(): string;
    toProfileJSON(): UserProfile;
    toStatsJSON(): UserStats;
    createPasswordResetToken(): string;
    createEmailVerificationToken(): string;
    createPhoneVerificationToken(): string;
    incrementLoginAttempts(): Promise<void>;
    resetLoginAttempts(): Promise<void>;
    isLocked(): boolean;
}
export interface IUserModel extends Model<IUser> {
    findByEmail(email: string): Promise<IUser | null>;
    findByPhone(phone: string, countryCode: string): Promise<IUser | null>;
    findActiveById(id: string): Promise<IUser | null>;
    createWithHashedPassword(userData: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        phone?: string;
        countryCode?: string;
    }): Promise<IUser>;
}
//# sourceMappingURL=IUser.d.ts.map