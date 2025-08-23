"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.retryDiagnosis = exports.deleteDiagnosis = exports.submitFeedback = exports.updateDiagnosis = exports.listDiagnoses = exports.getDiagnosis = exports.createDiagnosis = void 0;
// Removed NextFunction import as we're not using it
const mongoose_1 = __importDefault(require("mongoose"));
const Diagnosis_1 = require("@/models/Diagnosis");
const Crop_1 = require("@/models/Crop");
const Disease_1 = require("@/models/Disease");
const logger_1 = require("@/utils/logger");
const errors_1 = require("@/utils/errors");
const constants_1 = require("@/utils/constants");
// AI Service placeholder - would be implemented separately
const processPlantImages = async (images) => {
    // Mock AI processing - replace with actual AI service
    return {
        success: true,
        results: [
            {
                disease: 'tomato_blight',
                confidence: 0.85,
                severity: 'moderate',
                recommendations: ['Apply fungicide', 'Remove affected leaves'],
            },
        ],
        confidence: 85,
        processingTime: 2.5,
    };
};
// Image processing service
const processImages = async (files) => {
    const processedImages = files.map((file, index) => ({
        id: `img_${Date.now()}_${index}`,
        url: `/uploads/${file.filename}`,
        thumbnailUrl: `/uploads/thumbnails/${file.filename}`,
        metadata: {
            size: file.size,
            format: file.mimetype.split('/')[1],
            width: 1024, // Would get from image processing
            height: 768,
            colorSpace: 'RGB',
            quality: 90,
        },
    }));
    return {
        processedImages,
        errors: [],
    };
};
// Create new diagnosis
const createDiagnosis = async (req, res) => {
    try {
        const { cropId, location, symptoms, growthStage, environmentalConditions, farmingPractices, urgencyLevel = 'medium', shareAnonymous = false, shareForResearch = false, tags = [], } = req.body;
        const userId = req.user.id;
        const images = req.files;
        if (!images || images.length === 0) {
            throw new errors_1.ValidationError('At least one image is required for diagnosis');
        }
        if (images.length > 5) {
            throw new errors_1.ValidationError('Maximum 5 images allowed per diagnosis');
        }
        // Validate crop exists
        if (cropId) {
            const crop = await Crop_1.Crop.findById(cropId);
            if (!crop) {
                throw new errors_1.NotFoundError('Specified crop not found');
            }
        }
        // Process images
        const imageProcessingResult = await processImages(images);
        if (imageProcessingResult.errors.length > 0) {
            throw new errors_1.BadRequestError(`Image processing failed: ${imageProcessingResult.errors.join(', ')}`);
        }
        // Create diagnosis record
        const diagnosis = new Diagnosis_1.Diagnosis({
            user: userId,
            crop: cropId,
            images: imageProcessingResult.processedImages.map(img => ({
                url: img.url,
                thumbnailUrl: img.thumbnailUrl,
                metadata: img.metadata,
                uploadedAt: new Date(),
            })),
            location: {
                type: 'Point',
                coordinates: [location.longitude, location.latitude],
                address: location.address,
            },
            symptoms,
            growthStage,
            environmentalConditions,
            farmingPractices,
            urgencyLevel,
            shareAnonymous,
            shareForResearch,
            tags,
            status: constants_1.DiagnosisStatus.PROCESSING,
            // type: 'AI', // Removed as DiagnosisType is not defined
            createdAt: new Date(),
        });
        await diagnosis.save();
        // Process with AI in background
        try {
            const aiResult = await processPlantImages(images);
            if (aiResult.success && aiResult.results) {
                // Find matching diseases
                const diseaseNames = aiResult.results.map(r => r.disease);
                const diseases = await Disease_1.Disease.find({
                    scientificName: { $in: diseaseNames }
                });
                diagnosis.results = aiResult.results.map(result => ({
                    disease: diseases.find(d => d.scientificName === result.disease)?._id,
                    confidence: result.confidence,
                    severity: result.severity,
                    symptoms: result.symptoms || [],
                    recommendations: result.recommendations || [],
                    treatmentOptions: result.treatments || [],
                    additionalNotes: result.notes,
                }));
                diagnosis.confidence = aiResult.confidence;
                diagnosis.status = constants_1.DiagnosisStatus.COMPLETED;
                diagnosis.processedAt = new Date();
            }
            else {
                diagnosis.status = constants_1.DiagnosisStatus.FAILED;
                diagnosis.errorMessage = aiResult.error || 'AI processing failed';
            }
            await diagnosis.save();
        }
        catch (aiError) {
            logger_1.logger.error('AI processing failed', {
                diagnosisId: diagnosis._id,
                error: aiError,
                userId
            });
            diagnosis.status = constants_1.DiagnosisStatus.FAILED;
            diagnosis.errorMessage = 'AI processing failed';
            await diagnosis.save();
        }
        // Populate the response
        const populatedDiagnosis = await Diagnosis_1.Diagnosis.findById(diagnosis._id)
            .populate('crop', 'name scientificName')
            .populate('user', 'firstName lastName profileImage')
            .populate('results.disease', 'name scientificName symptoms');
        logger_1.logger.info('Diagnosis created successfully', {
            diagnosisId: diagnosis._id.toString(),
            userId,
            cropId,
            status: diagnosis.status,
        });
        res.status(201).json({
            success: true,
            message: 'Diagnosis created successfully',
            data: {
                id: populatedDiagnosis._id.toString(),
                status: populatedDiagnosis.status,
                confidence: populatedDiagnosis.confidence,
                results: populatedDiagnosis.results,
                images: populatedDiagnosis.images,
                crop: populatedDiagnosis.crop,
                location: populatedDiagnosis.location,
                createdAt: populatedDiagnosis.createdAt,
                estimatedCompletionTime: diagnosis.status === constants_1.DiagnosisStatus.PROCESSING ?
                    new Date(Date.now() + 30000) : // 30 seconds
                    undefined,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createDiagnosis = createDiagnosis;
// Get single diagnosis
const getDiagnosis = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            throw new errors_1.ValidationError('Invalid diagnosis ID');
        }
        const diagnosis = await Diagnosis_1.Diagnosis.findById(id)
            .populate('crop', 'name scientificName category')
            .populate('user', 'firstName lastName profileImage')
            .populate('results.disease', 'name scientificName symptoms treatmentOptions')
            .populate('expertReview.expert', 'firstName lastName profileImage credentials');
        if (!diagnosis) {
            throw new errors_1.NotFoundError('Diagnosis not found');
        }
        // Check if user can access this diagnosis
        if (diagnosis.user._id.toString() !== userId && !diagnosis.shareAnonymous) {
            throw new errors_1.AuthorizationError('You do not have permission to view this diagnosis');
        }
        logger_1.logger.info('Diagnosis retrieved', {
            diagnosisId: id,
            userId,
            accessType: diagnosis.user._id.toString() === userId ? 'owner' : 'shared',
        });
        res.json({
            success: true,
            message: 'Diagnosis retrieved successfully',
            data: diagnosis,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getDiagnosis = getDiagnosis;
// List diagnoses for user
const listDiagnoses = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 10, status, cropId, startDate, endDate, urgencyLevel, sortBy = 'createdAt', sortOrder = 'desc', } = req.query;
        // Build filter
        const filter = { user: userId, isDeleted: false };
        if (status)
            filter.status = status;
        if (cropId)
            filter.crop = cropId;
        if (urgencyLevel)
            filter.urgencyLevel = urgencyLevel;
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate)
                filter.createdAt.$gte = new Date(startDate);
            if (endDate)
                filter.createdAt.$lte = new Date(endDate);
        }
        const skip = (Number(page) - 1) * Number(limit);
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
        const [diagnoses, total] = await Promise.all([
            Diagnosis_1.Diagnosis.find(filter)
                .populate('crop', 'name scientificName')
                .populate('results.disease', 'name scientificName')
                .sort(sort)
                .skip(skip)
                .limit(Number(limit)),
            Diagnosis_1.Diagnosis.countDocuments(filter),
        ]);
        const totalPages = Math.ceil(total / Number(limit));
        logger_1.logger.info('Diagnoses listed', {
            userId,
            count: diagnoses.length,
            total,
            page: Number(page),
        });
        res.json({
            success: true,
            message: 'Diagnoses retrieved successfully',
            data: {
                diagnoses,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages,
                    hasNextPage: Number(page) < totalPages,
                    hasPreviousPage: Number(page) > 1,
                },
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.listDiagnoses = listDiagnoses;
// Update diagnosis
const updateDiagnosis = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { shareAnonymous, shareForResearch, tags } = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            throw new errors_1.ValidationError('Invalid diagnosis ID');
        }
        const diagnosis = await Diagnosis_1.Diagnosis.findOne({ _id: id, user: userId, isDeleted: false });
        if (!diagnosis) {
            throw new errors_1.NotFoundError('Diagnosis not found');
        }
        // Update allowed fields
        if (shareAnonymous !== undefined)
            diagnosis.shareAnonymous = shareAnonymous;
        if (shareForResearch !== undefined)
            diagnosis.shareForResearch = shareForResearch;
        if (tags)
            diagnosis.tags = tags;
        await diagnosis.save();
        const updatedDiagnosis = await Diagnosis_1.Diagnosis.findById(id)
            .populate('crop', 'name scientificName')
            .populate('results.disease', 'name scientificName');
        logger_1.logger.info('Diagnosis updated', {
            diagnosisId: id,
            userId,
            updates: { shareAnonymous, shareForResearch, tagsCount: tags?.length },
        });
        res.json({
            success: true,
            message: 'Diagnosis updated successfully',
            data: updatedDiagnosis,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateDiagnosis = updateDiagnosis;
// Submit feedback
const submitFeedback = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { rating, comment, isHelpful } = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            throw new errors_1.ValidationError('Invalid diagnosis ID');
        }
        if (rating < 1 || rating > 5) {
            throw new errors_1.ValidationError('Rating must be between 1 and 5');
        }
        const diagnosis = await Diagnosis_1.Diagnosis.findOne({ _id: id, user: userId });
        if (!diagnosis) {
            throw new errors_1.NotFoundError('Diagnosis not found');
        }
        if (diagnosis.status !== constants_1.DiagnosisStatus.COMPLETED) {
            throw new errors_1.BadRequestError('Can only provide feedback for completed diagnoses');
        }
        diagnosis.feedback = {
            rating,
            comment,
            isHelpful,
            submittedAt: new Date(),
        };
        await diagnosis.save();
        logger_1.logger.info('Diagnosis feedback submitted', {
            diagnosisId: id,
            userId,
            rating,
            isHelpful,
        });
        res.json({
            success: true,
            message: 'Feedback submitted successfully',
            data: { message: 'Thank you for your feedback' },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.submitFeedback = submitFeedback;
// Delete diagnosis
const deleteDiagnosis = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            throw new errors_1.ValidationError('Invalid diagnosis ID');
        }
        const diagnosis = await Diagnosis_1.Diagnosis.findOne({ _id: id, user: userId, isDeleted: false });
        if (!diagnosis) {
            throw new errors_1.NotFoundError('Diagnosis not found');
        }
        diagnosis.isDeleted = true;
        diagnosis.deletedAt = new Date();
        await diagnosis.save();
        logger_1.logger.info('Diagnosis deleted', {
            diagnosisId: id,
            userId,
        });
        res.json({
            success: true,
            message: 'Diagnosis deleted successfully',
            data: { message: 'Diagnosis deleted successfully' },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteDiagnosis = deleteDiagnosis;
// Retry failed diagnosis
const retryDiagnosis = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            throw new errors_1.ValidationError('Invalid diagnosis ID');
        }
        const diagnosis = await Diagnosis_1.Diagnosis.findOne({ _id: id, user: userId });
        if (!diagnosis) {
            throw new errors_1.NotFoundError('Diagnosis not found');
        }
        if (diagnosis.status !== constants_1.DiagnosisStatus.FAILED) {
            throw new errors_1.BadRequestError('Can only retry failed diagnoses');
        }
        // Reset diagnosis for retry
        diagnosis.status = constants_1.DiagnosisStatus.PROCESSING;
        diagnosis.results = [];
        diagnosis.confidence = undefined;
        diagnosis.errorMessage = undefined;
        diagnosis.processedAt = undefined;
        await diagnosis.save();
        // TODO: Trigger AI processing again
        logger_1.logger.info('Diagnosis retry initiated', {
            diagnosisId: id,
            userId,
        });
        res.json({
            success: true,
            message: 'Diagnosis retry initiated',
            data: {
                id: diagnosis._id.toString(),
                status: diagnosis.status,
                estimatedCompletionTime: new Date(Date.now() + 30000),
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.retryDiagnosis = retryDiagnosis;
exports.default = {
    createDiagnosis: exports.createDiagnosis,
    getDiagnosis: exports.getDiagnosis,
    listDiagnoses: exports.listDiagnoses,
    updateDiagnosis: exports.updateDiagnosis,
    submitFeedback: exports.submitFeedback,
    deleteDiagnosis: exports.deleteDiagnosis,
    retryDiagnosis: exports.retryDiagnosis,
};
//# sourceMappingURL=diagnosisController.js.map