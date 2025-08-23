"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const socialAccountSchema = new mongoose_1.Schema({
    provider: {
        type: String,
        enum: ['google', 'facebook', 'apple'],
        required: true,
    },
    providerId: {
        type: String,
        required: true,
    },
    email: String,
    connectedAt: {
        type: Date,
        default: Date.now,
    },
}, { _id: false });
const consentSchema = new mongoose_1.Schema({
    type: {
        type: String,
        enum: ['terms', 'privacy', 'marketing'],
        required: true,
    },
    granted: {
        type: Boolean,
        required: true,
    },
    version: {
        type: String,
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
    ipAddress: String,
}, { _id: false });
const locationSchema = new mongoose_1.Schema({
    latitude: {
        type: Number,
        required: true,
        min: -90,
        max: 90,
    },
    longitude: {
        type: Number,
        required: true,
        min: -180,
        max: 180,
    },
    address: String,
    city: String,
    state: String,
    country: String,
    zipCode: String,
}, { _id: false });
const contactInfoSchema = new mongoose_1.Schema({
    phone: String,
    email: String,
    whatsapp: String,
    telegram: String,
}, { _id: false });
const addressSchema = new mongoose_1.Schema({
    street: String,
    city: String,
    state: String,
    country: {
        type: String,
        required: true,
    },
    zipCode: String,
    coordinates: {
        latitude: {
            type: Number,
            min: -90,
            max: 90,
        },
        longitude: {
            type: Number,
            min: -180,
            max: 180,
        },
    },
}, { _id: false });
const preferencesSchema = new mongoose_1.Schema({
    notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        weatherAlerts: { type: Boolean, default: true },
        priceAlerts: { type: Boolean, default: true },
        communityUpdates: { type: Boolean, default: true },
        expertReplies: { type: Boolean, default: true },
        marketingEmails: { type: Boolean, default: false },
    },
    privacy: {
        showProfile: { type: Boolean, default: true },
        showLocation: { type: Boolean, default: false },
        showContactInfo: { type: Boolean, default: false },
        allowDirectMessages: { type: Boolean, default: true },
    },
    display: {
        theme: {
            type: String,
            enum: ['light', 'dark', 'auto'],
            default: 'light',
        },
        language: {
            type: String,
            enum: ['en', 'es', 'fr', 'pt', 'hi', 'bn', 'id', 'vi'],
            default: 'en',
        },
        currency: { type: String, default: 'USD' },
        units: {
            type: String,
            enum: ['metric', 'imperial'],
            default: 'metric',
        },
        timezone: { type: String, default: 'UTC' },
    },
    ai: {
        saveImages: { type: Boolean, default: true },
        shareAnonymous: { type: Boolean, default: false },
        improveModel: { type: Boolean, default: true },
    },
}, { _id: false });
const userSchema = new mongoose_1.Schema({
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
        validate: {
            validator: function (email) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
            },
            message: 'Please provide a valid email address',
        },
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters long'],
        select: false,
        validate: {
            validator: function (password) {
                // Password must contain at least one uppercase, one lowercase, one number, and one special character
                return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(password);
            },
            message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        },
    },
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    phone: {
        type: String,
        trim: true,
        validate: {
            validator: function (phone) {
                if (!phone)
                    return true; // Optional field
                return /^\+?[\d\s-()]+$/.test(phone);
            },
            message: 'Please provide a valid phone number',
        },
    },
    countryCode: {
        type: String,
        trim: true,
        validate: {
            validator: function (countryCode) {
                if (!countryCode)
                    return true; // Optional field
                return /^\+\d{1,4}$/.test(countryCode);
            },
            message: 'Please provide a valid country code (e.g., +1, +91)',
        },
    },
    profileImage: {
        type: String,
        trim: true,
    },
    role: {
        type: String,
        enum: ['user', 'expert', 'admin', 'moderator'],
        default: 'user',
        index: true,
    },
    // Verification status
    isEmailVerified: {
        type: Boolean,
        default: false,
        index: true,
    },
    isPhoneVerified: {
        type: Boolean,
        default: false,
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    phoneVerificationToken: String,
    phoneVerificationExpires: Date,
    // Password reset
    passwordResetToken: String,
    passwordResetExpires: Date,
    // User preferences
    preferredLanguage: {
        type: String,
        enum: ['en', 'es', 'fr', 'pt', 'hi', 'bn', 'id', 'vi'],
        default: 'en',
    },
    location: locationSchema,
    bio: {
        type: String,
        maxlength: [500, 'Bio cannot exceed 500 characters'],
    },
    expertise: [{
            type: String,
            maxlength: 100,
        }],
    farmingExperience: {
        type: Number,
        min: [0, 'Farming experience cannot be negative'],
        max: [100, 'Farming experience cannot exceed 100 years'],
    },
    cropsOfInterest: [{
            type: String,
            maxlength: 100,
        }],
    farmSize: {
        type: Number,
        min: [0, 'Farm size cannot be negative'],
    },
    farmType: {
        type: String,
        enum: ['organic', 'conventional', 'hydroponic', 'greenhouse'],
    },
    contactInfo: contactInfoSchema,
    address: addressSchema,
    timezone: {
        type: String,
        default: 'UTC',
    },
    // Account status
    isActive: {
        type: Boolean,
        default: true,
        index: true,
    },
    isDeleted: {
        type: Boolean,
        default: false,
        index: true,
    },
    deletedAt: Date,
    lastLoginAt: Date,
    // Security
    failedLoginAttempts: {
        type: Number,
        default: 0,
    },
    lockUntil: Date,
    // Consent tracking
    consents: [consentSchema],
    // Social accounts
    socialAccounts: [socialAccountSchema],
    // Preferences
    preferences: {
        type: preferencesSchema,
        default: () => ({}),
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true, transform: removeFields },
    toObject: { virtuals: true, transform: removeFields },
});
// Transform function to remove sensitive fields
function removeFields(doc, ret) {
    delete ret.password;
    delete ret.passwordResetToken;
    delete ret.passwordResetExpires;
    delete ret.emailVerificationToken;
    delete ret.emailVerificationExpires;
    delete ret.phoneVerificationToken;
    delete ret.phoneVerificationExpires;
    delete ret.__v;
    return ret;
}
// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ phone: 1, countryCode: 1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ isDeleted: 1, createdAt: -1 });
userSchema.index({ 'location.coordinates': '2dsphere' });
// Virtual fields
userSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`.trim();
});
userSchema.virtual('isAccountLocked').get(function () {
    return Boolean(this.lockUntil && this.lockUntil > new Date());
});
// Pre-save middleware
userSchema.pre('save', async function (next) {
    // Hash password if modified
    if (this.isModified('password')) {
        try {
            const salt = await bcryptjs_1.default.genSalt(12);
            this.password = await bcryptjs_1.default.hash(this.password, salt);
        }
        catch (error) {
            return next(error);
        }
    }
    // Set deletedAt when isDeleted is set to true
    if (this.isModified('isDeleted') && this.isDeleted && !this.deletedAt) {
        this.deletedAt = new Date();
    }
    // Clear deletedAt when isDeleted is set to false
    if (this.isModified('isDeleted') && !this.isDeleted && this.deletedAt) {
        this.deletedAt = null;
    }
    next();
});
// Instance methods
userSchema.methods.comparePassword = async function (candidatePassword) {
    try {
        return await bcryptjs_1.default.compare(candidatePassword, this.password);
    }
    catch (error) {
        throw new Error('Password comparison failed');
    }
};
userSchema.methods.generateEmailVerificationToken = function () {
    const token = crypto_1.default.randomBytes(32).toString('hex');
    this.emailVerificationToken = crypto_1.default.createHash('sha256').update(token).digest('hex');
    this.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    return token;
};
userSchema.methods.generatePasswordResetToken = function () {
    const token = crypto_1.default.randomBytes(32).toString('hex');
    this.passwordResetToken = crypto_1.default.createHash('sha256').update(token).digest('hex');
    this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    return token;
};
userSchema.methods.generatePhoneVerificationToken = function () {
    const token = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
    this.phoneVerificationToken = crypto_1.default.createHash('sha256').update(token).digest('hex');
    this.phoneVerificationExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    return token;
};
userSchema.methods.toProfileJSON = function () {
    return {
        id: this._id.toString(),
        email: this.email,
        firstName: this.firstName,
        lastName: this.lastName,
        phone: this.phone || undefined,
        countryCode: this.countryCode || undefined,
        profileImage: this.profileImage || undefined,
        role: this.role,
        isEmailVerified: this.isEmailVerified,
        isPhoneVerified: this.isPhoneVerified,
        preferredLanguage: this.preferredLanguage,
        location: this.location || undefined,
        bio: this.bio || undefined,
        expertise: this.expertise || undefined,
        farmingExperience: this.farmingExperience || undefined,
        cropsOfInterest: this.cropsOfInterest || undefined,
        farmSize: this.farmSize || undefined,
        farmType: this.farmType || undefined,
        contactInfo: this.contactInfo || undefined,
        address: this.address || undefined,
        timezone: this.timezone || undefined,
        isActive: this.isActive,
        lastLoginAt: this.lastLoginAt || undefined,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
    };
};
userSchema.methods.toStatsJSON = function () {
    // These would typically be calculated from related collections
    return {
        totalDiagnoses: 0,
        successfulDiagnoses: 0,
        communityPosts: 0,
        communityLikes: 0,
        consultationsRequested: 0,
        consultationsCompleted: 0,
        joinDate: this.createdAt,
        lastActiveDate: this.lastLoginAt || this.updatedAt,
    };
};
userSchema.methods.createPasswordResetToken = function () {
    return this.generatePasswordResetToken();
};
userSchema.methods.createEmailVerificationToken = function () {
    return this.generateEmailVerificationToken();
};
userSchema.methods.createPhoneVerificationToken = function () {
    return this.generatePhoneVerificationToken();
};
userSchema.methods.incrementLoginAttempts = async function () {
    // If we have a previous lock that has expired, restart at 1
    if (this.lockUntil && this.lockUntil < new Date()) {
        return this.updateOne({
            $unset: { lockUntil: 1 },
            $set: { failedLoginAttempts: 1 },
        });
    }
    const updates = { $inc: { failedLoginAttempts: 1 } };
    // If we are at max attempts and not locked, lock the account
    if (this.failedLoginAttempts + 1 >= 5 && !this.isLocked()) {
        updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
    }
    return this.updateOne(updates);
};
userSchema.methods.resetLoginAttempts = async function () {
    return this.updateOne({
        $unset: {
            failedLoginAttempts: 1,
            lockUntil: 1,
        },
    });
};
userSchema.methods.isLocked = function () {
    return Boolean(this.lockUntil && this.lockUntil > new Date());
};
// Static methods
userSchema.statics.findByEmail = async function (email) {
    return this.findOne({
        email: email.toLowerCase(),
        isDeleted: false
    }).select('+password');
};
userSchema.statics.findByPhone = async function (phone, countryCode) {
    return this.findOne({
        phone,
        countryCode,
        isDeleted: false
    });
};
userSchema.statics.findActiveById = async function (id) {
    return this.findOne({
        _id: id,
        isActive: true,
        isDeleted: false
    });
};
userSchema.statics.createWithHashedPassword = async function (userData) {
    const user = new this(userData);
    await user.save();
    return user;
};
// Export the model
exports.User = mongoose_1.default.model('User', userSchema);
exports.default = exports.User;
//# sourceMappingURL=User.js.map