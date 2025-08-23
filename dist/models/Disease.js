"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Disease = void 0;
const mongoose_1 = require("mongoose");
const diseaseSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
    },
    scientificName: {
        type: String,
        trim: true,
        maxlength: 200,
    },
    category: {
        type: String,
        required: true,
        enum: ['fungal', 'bacterial', 'viral', 'pest', 'nutritional', 'environmental'],
    },
    description: {
        type: String,
        required: true,
        maxlength: 2000,
    },
    symptoms: [{
            type: String,
            required: true,
            trim: true,
        }],
    causes: [{
            type: String,
            required: true,
            trim: true,
        }],
    treatments: [{
            type: String,
            required: true,
            trim: true,
        }],
    severity: {
        type: String,
        required: true,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium',
    },
    affectedCrops: [{
            type: String,
            required: true,
            trim: true,
        }],
    images: [{
            type: String,
            trim: true,
        }],
    isActive: {
        type: Boolean,
        default: true,
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
diseaseSchema.index({ name: 1 });
diseaseSchema.index({ category: 1 });
diseaseSchema.index({ affectedCrops: 1 });
diseaseSchema.index({ severity: 1 });
diseaseSchema.index({ isActive: 1 });
exports.Disease = (0, mongoose_1.model)('Disease', diseaseSchema);
exports.default = exports.Disease;
//# sourceMappingURL=Disease.js.map