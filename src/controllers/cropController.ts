import { Response, NextFunction } from 'express';
import { Crop } from '@/models/Crop';
import { Disease } from '@/models/Disease';
import { Treatment } from '@/models/Treatment';
import { logger } from '@/utils/logger';
import {
  NotFoundError,
  ValidationError,
  createErrorContext,
} from '@/utils/errors';
import { ApiResponse, PaginationResponse } from '@/types/common.types';
import {
  AuthenticatedRequest,
  GetAllCropsRequest,
  GetCropRequest,
  CreateCropRequest,
  UpdateCropRequest,
  DeleteCropRequest,
  SearchCropsRequest,
  GetCropDiseasesRequest,
  GetCropTreatmentsRequest,
  GetCropStatsRequest,
  AddCropVarietyRequest,
  UpdateCropVarietyRequest,
  DeleteCropVarietyRequest,
  CropResponse,
  CropStatsResponse,
  CropVarietyResponse,
  GetAllCropsController,
  GetCropController,
  CreateCropController,
  UpdateCropController,
  DeleteCropController,
  SearchCropsController,
  GetCropDiseasesController,
  GetCropTreatmentsController,
  GetCropStatsController,
  AddCropVarietyController,
  UpdateCropVarietyController,
  DeleteCropVarietyController,
} from './cropController.types';

export class CropController {
  public getAllCrops: GetAllCropsController = async (req, res, next) => {
    try {
      const {
        page = '1',
        limit = '10',
        sortBy = 'name',
        sortOrder = 'asc',
        category,
        season,
        region,
        growthDuration,
        isActive = 'true',
      } = req.query;

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      // Build filter query
      const filterQuery: any = {};
      
      if (isActive === 'true') {
        filterQuery.isActive = true;
      } else if (isActive === 'false') {
        filterQuery.isActive = false;
      }

      if (category) {
        filterQuery.category = category;
      }

      if (season) {
        filterQuery.seasons = { $in: [season] };
      }

      if (region) {
        filterQuery.regions = { $in: [region] };
      }

      if (growthDuration) {
        const duration = parseInt(growthDuration, 10);
        filterQuery.growthDuration = { $lte: duration };
      }

      // Build sort object
      const sortObj: any = {};
      sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Execute query
      const [crops, total] = await Promise.all([
        Crop.find(filterQuery)
          .populate('diseases', 'name severity description symptoms')
          .sort(sortObj)
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Crop.countDocuments(filterQuery),
      ]);

      const pagination: PaginationResponse = {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPreviousPage: pageNum > 1,
      };

      logger.info('Crops retrieved', {
        filters: { category, season, region, growthDuration },
        resultCount: crops.length,
        requestId: (req as any).id,
      });

      const response: ApiResponse<CropResponse[]> = {
        success: true,
        message: 'Crops retrieved successfully',
        data: crops as CropResponse[],
      };

      res.json({ ...response, pagination });
    } catch (error) {
      next(error);
    }
  };

  public getCrop: GetCropController = async (req, res, next) => {
    try {
      const { cropId } = req.params;

      const crop = await Crop.findById(cropId)
        .populate({
          path: 'diseases',
          select: 'name severity description symptoms treatments',
          populate: {
            path: 'treatments',
            select: 'name type description dosage applicationMethod',
          }
        })
        .populate('varieties', 'name description characteristics averageYield')
        .lean();

      if (!crop) {
        throw new NotFoundError('Crop not found', createErrorContext(req));
      }

      logger.info('Crop details retrieved', {
        cropId,
        cropName: crop.name,
        requestId: (req as any).id,
      });

      const response: ApiResponse<CropResponse> = {
        success: true,
        message: 'Crop details retrieved successfully',
        data: crop as CropResponse,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public searchCrops: SearchCropsController = async (req, res, next) => {
    try {
      const { q, category, family, season } = req.query;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      // Build search query
      const searchQuery: any = { isActive: true };

      if (q) {
        searchQuery.$or = [
          { name: { $regex: q, $options: 'i' } },
          { scientificName: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } },
          { 'varieties.name': { $regex: q, $options: 'i' } },
        ];
      }

      if (category) {
        searchQuery.category = category;
      }

      if (family) {
        searchQuery.family = family;
      }

      if (season) {
        searchQuery.seasons = { $in: [season] };
      }

      const [crops, total] = await Promise.all([
        Crop.find(searchQuery)
          .select('name scientificName category family description growthDuration seasons varieties')
          .skip(skip)
          .limit(limit)
          .sort({ name: 1 }),
        Crop.countDocuments(searchQuery)
      ]);

      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      const pagination: PaginationResponse = {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage,
        hasPrevPage,
      };

      logger.info('Crops searched', {
        query: q,
        filters: { category, family, season },
        resultCount: crops.length,
        requestId: (req as any).id,
      });

      const response: ApiResponse<CropResponse[]> = {
        success: true,
        message: 'Crops searched successfully',
        data: crops as CropResponse[],
        pagination,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public createCrop: CreateCropController = async (req, res, next) => {
    try {
      const cropData = req.body;

      // Check if crop already exists
      const existingCrop = await Crop.findOne({
        name: new RegExp(`^${cropData.name}$`, 'i'),
        scientificName: new RegExp(`^${cropData.scientificName}$`, 'i'),
      });

      if (existingCrop) {
        throw new ValidationError('Crop already exists', {
          name: ['A crop with this name or scientific name already exists'],
        }, createErrorContext(req));
      }

      const crop = new Crop({
        ...cropData,
        createdBy: req.user.id,
        createdAt: new Date(),
      });

      await crop.save();

      logger.info('Crop created', {
        cropId: crop._id,
        cropName: crop.name,
        createdBy: req.user.id,
        requestId: (req as any).id,
      });

      const response: ApiResponse<CropResponse> = {
        success: true,
        message: 'Crop created successfully',
        data: crop.toObject() as CropResponse,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  public updateCrop: UpdateCropController = async (req, res, next) => {
    try {
      const { cropId } = req.params;
      const updateData = req.body;

      // Check if crop exists
      const existingCrop = await Crop.findById(cropId);
      if (!existingCrop) {
        throw new NotFoundError('Crop not found', createErrorContext(req));
      }

      // Check for name conflicts if name is being updated
      if (updateData.name && updateData.name !== existingCrop.name) {
        const nameConflict = await Crop.findOne({
          _id: { $ne: cropId },
          name: new RegExp(`^${updateData.name}$`, 'i'),
        });

        if (nameConflict) {
          throw new ValidationError('Crop name already exists', {
            name: ['Another crop with this name already exists'],
          }, createErrorContext(req));
        }
      }

      const updatedCrop = await Crop.findByIdAndUpdate(
        cropId,
        {
          ...updateData,
          updatedAt: new Date(),
          updatedBy: req.user.id,
        },
        { new: true, runValidators: true }
      ).populate('diseases', 'name severity description');

      logger.info('Crop updated', {
        cropId,
        cropName: updatedCrop?.name,
        updatedBy: req.user.id,
        updatedFields: Object.keys(updateData),
        requestId: (req as any).id,
      });

      const response: ApiResponse<CropResponse> = {
        success: true,
        message: 'Crop updated successfully',
        data: updatedCrop?.toObject() as CropResponse,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public deleteCrop: DeleteCropController = async (req, res, next) => {
    try {
      const { cropId } = req.params;

      const crop = await Crop.findById(cropId);
      if (!crop) {
        throw new NotFoundError('Crop not found', createErrorContext(req));
      }

      // Soft delete
      crop.isActive = false;
      crop.deletedAt = new Date();
      crop.deletedBy = req.user.id;
      await crop.save();

      logger.info('Crop deleted', {
        cropId,
        cropName: crop.name,
        deletedBy: req.user.id,
        requestId: (req as any).id,
      });

      const response: ApiResponse<{}> = {
        success: true,
        message: 'Crop deleted successfully',
        data: {},
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public searchCrops: SearchCropsController = async (req, res, next) => {
    try {
      const {
        q,
        category,
        season,
        region,
        minGrowthDuration,
        maxGrowthDuration,
        page = '1',
        limit = '10',
        sortBy = 'relevance',
        sortOrder = 'desc',
      } = req.query;

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      // Build search query
      const searchQuery: any = {
        isActive: true,
      };

      if (q) {
        searchQuery.$or = [
          { name: new RegExp(q, 'i') },
          { scientificName: new RegExp(q, 'i') },
          { description: new RegExp(q, 'i') },
          { commonNames: { $in: [new RegExp(q, 'i')] } },
        ];
      }

      if (category) {
        searchQuery.category = category;
      }

      if (season) {
        searchQuery.seasons = { $in: [season] };
      }

      if (region) {
        searchQuery.regions = { $in: [region] };
      }

      if (minGrowthDuration || maxGrowthDuration) {
        searchQuery.growthDuration = {};
        if (minGrowthDuration) {
          searchQuery.growthDuration.$gte = parseInt(minGrowthDuration, 10);
        }
        if (maxGrowthDuration) {
          searchQuery.growthDuration.$lte = parseInt(maxGrowthDuration, 10);
        }
      }

      // Build sort object
      const sortObj: any = {};
      if (sortBy === 'relevance' && q) {
        sortObj.score = { $meta: 'textScore' };
      } else {
        sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;
      }

      // Execute search
      const [crops, total] = await Promise.all([
        Crop.find(searchQuery)
          .select('name scientificName description category seasons regions growthDuration image varieties diseases')
          .populate('diseases', 'name severity')
          .sort(sortObj)
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Crop.countDocuments(searchQuery),
      ]);

      const pagination: PaginationResponse = {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPreviousPage: pageNum > 1,
      };

      logger.info('Crops searched', {
        query: q,
        filters: { category, season, region, minGrowthDuration, maxGrowthDuration },
        resultCount: crops.length,
        requestId: (req as any).id,
      });

      const response: ApiResponse<CropResponse[]> = {
        success: true,
        message: 'Crop search completed successfully',
        data: crops as CropResponse[],
      };

      res.json({ ...response, pagination });
    } catch (error) {
      next(error);
    }
  };

  public getCropDiseases: GetCropDiseasesController = async (req, res, next) => {
    try {
      const { cropId } = req.params;

      const crop = await Crop.findById(cropId)
        .populate({
          path: 'diseases',
          select: 'name severity description symptoms treatments preventiveMeasures',
          populate: {
            path: 'treatments',
            select: 'name type description effectiveness',
          }
        });

      if (!crop) {
        throw new NotFoundError('Crop not found', createErrorContext(req));
      }

      logger.info('Crop diseases retrieved', {
        cropId,
        cropName: crop.name,
        diseaseCount: crop.diseases.length,
        requestId: (req as any).id,
      });

      const response: ApiResponse<any[]> = {
        success: true,
        message: 'Crop diseases retrieved successfully',
        data: crop.diseases,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public getCropTreatments: GetCropTreatmentsController = async (req, res, next) => {
    try {
      const { cropId } = req.params;

      const crop = await Crop.findById(cropId)
        .populate({
          path: 'diseases',
          populate: {
            path: 'treatments',
            select: 'name type description dosage applicationMethod precautions effectiveness',
          }
        });

      if (!crop) {
        throw new NotFoundError('Crop not found', createErrorContext(req));
      }

      // Flatten treatments from all diseases
      const treatments = crop.diseases.reduce((acc: any[], disease: any) => {
        return acc.concat(disease.treatments || []);
      }, []);

      // Remove duplicates based on treatment ID
      const uniqueTreatments = treatments.filter((treatment, index, self) => 
        index === self.findIndex(t => t._id.toString() === treatment._id.toString())
      );

      logger.info('Crop treatments retrieved', {
        cropId,
        cropName: crop.name,
        treatmentCount: uniqueTreatments.length,
        requestId: (req as any).id,
      });

      const response: ApiResponse<any[]> = {
        success: true,
        message: 'Crop treatments retrieved successfully',
        data: uniqueTreatments,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public getCropStats: GetCropStatsController = async (req, res, next) => {
    try {
      const stats = await Crop.aggregate([
        {
          $match: { isActive: true }
        },
        {
          $group: {
            _id: null,
            totalCrops: { $sum: 1 },
            categories: { $addToSet: '$category' },
            averageGrowthDuration: { $avg: '$growthDuration' },
          }
        },
        {
          $project: {
            _id: 0,
            totalCrops: 1,
            totalCategories: { $size: '$categories' },
            categories: 1,
            averageGrowthDuration: { $round: ['$averageGrowthDuration', 1] },
          }
        }
      ]);

      const categoryStats = await Crop.aggregate([
        {
          $match: { isActive: true }
        },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            averageGrowthDuration: { $avg: '$growthDuration' },
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      const cropStats: CropStatsResponse = {
        overview: stats[0] || {
          totalCrops: 0,
          totalCategories: 0,
          categories: [],
          averageGrowthDuration: 0,
        },
        byCategory: categoryStats,
      };

      logger.info('Crop statistics retrieved', {
        totalCrops: cropStats.overview.totalCrops,
        requestId: (req as any).id,
      });

      const response: ApiResponse<CropStatsResponse> = {
        success: true,
        message: 'Crop statistics retrieved successfully',
        data: cropStats,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public addCropVariety: AddCropVarietyController = async (req, res, next) => {
    try {
      const { cropId } = req.params;
      const varietyData = req.body;

      const crop = await Crop.findById(cropId);
      if (!crop) {
        throw new NotFoundError('Crop not found', createErrorContext(req));
      }

      // Check if variety already exists for this crop
      const existingVariety = crop.varieties.find((variety: any) =>
        variety.name.toLowerCase() === varietyData.name.toLowerCase()
      );

      if (existingVariety) {
        throw new ValidationError('Variety already exists', {
          name: ['A variety with this name already exists for this crop'],
        }, createErrorContext(req));
      }

      const newVariety = {
        ...varietyData,
        id: Date.now().toString(), // Simple ID generation
        createdAt: new Date(),
        createdBy: req.user.id,
      };

      crop.varieties.push(newVariety);
      crop.updatedAt = new Date();
      crop.updatedBy = req.user.id;
      await crop.save();

      logger.info('Crop variety added', {
        cropId,
        varietyName: varietyData.name,
        createdBy: req.user.id,
        requestId: (req as any).id,
      });

      const response: ApiResponse<CropVarietyResponse> = {
        success: true,
        message: 'Crop variety added successfully',
        data: newVariety as CropVarietyResponse,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  public updateCropVariety: UpdateCropVarietyController = async (req, res, next) => {
    try {
      const { cropId, varietyId } = req.params;
      const updateData = req.body;

      const crop = await Crop.findById(cropId);
      if (!crop) {
        throw new NotFoundError('Crop not found', createErrorContext(req));
      }

      const varietyIndex = crop.varieties.findIndex((variety: any) =>
        variety.id === varietyId
      );

      if (varietyIndex === -1) {
        throw new NotFoundError('Variety not found', createErrorContext(req));
      }

      // Update variety
      crop.varieties[varietyIndex] = {
        ...crop.varieties[varietyIndex],
        ...updateData,
        updatedAt: new Date(),
        updatedBy: req.user.id,
      };

      crop.updatedAt = new Date();
      crop.updatedBy = req.user.id;
      await crop.save();

      logger.info('Crop variety updated', {
        cropId,
        varietyId,
        updatedBy: req.user.id,
        updatedFields: Object.keys(updateData),
        requestId: (req as any).id,
      });

      const response: ApiResponse<CropVarietyResponse> = {
        success: true,
        message: 'Crop variety updated successfully',
        data: crop.varieties[varietyIndex] as CropVarietyResponse,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public deleteCropVariety: DeleteCropVarietyController = async (req, res, next) => {
    try {
      const { cropId, varietyId } = req.params;

      const crop = await Crop.findById(cropId);
      if (!crop) {
        throw new NotFoundError('Crop not found', createErrorContext(req));
      }

      const varietyIndex = crop.varieties.findIndex((variety: any) =>
        variety.id === varietyId
      );

      if (varietyIndex === -1) {
        throw new NotFoundError('Variety not found', createErrorContext(req));
      }

      const deletedVariety = crop.varieties[varietyIndex];
      crop.varieties.splice(varietyIndex, 1);
      crop.updatedAt = new Date();
      crop.updatedBy = req.user.id;
      await crop.save();

      logger.info('Crop variety deleted', {
        cropId,
        varietyId,
        varietyName: deletedVariety.name,
        deletedBy: req.user.id,
        requestId: (req as any).id,
      });

      const response: ApiResponse<{}> = {
        success: true,
        message: 'Crop variety deleted successfully',
        data: {},
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };
}

export default new CropController();