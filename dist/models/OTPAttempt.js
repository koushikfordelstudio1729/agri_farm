"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OTPAttempt = void 0;
const mongoose_1 = require("mongoose");
const otpAttemptSchema = new mongoose_1.Schema({
    phone: {
        type: String,
        required: true,
        trim: true,
        maxlength: 15,
    },
    countryCode: {
        type: String,
        required: true,
        trim: true,
        maxlength: 5,
    },
    attemptType: {
        type: String,
        required: true,
        enum: ['registration', 'login', 'phone_update', 'password_reset'],
    },
    attempts: {
        type: Number,
        default: 0,
        min: 0,
    },
    lastAttempt: {
        type: Date,
        default: Date.now,
    },
    blocked: {
        type: Boolean,
        default: false,
    },
    blockedUntil: {
        type: Date,
    },
    metadata: {
        ip: {
            type: String,
            trim: true,
        },
        userAgent: {
            type: String,
            trim: true,
        },
        sessionId: {
            type: String,
            trim: true,
        },
    },
}, {
    timestamps: true,
    toJSON: {
        transform: (doc, ret) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        },
    },
});
// Indexes
otpAttemptSchema.index({ phone: 1, countryCode: 1 }, { unique: true });
otpAttemptSchema.index({ blocked: 1 });
otpAttemptSchema.index({ blockedUntil: 1 });
otpAttemptSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 }); // Auto-delete after 24 hours
// Instance methods
otpAttemptSchema.methods.incrementAttempt = async function () {
    this.attempts += 1;
    this.lastAttempt = new Date();
    // Block after 5 attempts
    if (this.attempts >= 5) {
        this.blocked = true;
        this.blockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    }
    await this.save();
};
otpAttemptSchema.methods.isBlocked = function () {
    if (!this.blocked)
        return false;
    if (this.blockedUntil && new Date() > this.blockedUntil) {
        // Auto-unblock if time has passed
        this.blocked = false;
        this.blockedUntil = undefined;
        this.save();
        return false;
    }
    return true;
};
otpAttemptSchema.methods.block = async function (durationMinutes = 15) {
    this.blocked = true;
    this.blockedUntil = new Date(Date.now() + durationMinutes * 60 * 1000);
    await this.save();
};
otpAttemptSchema.methods.unblock = async function () {
    this.blocked = false;
    this.blockedUntil = undefined;
    await this.save();
};
otpAttemptSchema.methods.reset = async function () {
    this.attempts = 0;
    this.blocked = false;
    this.blockedUntil = undefined;
    this.lastAttempt = new Date();
    await this.save();
};
// Static methods
otpAttemptSchema.statics.findByPhone = async function (phone, countryCode) {
    return this.findOne({ phone, countryCode });
};
otpAttemptSchema.statics.createOrUpdate = async function (phone, countryCode, attemptType, metadata) {
    let attempt = await this.findOne({ phone, countryCode });
    if (attempt) {
        attempt.attemptType = attemptType;
        attempt.lastAttempt = new Date();
        if (metadata)
            attempt.metadata = metadata;
        await attempt.incrementAttempt();
    }
    else {
        attempt = await this.create({
            phone,
            countryCode,
            attemptType,
            attempts: 1,
            lastAttempt: new Date(),
            metadata,
        });
    }
    return attempt;
};
otpAttemptSchema.statics.cleanup = async function (olderThanDays) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    const result = await this.deleteMany({
        createdAt: { $lt: cutoffDate },
    });
    return result.deletedCount || 0;
};
otpAttemptSchema.statics.getAttemptStats = async function (dateRange) {
    const matchCondition = dateRange
        ? { createdAt: { $gte: dateRange.from, $lte: dateRange.to } }
        : {};
    const [totalResult, blockedResult, typeResult] = await Promise.all([
        this.aggregate([
            { $match: matchCondition },
            { $group: { _id: null, total: { $sum: '$attempts' } } }
        ]),
        this.countDocuments({ ...matchCondition, blocked: true }),
        this.aggregate([
            { $match: matchCondition },
            { $group: { _id: '$attemptType', count: { $sum: '$attempts' } } }
        ])
    ]);
    return {
        totalAttempts: totalResult[0]?.total || 0,
        blockedNumbers: blockedResult,
        attemptsByType: typeResult.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {}),
    };
};
exports.OTPAttempt = (0, mongoose_1.model)('OTPAttempt', otpAttemptSchema);
exports.default = exports.OTPAttempt;
//# sourceMappingURL=OTPAttempt.js.map