// Removed NextFunction import as we're not using it
import mongoose from 'mongoose';
import { Diagnosis } from '@/models/Diagnosis';
import { Crop } from '@/models/Crop';
import { Disease } from '@/models/Disease';
import { logger } from '@/utils/logger';
import {
  NotFoundError,
  ValidationError,
  AuthorizationError,
  BadRequestError,
  createErrorContext,
  ERROR_MESSAGES,
} from '@/utils/errors';
import {
  CreateDiagnosisController,
  GetDiagnosisController,
  ListDiagnosesController,
  UpdateDiagnosisController,
  SubmitFeedbackController,
  DeleteDiagnosisController,
  RetryDiagnosisController,
  ExpertReviewController,
  GetDiagnosisStatsController,
  GetPublicDiagnosesController,
  BatchDiagnosisController,
  DiagnosisProcessingResult,
  ImageProcessingResult,
} from './diagnosisController.types';
import { Diagnosis as DiagnosisType } from '@/types';
import { DiagnosisStatus } from '@/utils/constants';

// AI Service placeholder - would be implemented separately
const processPlantImages = async (images: Express.Multer.File[]): Promise<DiagnosisProcessingResult> => {
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
const processImages = async (files: Express.Multer.File[]): Promise<ImageProcessingResult> => {
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
export const createDiagnosis: CreateDiagnosisController = async (req, res) => {
  try {
    const {
      cropId,
      location,
      symptoms,
      growthStage,
      environmentalConditions,
      farmingPractices,
      urgencyLevel = 'medium',
      shareAnonymous = false,
      shareForResearch = false,
      tags = [],
    } = req.body;

    const userId = req.user.id;
    const images = req.files as Express.Multer.File[];

    if (!images || images.length === 0) {
      throw new ValidationError('At least one image is required for diagnosis');
    }

    if (images.length > 5) {
      throw new ValidationError('Maximum 5 images allowed per diagnosis');
    }

    // Validate crop exists
    if (cropId) {
      const crop = await Crop.findById(cropId);
      if (!crop) {
        throw new NotFoundError('Specified crop not found');
      }
    }

    // Process images
    const imageProcessingResult = await processImages(images);
    if (imageProcessingResult.errors.length > 0) {
      throw new BadRequestError(`Image processing failed: ${imageProcessingResult.errors.join(', ')}`);
    }

    // Create diagnosis record
    const diagnosis = new Diagnosis({
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
      status: DiagnosisStatus.PROCESSING,
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
        const diseases = await Disease.find({
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
        diagnosis.status = DiagnosisStatus.COMPLETED;
        diagnosis.processedAt = new Date();
      } else {
        diagnosis.status = DiagnosisStatus.FAILED;
        diagnosis.errorMessage = aiResult.error || 'AI processing failed';
      }

      await diagnosis.save();
    } catch (aiError) {
      logger.error('AI processing failed', { 
        diagnosisId: diagnosis._id, 
        error: aiError,
        userId 
      });
      
      diagnosis.status = DiagnosisStatus.FAILED;
      diagnosis.errorMessage = 'AI processing failed';
      await diagnosis.save();
    }

    // Populate the response
    const populatedDiagnosis = await Diagnosis.findById(diagnosis._id)
      .populate('crop', 'name scientificName')
      .populate('user', 'firstName lastName profileImage')
      .populate('results.disease', 'name scientificName symptoms');

    logger.info('Diagnosis created successfully', {
      diagnosisId: diagnosis._id.toString(),
      userId,
      cropId,
      status: diagnosis.status,
    });

    res.status(201).json({
      success: true,
      message: 'Diagnosis created successfully',
      data: {
        id: populatedDiagnosis!._id.toString(),
        status: populatedDiagnosis!.status,
        confidence: populatedDiagnosis!.confidence,
        results: populatedDiagnosis!.results,
        images: populatedDiagnosis!.images,
        crop: populatedDiagnosis!.crop,
        location: populatedDiagnosis!.location,
        createdAt: populatedDiagnosis!.createdAt,
        estimatedCompletionTime: diagnosis.status === DiagnosisStatus.PROCESSING ? 
          new Date(Date.now() + 30000) : // 30 seconds
          undefined,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get single diagnosis
export const getDiagnosis: GetDiagnosisController = async (req, res, ) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid diagnosis ID');
    }

    const diagnosis = await Diagnosis.findById(id)
      .populate('crop', 'name scientificName category')
      .populate('user', 'firstName lastName profileImage')
      .populate('results.disease', 'name scientificName symptoms treatmentOptions')
      .populate('expertReview.expert', 'firstName lastName profileImage credentials');

    if (!diagnosis) {
      throw new NotFoundError('Diagnosis not found');
    }

    // Check if user can access this diagnosis
    if (diagnosis.user._id.toString() !== userId && !diagnosis.shareAnonymous) {
      throw new AuthorizationError('You do not have permission to view this diagnosis');
    }

    logger.info('Diagnosis retrieved', {
      diagnosisId: id,
      userId,
      accessType: diagnosis.user._id.toString() === userId ? 'owner' : 'shared',
    });

    res.json({
      success: true,
      message: 'Diagnosis retrieved successfully',
      data: diagnosis,
    });
  } catch (error) {
    next(error);
  }
};

// List diagnoses for user
export const listDiagnoses: ListDiagnosesController = async (req, res, ) => {
  try {
    const userId = req.user.id;
    const {
      page = 1,
      limit = 10,
      status,
      cropId,
      startDate,
      endDate,
      urgencyLevel,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Build filter
    const filter: any = { user: userId, isDeleted: false };

    if (status) filter.status = status;
    if (cropId) filter.crop = cropId;
    if (urgencyLevel) filter.urgencyLevel = urgencyLevel;
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [diagnoses, total] = await Promise.all([
      Diagnosis.find(filter)
        .populate('crop', 'name scientificName')
        .populate('results.disease', 'name scientificName')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      Diagnosis.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / Number(limit));

    logger.info('Diagnoses listed', {
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
  } catch (error) {
    next(error);
  }
};

// Update diagnosis
export const updateDiagnosis: UpdateDiagnosisController = async (req, res, ) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { shareAnonymous, shareForResearch, tags } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid diagnosis ID');
    }

    const diagnosis = await Diagnosis.findOne({ _id: id, user: userId, isDeleted: false });
    if (!diagnosis) {
      throw new NotFoundError('Diagnosis not found');
    }

    // Update allowed fields
    if (shareAnonymous !== undefined) diagnosis.shareAnonymous = shareAnonymous;
    if (shareForResearch !== undefined) diagnosis.shareForResearch = shareForResearch;
    if (tags) diagnosis.tags = tags;

    await diagnosis.save();

    const updatedDiagnosis = await Diagnosis.findById(id)
      .populate('crop', 'name scientificName')
      .populate('results.disease', 'name scientificName');

    logger.info('Diagnosis updated', {
      diagnosisId: id,
      userId,
      updates: { shareAnonymous, shareForResearch, tagsCount: tags?.length },
    });

    res.json({
      success: true,
      message: 'Diagnosis updated successfully',
      data: updatedDiagnosis,
    });
  } catch (error) {
    next(error);
  }
};

// Submit feedback
export const submitFeedback: SubmitFeedbackController = async (req, res, ) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { rating, comment, isHelpful } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid diagnosis ID');
    }

    if (rating < 1 || rating > 5) {
      throw new ValidationError('Rating must be between 1 and 5');
    }

    const diagnosis = await Diagnosis.findOne({ _id: id, user: userId });
    if (!diagnosis) {
      throw new NotFoundError('Diagnosis not found');
    }

    if (diagnosis.status !== DiagnosisStatus.COMPLETED) {
      throw new BadRequestError('Can only provide feedback for completed diagnoses');
    }

    diagnosis.feedback = {
      rating,
      comment,
      isHelpful,
      submittedAt: new Date(),
    };

    await diagnosis.save();

    logger.info('Diagnosis feedback submitted', {
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
  } catch (error) {
    next(error);
  }
};

// Delete diagnosis
export const deleteDiagnosis: DeleteDiagnosisController = async (req, res, ) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid diagnosis ID');
    }

    const diagnosis = await Diagnosis.findOne({ _id: id, user: userId, isDeleted: false });
    if (!diagnosis) {
      throw new NotFoundError('Diagnosis not found');
    }

    diagnosis.isDeleted = true;
    diagnosis.deletedAt = new Date();
    await diagnosis.save();

    logger.info('Diagnosis deleted', {
      diagnosisId: id,
      userId,
    });

    res.json({
      success: true,
      message: 'Diagnosis deleted successfully',
      data: { message: 'Diagnosis deleted successfully' },
    });
  } catch (error) {
    next(error);
  }
};

// Retry failed diagnosis
export const retryDiagnosis: RetryDiagnosisController = async (req, res, ) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid diagnosis ID');
    }

    const diagnosis = await Diagnosis.findOne({ _id: id, user: userId });
    if (!diagnosis) {
      throw new NotFoundError('Diagnosis not found');
    }

    if (diagnosis.status !== DiagnosisStatus.FAILED) {
      throw new BadRequestError('Can only retry failed diagnoses');
    }

    // Reset diagnosis for retry
    diagnosis.status = DiagnosisStatus.PROCESSING;
    diagnosis.results = [];
    diagnosis.confidence = undefined;
    diagnosis.errorMessage = undefined;
    diagnosis.processedAt = undefined;
    await diagnosis.save();

    // TODO: Trigger AI processing again
    logger.info('Diagnosis retry initiated', {
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
  } catch (error) {
    next(error);
  }
};

export default {
  createDiagnosis,
  getDiagnosis,
  listDiagnoses,
  updateDiagnosis,
  submitFeedback,
  deleteDiagnosis,
  retryDiagnosis,
};