"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocialAccount = void 0;
const mongoose_1 = require("mongoose");
const socialAccountSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    provider: {
        type: String,
        required: true,
        enum: ['google', 'facebook', 'twitter', 'apple', 'linkedin'],
        index: true,
    },
    providerId: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        index: true,
    },
    displayName: {
        type: String,
        trim: true,
        maxlength: 100,
    },
    profileImage: {
        type: String,
        trim: true,
    },
    profileData: {
        firstName: {
            type: String,
            trim: true,
            maxlength: 50,
        },
        lastName: {
            type: String,
            trim: true,
            maxlength: 50,
        },
        locale: {
            type: String,
            trim: true,
            maxlength: 10,
        },
        timezone: {
            type: String,
            trim: true,
            maxlength: 50,
        },
        verified: {
            type: Boolean,
            default: false,
        },
        gender: {
            type: String,
            trim: true,
            enum: ['male', 'female', 'other', 'prefer_not_to_say'],
        },
        birthday: {
            type: String,
            trim: true,
        },
        location: {
            type: String,
            trim: true,
            maxlength: 100,
        },
    },
    accessToken: {
        type: String,
        select: false, // Don't include in queries by default
    },
    refreshToken: {
        type: String,
        select: false,
    },
    tokenExpiry: {
        type: Date,
    },
    scope: [{
            type: String,
            trim: true,
        }],
    isActive: {
        type: Boolean,
        default: true,
        index: true,
    },
    lastUsed: {
        type: Date,
        default: Date.now,
        index: true,
    },
    metadata: {
        ipAddress: {
            type: String,
            trim: true,
        },
        userAgent: {
            type: String,
            trim: true,
        },
        country: {
            type: String,
            trim: true,
            maxlength: 2,
        },
        city: {
            type: String,
            trim: true,
            maxlength: 100,
        },
    },
}, {
    timestamps: true,
    toJSON: {
        transform: (doc, ret) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            delete ret.accessToken;
            delete ret.refreshToken;
            return ret;
        },
    },
});
// Compound indexes
socialAccountSchema.index({ provider: 1, providerId: 1 }, { unique: true });
socialAccountSchema.index({ userId: 1, provider: 1 });
socialAccountSchema.index({ email: 1, provider: 1 });
socialAccountSchema.index({ isActive: 1, lastUsed: -1 });
// Instance methods
socialAccountSchema.methods.updateTokens = async function (accessToken, refreshToken, expiresIn) {
    this.accessToken = accessToken;
    if (refreshToken)
        this.refreshToken = refreshToken;
    if (expiresIn)
        this.tokenExpiry = new Date(Date.now() + expiresIn * 1000);
    this.lastUsed = new Date();
    await this.save();
};
socialAccountSchema.methods.updateProfileData = async function (data) {
    this.profileData = { ...this.profileData, ...data };
    await this.save();
};
socialAccountSchema.methods.deactivate = async function () {
    this.isActive = false;
    await this.save();
};
socialAccountSchema.methods.reactivate = async function () {
    this.isActive = true;
    this.lastUsed = new Date();
    await this.save();
};
socialAccountSchema.methods.updateLastUsed = async function (metadata) {
    this.lastUsed = new Date();
    if (metadata)
        this.metadata = { ...this.metadata, ...metadata };
    await this.save();
};
socialAccountSchema.methods.isTokenExpired = function () {
    if (!this.tokenExpiry)
        return false;
    return new Date() > this.tokenExpiry;
};
// Static methods
socialAccountSchema.statics.findByUserId = async function (userId) {
    return this.find({ userId, isActive: true }).sort({ createdAt: -1 });
};
socialAccountSchema.statics.findByProvider = async function (provider, providerId) {
    return this.findOne({ provider, providerId, isActive: true });
};
socialAccountSchema.statics.findByEmail = async function (email, provider) {
    const query = { email: email.toLowerCase(), isActive: true };
    if (provider)
        query.provider = provider;
    return this.find(query).sort({ createdAt: -1 });
};
socialAccountSchema.statics.getProviderStats = async function () {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const [totalResult, activeResult, providerResult, recentResult] = await Promise.all([
        this.countDocuments({}),
        this.countDocuments({ isActive: true }),
        this.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: '$provider', count: { $sum: 1 } } }
        ]),
        this.countDocuments({ createdAt: { $gte: lastMonth } })
    ]);
    return {
        totalAccounts: totalResult,
        activeAccounts: activeResult,
        accountsByProvider: providerResult.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {}),
        recentConnections: recentResult,
    };
};
socialAccountSchema.statics.cleanup = async function (inactiveDays) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);
    const result = await this.deleteMany({
        isActive: false,
        lastUsed: { $lt: cutoffDate },
    });
    return result.deletedCount || 0;
};
exports.SocialAccount = (0, mongoose_1.model)('SocialAccount', socialAccountSchema);
exports.default = exports.SocialAccount;
//# sourceMappingURL=SocialAccount.js.map