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
exports.PhoneBlockListModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const phoneVerificationSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
    },
    phone: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    countryCode: {
        type: String,
        required: true,
        trim: true,
    },
    otp: {
        type: String,
        select: false, // Never include in queries
    },
    hashedOtp: {
        type: String,
        required: true,
        select: false,
    },
    purpose: {
        type: String,
        required: true,
        enum: ['registration', 'login', 'phone_update', 'password_reset', 'account_verification'],
        index: true,
    },
    verified: {
        type: Boolean,
        default: false,
        index: true,
    },
    attempts: {
        type: Number,
        default: 0,
        min: 0,
    },
    maxAttempts: {
        type: Number,
        default: 3,
        min: 1,
        max: 10,
    },
    lastAttemptAt: Date,
    expiresAt: {
        type: Date,
        required: true,
        index: { expireAfterSeconds: 0 }, // MongoDB TTL index
    },
    verifiedAt: Date,
    ipAddress: {
        type: String,
        required: true,
    },
    userAgent: {
        type: String,
        required: true,
    },
    metadata: {
        deviceId: String,
        sessionId: String,
        referrer: String,
    },
}, {
    timestamps: true,
    toJSON: {
        transform: function (doc, ret) {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            delete ret.otp;
            delete ret.hashedOtp;
            return ret;
        },
    },
});
// Compound indexes
phoneVerificationSchema.index({ phone: 1, countryCode: 1 });
phoneVerificationSchema.index({ phone: 1, countryCode: 1, verified: 1 });
phoneVerificationSchema.index({ userId: 1, purpose: 1 });
phoneVerificationSchema.index({ expiresAt: 1, verified: 1 });
// Pre-save middleware to hash OTP
phoneVerificationSchema.pre('save', async function (next) {
    if (!this.isModified('otp'))
        return next();
    if (this.otp) {
        const saltRounds = 10;
        this.hashedOtp = await bcryptjs_1.default.hash(this.otp, saltRounds);
    }
    next();
});
// Instance methods
phoneVerificationSchema.methods.isExpired = function () {
    return new Date() > this.expiresAt;
};
phoneVerificationSchema.methods.canRetry = function () {
    if (this.verified)
        return false;
    if (this.isExpired())
        return false;
    return this.attempts < this.maxAttempts;
};
phoneVerificationSchema.methods.incrementAttempts = async function () {
    this.attempts += 1;
    this.lastAttemptAt = new Date();
    await this.save();
};
phoneVerificationSchema.methods.verify = async function (inputOtp) {
    if (!this.canRetry()) {
        return false;
    }
    await this.incrementAttempts();
    if (!this.hashedOtp) {
        return false;
    }
    const isValid = await bcryptjs_1.default.compare(inputOtp, this.hashedOtp);
    if (isValid && !this.isExpired()) {
        await this.markAsVerified();
        return true;
    }
    return false;
};
phoneVerificationSchema.methods.markAsVerified = async function () {
    this.verified = true;
    this.verifiedAt = new Date();
    await this.save();
};
phoneVerificationSchema.methods.extend = async function (minutes = 10) {
    this.expiresAt = new Date(Date.now() + minutes * 60 * 1000);
    await this.save();
};
phoneVerificationSchema.methods.generateNewOtp = async function () {
    const otpLength = parseInt(process.env.OTP_LENGTH || '6', 10);
    const newOtp = crypto_1.default.randomInt(Math.pow(10, otpLength - 1), Math.pow(10, otpLength)).toString();
    this.otp = newOtp;
    this.attempts = 0;
    this.verified = false;
    this.verifiedAt = undefined;
    this.lastAttemptAt = undefined;
    // Extend expiration
    const expirationMinutes = parseInt(process.env.OTP_EXPIRY || '10', 10);
    this.expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);
    await this.save();
    return newOtp;
};
// Static methods
phoneVerificationSchema.statics.findByPhone = function (phone, countryCode) {
    return this.findOne({
        phone: phone.replace(/\D/g, ''), // Remove non-digits
        countryCode: countryCode.replace(/\D/g, ''), // Remove non-digits
    }).sort({ createdAt: -1 }).exec();
};
phoneVerificationSchema.statics.findActiveByPhone = function (phone, countryCode) {
    return this.findOne({
        phone: phone.replace(/\D/g, ''),
        countryCode: countryCode.replace(/\D/g, ''),
        verified: false,
        expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 }).exec();
};
phoneVerificationSchema.statics.createVerification = async function (data) {
    const { userId, phone, countryCode, purpose, expirationMinutes = 10, ipAddress, userAgent, metadata = {}, } = data;
    // Check if phone is blocked
    const isBlocked = await this.isPhoneBlocked(phone, countryCode);
    if (isBlocked) {
        throw new Error('Phone number is temporarily blocked');
    }
    // Generate OTP
    const otpLength = parseInt(process.env.OTP_LENGTH || '6', 10);
    const otp = crypto_1.default.randomInt(Math.pow(10, otpLength - 1), Math.pow(10, otpLength)).toString();
    // Clean phone numbers
    const cleanPhone = phone.replace(/\D/g, '');
    const cleanCountryCode = countryCode.replace(/\D/g, '');
    // Deactivate any existing active verifications for this phone
    await this.updateMany({
        phone: cleanPhone,
        countryCode: cleanCountryCode,
        verified: false,
    }, {
        expiresAt: new Date() // Expire immediately
    });
    const verification = new this({
        userId,
        phone: cleanPhone,
        countryCode: cleanCountryCode,
        otp,
        purpose,
        expiresAt: new Date(Date.now() + expirationMinutes * 60 * 1000),
        ipAddress,
        userAgent,
        metadata,
        maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '3', 10),
    });
    await verification.save();
    return verification;
};
phoneVerificationSchema.statics.cleanupExpired = async function () {
    const result = await this.deleteMany({
        expiresAt: { $lt: new Date() },
        verified: false,
    });
    return result.deletedCount || 0;
};
phoneVerificationSchema.statics.getVerificationStats = async function (timeframe = 'day') {
    const now = new Date();
    let startDate;
    switch (timeframe) {
        case 'day':
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
        case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case 'month':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
    }
    const [totalStats, topCountries, purposeBreakdown] = await Promise.all([
        this.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    successful: { $sum: { $cond: ['$verified', 1, 0] } },
                    failed: { $sum: { $cond: ['$verified', 0, 1] } },
                    totalAttempts: { $sum: '$attempts' },
                },
            },
        ]),
        this.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            { $group: { _id: '$countryCode', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
            { $project: { countryCode: '$_id', count: 1, _id: 0 } },
        ]),
        this.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            { $group: { _id: '$purpose', count: { $sum: 1 } } },
        ]),
    ]);
    const stats = totalStats[0] || { total: 0, successful: 0, failed: 0, totalAttempts: 0 };
    return {
        totalVerifications: stats.total,
        successfulVerifications: stats.successful,
        failedVerifications: stats.failed,
        successRate: stats.total > 0 ? (stats.successful / stats.total) * 100 : 0,
        averageAttempts: stats.total > 0 ? stats.totalAttempts / stats.total : 0,
        topCountries,
        purposeBreakdown: purposeBreakdown.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {}),
    };
};
phoneVerificationSchema.statics.blockPhone = async function (phone, countryCode, reason) {
    const PhoneBlockListModel = mongoose_1.default.model('PhoneBlockList');
    await PhoneBlockListModel.findOneAndUpdate({
        phone: phone.replace(/\D/g, ''),
        countryCode: countryCode.replace(/\D/g, ''),
    }, {
        reason,
        isActive: true,
        blockedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Block for 24 hours
    }, { upsert: true, new: true });
};
phoneVerificationSchema.statics.unblockPhone = async function (phone, countryCode) {
    const PhoneBlockListModel = mongoose_1.default.model('PhoneBlockList');
    await PhoneBlockListModel.findOneAndUpdate({
        phone: phone.replace(/\D/g, ''),
        countryCode: countryCode.replace(/\D/g, ''),
    }, { isActive: false });
};
phoneVerificationSchema.statics.isPhoneBlocked = async function (phone, countryCode) {
    const PhoneBlockListModel = mongoose_1.default.model('PhoneBlockList');
    const blockEntry = await PhoneBlockListModel.findOne({
        phone: phone.replace(/\D/g, ''),
        countryCode: countryCode.replace(/\D/g, ''),
        isActive: true,
        $or: [
            { expiresAt: { $exists: false } },
            { expiresAt: { $gt: new Date() } },
        ],
    });
    return !!blockEntry;
};
// Phone Block List Schema
const phoneBlockListSchema = new mongoose_1.Schema({
    phone: {
        type: String,
        required: true,
        index: true,
    },
    countryCode: {
        type: String,
        required: true,
    },
    reason: {
        type: String,
        required: true,
    },
    blockedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    blockedAt: {
        type: Date,
        default: Date.now,
    },
    expiresAt: Date,
    isActive: {
        type: Boolean,
        default: true,
        index: true,
    },
}, {
    timestamps: true,
});
phoneBlockListSchema.index({ phone: 1, countryCode: 1 });
phoneBlockListSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const PhoneVerification = mongoose_1.default.model('PhoneVerification', phoneVerificationSchema);
const PhoneBlockListModel = mongoose_1.default.model('PhoneBlockList', phoneBlockListSchema);
exports.PhoneBlockListModel = PhoneBlockListModel;
exports.default = PhoneVerification;
//# sourceMappingURL=PhoneVerification.js.map