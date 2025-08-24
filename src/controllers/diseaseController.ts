import { Response, NextFunction } from 'express';
import { Disease } from '@/models/Disease';
import { Treatment } from '@/models/Treatment';
import { Crop } from '@/models/Crop';
import { logger } from '@/utils/logger';
import {
  NotFoundError,
  ValidationError,
  createErrorContext,
} from '@/utils/errors';
import { ApiResponse, PaginationResponse } from '@/types/common.types';
import {
  AuthenticatedRequest,
  GetAllDiseasesRequest,
  GetDiseaseRequest,
  CreateDiseaseRequest,
  UpdateDiseaseRequest,
  DeleteDiseaseRequest,
  SearchDiseasesRequest,
  GetDiseaseTreatmentsRequest,
  GetDiseaseStatsRequest,
  AddSymptomRequest,
  UpdateSymptomRequest,
  RemoveSymptomRequest,
  DiseaseResponse,
  DiseaseStatsResponse,
  SymptomResponse,
  GetAllDiseasesController,
  GetDiseaseController,
  CreateDiseaseController,
  UpdateDiseaseController,
  DeleteDiseaseController,
  SearchDiseasesController,
  GetDiseaseTreatmentsController,
  GetDiseaseStatsController,
  AddSymptomController,
  UpdateSymptomController,
  RemoveSymptomController,
} from './diseaseController.types';

export class DiseaseController {
  public getAllDiseases: GetAllDiseasesController = async (req, res, next) => {
    try {
      const {
        page = '1',
        limit = '10',
        sortBy = 'name',
        sortOrder = 'asc',
        severity,
        type,
        affectedCrops,
        season,
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

      if (severity) {
        filterQuery.severity = severity;
      }

      if (type) {
        filterQuery.type = type;
      }

      if (affectedCrops) {
        filterQuery.affectedCrops = { $in: [affectedCrops] };
      }

      if (season) {
        filterQuery.seasons = { $in: [season] };
      }

      // Build sort object
      const sortObj: any = {};
      sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Execute query
      const [diseases, total] = await Promise.all([
        Disease.find(filterQuery)
          .populate('affectedCrops', 'name scientificName category')
          .populate('treatments', 'name type description effectiveness')
          .sort(sortObj)
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Disease.countDocuments(filterQuery),
      ]);

      const pagination: PaginationResponse = {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPreviousPage: pageNum > 1,
      };

      logger.info('Diseases retrieved', {
        filters: { severity, type, affectedCrops, season },
        resultCount: diseases.length,
        requestId: (req as any).id,
      });

      const response: ApiResponse<DiseaseResponse[]> = {
        success: true,
        message: 'Diseases retrieved successfully',
        data: diseases as DiseaseResponse[],
      };

      res.json({ ...response, pagination });
    } catch (error) {
      next(error);
    }
  };

  public getDisease: GetDiseaseController = async (req, res, next) => {
    try {
      const { diseaseId } = req.params;

      const disease = await Disease.findById(diseaseId)
        .populate({
          path: 'affectedCrops',
          select: 'name scientificName category image',
        })
        .populate({
          path: 'treatments',
          select: 'name type description dosage applicationMethod effectiveness precautions',
        })
        .lean();

      if (!disease) {
        throw new NotFoundError('Disease not found', createErrorContext(req));
      }

      logger.info('Disease details retrieved', {
        diseaseId,
        diseaseName: disease.name,
        requestId: (req as any).id,
      });

      const response: ApiResponse<DiseaseResponse> = {
        success: true,
        message: 'Disease details retrieved successfully',
        data: disease as DiseaseResponse,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public createDisease: CreateDiseaseController = async (req, res, next) => {
    try {
      const diseaseData = req.body;

      // Check if disease already exists
      const existingDisease = await Disease.findOne({
        name: new RegExp(`^${diseaseData.name}$`, 'i'),
        scientificName: new RegExp(`^${diseaseData.scientificName}$`, 'i'),
      });

      if (existingDisease) {
        throw new ValidationError('Disease already exists', {
          name: ['A disease with this name or scientific name already exists'],
        }, createErrorContext(req));
      }

      const disease = new Disease({
        ...diseaseData,
        createdBy: req.user.id,
        createdAt: new Date(),
      });

      await disease.save();

      // Populate references for response
      await disease.populate('affectedCrops', 'name scientificName category');
      await disease.populate('treatments', 'name type description');

      logger.info('Disease created', {
        diseaseId: disease._id,
        diseaseName: disease.name,
        createdBy: req.user.id,
        requestId: (req as any).id,
      });

      const response: ApiResponse<DiseaseResponse> = {
        success: true,
        message: 'Disease created successfully',
        data: disease.toObject() as DiseaseResponse,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  public updateDisease: UpdateDiseaseController = async (req, res, next) => {
    try {
      const { diseaseId } = req.params;
      const updateData = req.body;

      // Check if disease exists
      const existingDisease = await Disease.findById(diseaseId);
      if (!existingDisease) {
        throw new NotFoundError('Disease not found', createErrorContext(req));
      }

      // Check for name conflicts if name is being updated
      if (updateData.name && updateData.name !== existingDisease.name) {
        const nameConflict = await Disease.findOne({
          _id: { $ne: diseaseId },
          name: new RegExp(`^${updateData.name}$`, 'i'),
        });

        if (nameConflict) {
          throw new ValidationError('Disease name already exists', {
            name: ['Another disease with this name already exists'],
          }, createErrorContext(req));
        }
      }

      const updatedDisease = await Disease.findByIdAndUpdate(
        diseaseId,
        {
          ...updateData,
          updatedAt: new Date(),
          updatedBy: req.user.id,
        },
        { new: true, runValidators: true }
      )
        .populate('affectedCrops', 'name scientificName category')
        .populate('treatments', 'name type description effectiveness');

      logger.info('Disease updated', {
        diseaseId,
        diseaseName: updatedDisease?.name,
        updatedBy: req.user.id,
        updatedFields: Object.keys(updateData),
        requestId: (req as any).id,
      });

      const response: ApiResponse<DiseaseResponse> = {
        success: true,
        message: 'Disease updated successfully',
        data: updatedDisease?.toObject() as DiseaseResponse,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public deleteDisease: DeleteDiseaseController = async (req, res, next) => {
    try {
      const { diseaseId } = req.params;

      const disease = await Disease.findById(diseaseId);
      if (!disease) {
        throw new NotFoundError('Disease not found', createErrorContext(req));
      }

      // Soft delete
      disease.isActive = false;
      disease.deletedAt = new Date();
      disease.deletedBy = req.user.id;
      await disease.save();

      logger.info('Disease deleted', {
        diseaseId,
        diseaseName: disease.name,
        deletedBy: req.user.id,
        requestId: (req as any).id,
      });

      const response: ApiResponse<{}> = {
        success: true,
        message: 'Disease deleted successfully',
        data: {},
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public searchDiseases: SearchDiseasesController = async (req, res, next) => {
    try {
      const {
        q,
        severity,
        type,
        affectedCrops,
        symptoms,
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
          { 'symptoms.description': new RegExp(q, 'i') },
          { commonNames: { $in: [new RegExp(q, 'i')] } },
        ];
      }

      if (severity) {
        searchQuery.severity = severity;
      }

      if (type) {
        searchQuery.type = type;
      }

      if (affectedCrops) {
        searchQuery.affectedCrops = { $in: [affectedCrops] };
      }

      if (symptoms) {
        searchQuery['symptoms.description'] = new RegExp(symptoms, 'i');
      }

      // Build sort object
      const sortObj: any = {};
      if (sortBy === 'relevance' && q) {
        sortObj.score = { $meta: 'textScore' };
      } else {
        sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;
      }

      // Execute search
      const [diseases, total] = await Promise.all([
        Disease.find(searchQuery)
          .select('name scientificName description severity type symptoms affectedCrops treatments image')
          .populate('affectedCrops', 'name scientificName')
          .populate('treatments', 'name type effectiveness')
          .sort(sortObj)
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Disease.countDocuments(searchQuery),
      ]);

      const pagination: PaginationResponse = {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPreviousPage: pageNum > 1,
      };

      logger.info('Diseases searched', {
        query: q,
        filters: { severity, type, affectedCrops, symptoms },
        resultCount: diseases.length,
        requestId: (req as any).id,
      });

      const response: ApiResponse<DiseaseResponse[]> = {
        success: true,
        message: 'Disease search completed successfully',
        data: diseases as DiseaseResponse[],
      };

      res.json({ ...response, pagination });
    } catch (error) {
      next(error);
    }
  };

  public getDiseaseTreatments: GetDiseaseTreatmentsController = async (req, res, next) => {
    try {
      const { diseaseId } = req.params;

      const disease = await Disease.findById(diseaseId)
        .populate({
          path: 'treatments',
          select: 'name type description dosage applicationMethod precautions effectiveness targetPests sideEffects',
        });

      if (!disease) {
        throw new NotFoundError('Disease not found', createErrorContext(req));
      }

      logger.info('Disease treatments retrieved', {
        diseaseId,
        diseaseName: disease.name,
        treatmentCount: disease.treatments.length,
        requestId: (req as any).id,
      });

      const response: ApiResponse<any[]> = {
        success: true,
        message: 'Disease treatments retrieved successfully',
        data: disease.treatments,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public getDiseaseStats: GetDiseaseStatsController = async (req, res, next) => {
    try {
      const stats = await Disease.aggregate([
        {
          $match: { isActive: true }
        },
        {
          $group: {
            _id: null,
            totalDiseases: { $sum: 1 },
            severityLevels: { $addToSet: '$severity' },
            diseaseTypes: { $addToSet: '$type' },
          }
        },
        {
          $project: {
            _id: 0,
            totalDiseases: 1,
            totalSeverityLevels: { $size: '$severityLevels' },
            totalDiseaseTypes: { $size: '$diseaseTypes' },
            severityLevels: 1,
            diseaseTypes: 1,
          }
        }
      ]);

      const severityStats = await Disease.aggregate([
        {
          $match: { isActive: true }
        },
        {
          $group: {
            _id: '$severity',
            count: { $sum: 1 },
            averageTreatments: { $avg: { $size: '$treatments' } },
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      const typeStats = await Disease.aggregate([
        {
          $match: { isActive: true }
        },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            averageSeverity: { $avg: 1 }, // Would need numeric severity mapping
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      const diseaseStats: DiseaseStatsResponse = {
        overview: stats[0] || {
          totalDiseases: 0,
          totalSeverityLevels: 0,
          totalDiseaseTypes: 0,
          severityLevels: [],
          diseaseTypes: [],
        },
        bySeverity: severityStats,
        byType: typeStats,
      };

      logger.info('Disease statistics retrieved', {
        totalDiseases: diseaseStats.overview.totalDiseases,
        requestId: (req as any).id,
      });

      const response: ApiResponse<DiseaseStatsResponse> = {
        success: true,
        message: 'Disease statistics retrieved successfully',
        data: diseaseStats,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public addSymptom: AddSymptomController = async (req, res, next) => {
    try {
      const { diseaseId } = req.params;
      const symptomData = req.body;

      const disease = await Disease.findById(diseaseId);
      if (!disease) {
        throw new NotFoundError('Disease not found', createErrorContext(req));
      }

      const newSymptom = {
        ...symptomData,
        id: Date.now().toString(), // Simple ID generation
        createdAt: new Date(),
        createdBy: req.user.id,
      };

      disease.symptoms.push(newSymptom);
      disease.updatedAt = new Date();
      disease.updatedBy = req.user.id;
      await disease.save();

      logger.info('Disease symptom added', {
        diseaseId,
        symptomDescription: symptomData.description,
        createdBy: req.user.id,
        requestId: (req as any).id,
      });

      const response: ApiResponse<SymptomResponse> = {
        success: true,
        message: 'Symptom added successfully',
        data: newSymptom as SymptomResponse,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  public updateSymptom: UpdateSymptomController = async (req, res, next) => {
    try {
      const { diseaseId, symptomId } = req.params;
      const updateData = req.body;

      const disease = await Disease.findById(diseaseId);
      if (!disease) {
        throw new NotFoundError('Disease not found', createErrorContext(req));
      }

      const symptomIndex = disease.symptoms.findIndex((symptom: any) =>
        symptom.id === symptomId
      );

      if (symptomIndex === -1) {
        throw new NotFoundError('Symptom not found', createErrorContext(req));
      }

      // Update symptom
      disease.symptoms[symptomIndex] = {
        ...disease.symptoms[symptomIndex],
        ...updateData,
        updatedAt: new Date(),
        updatedBy: req.user.id,
      };

      disease.updatedAt = new Date();
      disease.updatedBy = req.user.id;
      await disease.save();

      logger.info('Disease symptom updated', {
        diseaseId,
        symptomId,
        updatedBy: req.user.id,
        updatedFields: Object.keys(updateData),
        requestId: (req as any).id,
      });

      const response: ApiResponse<SymptomResponse> = {
        success: true,
        message: 'Symptom updated successfully',
        data: disease.symptoms[symptomIndex] as SymptomResponse,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public removeSymptom: RemoveSymptomController = async (req, res, next) => {
    try {
      const { diseaseId, symptomId } = req.params;

      const disease = await Disease.findById(diseaseId);
      if (!disease) {
        throw new NotFoundError('Disease not found', createErrorContext(req));
      }

      const symptomIndex = disease.symptoms.findIndex((symptom: any) =>
        symptom.id === symptomId
      );

      if (symptomIndex === -1) {
        throw new NotFoundError('Symptom not found', createErrorContext(req));
      }

      const removedSymptom = disease.symptoms[symptomIndex];
      disease.symptoms.splice(symptomIndex, 1);
      disease.updatedAt = new Date();
      disease.updatedBy = req.user.id;
      await disease.save();

      logger.info('Disease symptom removed', {
        diseaseId,
        symptomId,
        symptomDescription: removedSymptom.description,
        removedBy: req.user.id,
        requestId: (req as any).id,
      });

      const response: ApiResponse<{}> = {
        success: true,
        message: 'Symptom removed successfully',
        data: {},
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };
}

export default new DiseaseController();