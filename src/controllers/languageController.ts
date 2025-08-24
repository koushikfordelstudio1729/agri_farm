import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Language } from '@/models/Language';
import { Translation } from '@/models/Translation';
import { User } from '@/models/User';
import { logger } from '@/utils/logger';
import {
  NotFoundError,
  ValidationError,
  AuthorizationError,
  createErrorContext,
} from '@/utils/errors';
import { ApiResponse, PaginationResponse } from '@/types/common.types';
import {
  AuthenticatedRequest,
  GetLanguagesRequest,
  GetLanguageRequest,
  CreateLanguageRequest,
  UpdateLanguageRequest,
  DeleteLanguageRequest,
  GetTranslationsRequest,
  GetTranslationKeysRequest,
  UpdateTranslationRequest,
  BulkUpdateTranslationsRequest,
  ImportTranslationsRequest,
  ExportTranslationsRequest,
  GetTranslationStatsRequest,
  SetUserLanguageRequest,
  GetMissingTranslationsRequest,
  ValidateTranslationsRequest,
  LanguageResponse,
  TranslationResponse,
  TranslationKeysResponse,
  TranslationStatsResponse,
  ValidationResultResponse,
  GetLanguagesController,
  GetLanguageController,
  CreateLanguageController,
  UpdateLanguageController,
  DeleteLanguageController,
  GetTranslationsController,
  GetTranslationKeysController,
  UpdateTranslationController,
  BulkUpdateTranslationsController,
  ImportTranslationsController,
  ExportTranslationsController,
  GetTranslationStatsController,
  SetUserLanguageController,
  GetMissingTranslationsController,
  ValidateTranslationsController,
} from './languageController.types';

export class LanguageController {
  public getLanguages: GetLanguagesController = async (req, res, next) => {
    try {
      const { isActive, isRTL, region } = req.query;

      // Build filter query
      const filterQuery: any = {};
      
      if (isActive !== undefined) {
        filterQuery.isActive = isActive === 'true';
      }

      if (isRTL !== undefined) {
        filterQuery.isRTL = isRTL === 'true';
      }

      if (region) {
        filterQuery.regions = { $in: [region] };
      }

      const languages = await Language.find(filterQuery)
        .sort({ displayOrder: 1, name: 1 })
        .lean();

      logger.info('Languages retrieved', {
        userId: req.user?.id || 'anonymous',
        filters: { isActive, isRTL, region },
        resultCount: languages.length,
        requestId: (req as any).id,
      });

      const response: ApiResponse<LanguageResponse[]> = {
        success: true,
        message: 'Languages retrieved successfully',
        data: languages as LanguageResponse[],
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public getLanguage: GetLanguageController = async (req, res, next) => {
    try {
      const { languageCode } = req.params;

      const language = await Language.findOne({ code: languageCode })
        .lean();

      if (!language) {
        throw new NotFoundError('Language not found', createErrorContext(req));
      }

      // Get translation completeness
      const totalKeys = await Translation.countDocuments({ 
        language: 'en' // Base language
      });
      
      const translatedKeys = await Translation.countDocuments({
        language: languageCode,
        value: { $ne: '' }
      });

      const completeness = totalKeys > 0 ? Math.round((translatedKeys / totalKeys) * 100) : 0;

      const languageWithStats = {
        ...language,
        statistics: {
          totalKeys,
          translatedKeys,
          completeness,
          lastUpdated: await this.getLastTranslationUpdate(languageCode),
        },
      };

      logger.info('Language details retrieved', {
        languageCode,
        userId: req.user?.id || 'anonymous',
        completeness,
        requestId: (req as any).id,
      });

      const response: ApiResponse<LanguageResponse> = {
        success: true,
        message: 'Language details retrieved successfully',
        data: languageWithStats as LanguageResponse,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public createLanguage: CreateLanguageController = async (req, res, next) => {
    try {
      const {
        code,
        name,
        nativeName,
        isRTL = false,
        regions = [],
        displayOrder,
        flag,
        isActive = true,
      } = req.body;

      // Check if language already exists
      const existingLanguage = await Language.findOne({ code });
      if (existingLanguage) {
        throw new ValidationError('Language already exists', {
          code: ['A language with this code already exists'],
        }, createErrorContext(req));
      }

      const language = new Language({
        code,
        name,
        nativeName,
        isRTL,
        regions,
        displayOrder: displayOrder || (await Language.countDocuments()) + 1,
        flag,
        isActive,
        createdBy: req.user.id,
        createdAt: new Date(),
      });

      await language.save();

      // Copy base translations (English) for the new language
      await this.createBaseTranslations(code);

      logger.info('Language created', {
        languageId: language._id.toString(),
        languageCode: code,
        languageName: name,
        createdBy: req.user.id,
        requestId: (req as any).id,
      });

      const response: ApiResponse<LanguageResponse> = {
        success: true,
        message: 'Language created successfully',
        data: language.toObject() as LanguageResponse,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  public updateLanguage: UpdateLanguageController = async (req, res, next) => {
    try {
      const { languageId } = req.params;
      const updateData = req.body;

      if (!mongoose.Types.ObjectId.isValid(languageId)) {
        throw new ValidationError('Invalid language ID');
      }

      // Check if updating code and it conflicts
      if (updateData.code) {
        const existingLanguage = await Language.findOne({
          code: updateData.code,
          _id: { $ne: languageId },
        });

        if (existingLanguage) {
          throw new ValidationError('Language code already exists', {
            code: ['Another language with this code already exists'],
          }, createErrorContext(req));
        }
      }

      const updatedLanguage = await Language.findByIdAndUpdate(
        languageId,
        {
          ...updateData,
          updatedBy: req.user.id,
          updatedAt: new Date(),
        },
        { new: true, runValidators: true }
      );

      if (!updatedLanguage) {
        throw new NotFoundError('Language not found', createErrorContext(req));
      }

      logger.info('Language updated', {
        languageId,
        languageCode: updatedLanguage.code,
        updatedBy: req.user.id,
        updatedFields: Object.keys(updateData),
        requestId: (req as any).id,
      });

      const response: ApiResponse<LanguageResponse> = {
        success: true,
        message: 'Language updated successfully',
        data: updatedLanguage.toObject() as LanguageResponse,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public deleteLanguage: DeleteLanguageController = async (req, res, next) => {
    try {
      const { languageId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(languageId)) {
        throw new ValidationError('Invalid language ID');
      }

      const language = await Language.findById(languageId);
      if (!language) {
        throw new NotFoundError('Language not found', createErrorContext(req));
      }

      // Prevent deletion of English (base language)
      if (language.code === 'en') {
        throw new ValidationError('Cannot delete the base language');
      }

      // Check if language is in use by users
      const usersCount = await User.countDocuments({ preferredLanguage: language.code });
      if (usersCount > 0) {
        throw new ValidationError(`Cannot delete language: ${usersCount} users are using this language`);
      }

      // Soft delete
      language.isActive = false;
      language.deletedAt = new Date();
      language.deletedBy = req.user.id;
      await language.save();

      // Also mark translations as inactive
      await Translation.updateMany(
        { language: language.code },
        {
          isActive: false,
          deletedAt: new Date(),
          deletedBy: req.user.id,
        }
      );

      logger.info('Language deleted', {
        languageId,
        languageCode: language.code,
        deletedBy: req.user.id,
        requestId: (req as any).id,
      });

      const response: ApiResponse<{}> = {
        success: true,
        message: 'Language deleted successfully',
        data: {},
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public getTranslations: GetTranslationsController = async (req, res, next) => {
    try {
      const { languageCode } = req.params;
      const {
        category,
        namespace,
        search,
        isTranslated,
        page = '1',
        limit = '50',
      } = req.query;

      // Verify language exists
      const language = await Language.findOne({ code: languageCode });
      if (!language) {
        throw new NotFoundError('Language not found', createErrorContext(req));
      }

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      // Build filter query
      const filterQuery: any = {
        language: languageCode,
        isActive: true,
      };

      if (category) filterQuery.category = category;
      if (namespace) filterQuery.namespace = namespace;
      
      if (search) {
        filterQuery.$or = [
          { key: new RegExp(search as string, 'i') },
          { value: new RegExp(search as string, 'i') },
          { description: new RegExp(search as string, 'i') },
        ];
      }

      if (isTranslated !== undefined) {
        if (isTranslated === 'true') {
          filterQuery.value = { $ne: '' };
        } else {
          filterQuery.value = '';
        }
      }

      // Execute query
      const [translations, total] = await Promise.all([
        Translation.find(filterQuery)
          .sort({ namespace: 1, key: 1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Translation.countDocuments(filterQuery),
      ]);

      const pagination: PaginationResponse = {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPreviousPage: pageNum > 1,
      };

      logger.info('Translations retrieved', {
        languageCode,
        userId: req.user?.id || 'anonymous',
        filters: { category, namespace, search, isTranslated },
        resultCount: translations.length,
        requestId: (req as any).id,
      });

      const response: ApiResponse<TranslationResponse[]> = {
        success: true,
        message: 'Translations retrieved successfully',
        data: translations as TranslationResponse[],
      };

      res.json({ ...response, pagination });
    } catch (error) {
      next(error);
    }
  };

  public getTranslationKeys: GetTranslationKeysController = async (req, res, next) => {
    try {
      const { languageCode } = req.params;
      const { format = 'nested' } = req.query;

      // Verify language exists
      const language = await Language.findOne({ code: languageCode });
      if (!language) {
        throw new NotFoundError('Language not found', createErrorContext(req));
      }

      const translations = await Translation.find({
        language: languageCode,
        isActive: true,
      })
        .select('key value namespace category')
        .lean();

      let formattedTranslations: any;

      if (format === 'flat') {
        // Flat key-value pairs
        formattedTranslations = translations.reduce((acc, translation) => {
          acc[translation.key] = translation.value;
          return acc;
        }, {} as { [key: string]: string });
      } else {
        // Nested object structure
        formattedTranslations = this.buildNestedTranslations(translations);
      }

      const translationKeys: TranslationKeysResponse = {
        language: languageCode,
        format: format as 'flat' | 'nested',
        translations: formattedTranslations,
        totalKeys: translations.length,
        translatedKeys: translations.filter(t => t.value && t.value.trim() !== '').length,
        lastUpdated: await this.getLastTranslationUpdate(languageCode),
      };

      logger.info('Translation keys retrieved', {
        languageCode,
        format,
        totalKeys: translationKeys.totalKeys,
        translatedKeys: translationKeys.translatedKeys,
        requestId: (req as any).id,
      });

      const response: ApiResponse<TranslationKeysResponse> = {
        success: true,
        message: 'Translation keys retrieved successfully',
        data: translationKeys,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public updateTranslation: UpdateTranslationController = async (req, res, next) => {
    try {
      const { translationId } = req.params;
      const { value, description } = req.body;

      if (!mongoose.Types.ObjectId.isValid(translationId)) {
        throw new ValidationError('Invalid translation ID');
      }

      const translation = await Translation.findById(translationId);
      if (!translation) {
        throw new NotFoundError('Translation not found', createErrorContext(req));
      }

      // Update translation
      translation.value = value;
      if (description !== undefined) translation.description = description;
      translation.updatedBy = req.user.id;
      translation.updatedAt = new Date();

      await translation.save();

      logger.info('Translation updated', {
        translationId,
        key: translation.key,
        language: translation.language,
        updatedBy: req.user.id,
        requestId: (req as any).id,
      });

      const response: ApiResponse<TranslationResponse> = {
        success: true,
        message: 'Translation updated successfully',
        data: translation.toObject() as TranslationResponse,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public bulkUpdateTranslations: BulkUpdateTranslationsController = async (req, res, next) => {
    try {
      const { languageCode } = req.params;
      const { translations } = req.body;

      // Verify language exists
      const language = await Language.findOne({ code: languageCode });
      if (!language) {
        throw new NotFoundError('Language not found', createErrorContext(req));
      }

      const updatePromises = translations.map(async (item: { key: string; value: string }) => {
        return Translation.findOneAndUpdate(
          {
            language: languageCode,
            key: item.key,
            isActive: true,
          },
          {
            value: item.value,
            updatedBy: req.user.id,
            updatedAt: new Date(),
          },
          { new: true, upsert: true }
        );
      });

      const updatedTranslations = await Promise.all(updatePromises);

      logger.info('Bulk translations updated', {
        languageCode,
        updatedCount: updatedTranslations.length,
        updatedBy: req.user.id,
        requestId: (req as any).id,
      });

      const response: ApiResponse<{ updatedCount: number }> = {
        success: true,
        message: 'Translations updated successfully',
        data: {
          updatedCount: updatedTranslations.length,
        },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public importTranslations: ImportTranslationsController = async (req, res, next) => {
    try {
      const { languageCode } = req.params;
      const { translations, format = 'json', overwrite = false } = req.body;

      // Verify language exists
      const language = await Language.findOne({ code: languageCode });
      if (!language) {
        throw new NotFoundError('Language not found', createErrorContext(req));
      }

      let parsedTranslations: { [key: string]: string };

      try {
        if (format === 'json') {
          parsedTranslations = typeof translations === 'string' ? 
            JSON.parse(translations) : translations;
        } else {
          // Handle other formats (CSV, XLSX, etc.)
          throw new ValidationError('Unsupported format');
        }
      } catch (parseError) {
        throw new ValidationError('Invalid translation data format');
      }

      // Flatten nested objects to dot notation keys
      const flatTranslations = this.flattenTranslations(parsedTranslations);

      let imported = 0;
      let updated = 0;
      let skipped = 0;

      for (const [key, value] of Object.entries(flatTranslations)) {
        const existingTranslation = await Translation.findOne({
          language: languageCode,
          key,
          isActive: true,
        });

        if (existingTranslation) {
          if (overwrite || !existingTranslation.value) {
            existingTranslation.value = value;
            existingTranslation.updatedBy = req.user.id;
            existingTranslation.updatedAt = new Date();
            await existingTranslation.save();
            updated++;
          } else {
            skipped++;
          }
        } else {
          await Translation.create({
            language: languageCode,
            key,
            value,
            namespace: this.extractNamespace(key),
            category: this.extractCategory(key),
            createdBy: req.user.id,
            createdAt: new Date(),
          });
          imported++;
        }
      }

      logger.info('Translations imported', {
        languageCode,
        imported,
        updated,
        skipped,
        format,
        overwrite,
        importedBy: req.user.id,
        requestId: (req as any).id,
      });

      const response: ApiResponse<{
        imported: number;
        updated: number;
        skipped: number;
      }> = {
        success: true,
        message: 'Translations imported successfully',
        data: { imported, updated, skipped },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public exportTranslations: ExportTranslationsController = async (req, res, next) => {
    try {
      const { languageCode } = req.params;
      const { format = 'json', includeEmpty = false } = req.query;

      // Verify language exists
      const language = await Language.findOne({ code: languageCode });
      if (!language) {
        throw new NotFoundError('Language not found', createErrorContext(req));
      }

      const filterQuery: any = {
        language: languageCode,
        isActive: true,
      };

      if (!includeEmpty) {
        filterQuery.value = { $ne: '' };
      }

      const translations = await Translation.find(filterQuery)
        .select('key value namespace category')
        .lean();

      let exportData: any;
      let contentType: string;
      let filename: string;

      if (format === 'json') {
        const flatTranslations = translations.reduce((acc, translation) => {
          acc[translation.key] = translation.value;
          return acc;
        }, {} as { [key: string]: string });

        exportData = JSON.stringify(this.buildNestedTranslations(translations), null, 2);
        contentType = 'application/json';
        filename = `translations_${languageCode}.json`;
      } else if (format === 'csv') {
        const csvHeaders = 'Key,Value,Namespace,Category\n';
        const csvRows = translations.map(t => 
          `"${t.key}","${t.value}","${t.namespace}","${t.category}"`
        ).join('\n');
        exportData = csvHeaders + csvRows;
        contentType = 'text/csv';
        filename = `translations_${languageCode}.csv`;
      } else {
        throw new ValidationError('Unsupported export format');
      }

      logger.info('Translations exported', {
        languageCode,
        format,
        includeEmpty,
        translationCount: translations.length,
        exportedBy: req.user?.id || 'anonymous',
        requestId: (req as any).id,
      });

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(exportData);
    } catch (error) {
      next(error);
    }
  };

  public getTranslationStats: GetTranslationStatsController = async (req, res, next) => {
    try {
      const stats = await Language.aggregate([
        {
          $match: { isActive: true }
        },
        {
          $lookup: {
            from: 'translations',
            localField: 'code',
            foreignField: 'language',
            as: 'translations'
          }
        },
        {
          $project: {
            code: 1,
            name: 1,
            nativeName: 1,
            totalKeys: { $size: '$translations' },
            translatedKeys: {
              $size: {
                $filter: {
                  input: '$translations',
                  cond: { $ne: ['$$this.value', ''] }
                }
              }
            },
            completeness: {
              $cond: {
                if: { $gt: [{ $size: '$translations' }, 0] },
                then: {
                  $multiply: [
                    {
                      $divide: [
                        {
                          $size: {
                            $filter: {
                              input: '$translations',
                              cond: { $ne: ['$$this.value', ''] }
                            }
                          }
                        },
                        { $size: '$translations' }
                      ]
                    },
                    100
                  ]
                },
                else: 0
              }
            }
          }
        },
        {
          $sort: { completeness: -1, name: 1 }
        }
      ]);

      const overallStats = await Translation.aggregate([
        {
          $match: { isActive: true }
        },
        {
          $group: {
            _id: null,
            totalKeys: { $sum: 1 },
            translatedKeys: {
              $sum: { $cond: [{ $ne: ['$value', ''] }, 1, 0] }
            },
            languages: { $addToSet: '$language' },
          }
        }
      ]);

      const translationStats: TranslationStatsResponse = {
        overview: overallStats[0] || {
          totalKeys: 0,
          translatedKeys: 0,
          languages: [],
        },
        byLanguage: stats,
        lastUpdated: new Date(),
      };

      logger.info('Translation statistics retrieved', {
        userId: req.user?.id || 'anonymous',
        languageCount: stats.length,
        totalKeys: translationStats.overview.totalKeys,
        requestId: (req as any).id,
      });

      const response: ApiResponse<TranslationStatsResponse> = {
        success: true,
        message: 'Translation statistics retrieved successfully',
        data: translationStats,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public setUserLanguage: SetUserLanguageController = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { languageCode } = req.body;

      // Verify language exists and is active
      const language = await Language.findOne({ 
        code: languageCode, 
        isActive: true 
      });
      
      if (!language) {
        throw new NotFoundError('Language not found or not available', createErrorContext(req));
      }

      // Update user's preferred language
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { preferredLanguage: languageCode },
        { new: true }
      ).select('preferredLanguage firstName lastName');

      logger.info('User language updated', {
        userId,
        previousLanguage: req.user.preferredLanguage,
        newLanguage: languageCode,
        requestId: (req as any).id,
      });

      const response: ApiResponse<{
        language: string;
        languageDisplayName: string;
      }> = {
        success: true,
        message: 'Language preference updated successfully',
        data: {
          language: languageCode,
          languageDisplayName: language.name,
        },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public getMissingTranslations: GetMissingTranslationsController = async (req, res, next) => {
    try {
      const { languageCode } = req.params;
      const { category, namespace } = req.query;

      // Verify language exists
      const language = await Language.findOne({ code: languageCode });
      if (!language) {
        throw new NotFoundError('Language not found', createErrorContext(req));
      }

      // Get all keys from base language (English)
      const baseQuery: any = { 
        language: 'en',
        isActive: true,
      };
      
      if (category) baseQuery.category = category;
      if (namespace) baseQuery.namespace = namespace;

      const baseKeys = await Translation.find(baseQuery).select('key');
      
      // Get existing translations for target language
      const existingTranslations = await Translation.find({
        language: languageCode,
        key: { $in: baseKeys.map(k => k.key) },
        isActive: true,
      }).select('key value');

      // Find missing or empty translations
      const existingKeysMap = new Map();
      existingTranslations.forEach(t => {
        existingKeysMap.set(t.key, t.value);
      });

      const missingTranslations = baseKeys
        .filter(baseKey => {
          const existingValue = existingKeysMap.get(baseKey.key);
          return !existingValue || existingValue.trim() === '';
        })
        .map(baseKey => baseKey.key);

      logger.info('Missing translations retrieved', {
        languageCode,
        category,
        namespace,
        totalBaseKeys: baseKeys.length,
        missingCount: missingTranslations.length,
        requestId: (req as any).id,
      });

      const response: ApiResponse<{
        language: string;
        totalKeys: number;
        missingKeys: string[];
        completeness: number;
      }> = {
        success: true,
        message: 'Missing translations retrieved successfully',
        data: {
          language: languageCode,
          totalKeys: baseKeys.length,
          missingKeys: missingTranslations,
          completeness: baseKeys.length > 0 ? 
            Math.round(((baseKeys.length - missingTranslations.length) / baseKeys.length) * 100) : 0,
        },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public validateTranslations: ValidateTranslationsController = async (req, res, next) => {
    try {
      const { languageCode } = req.params;

      // Verify language exists
      const language = await Language.findOne({ code: languageCode });
      if (!language) {
        throw new NotFoundError('Language not found', createErrorContext(req));
      }

      const translations = await Translation.find({
        language: languageCode,
        isActive: true,
      }).lean();

      const validationResults: ValidationResultResponse = {
        language: languageCode,
        totalKeys: translations.length,
        issues: [],
        summary: {
          emptyValues: 0,
          invalidPlaceholders: 0,
          duplicateValues: 0,
          tooLong: 0,
          specialCharacters: 0,
        },
      };

      const valueMap = new Map<string, string[]>();

      for (const translation of translations) {
        const issues: string[] = [];

        // Check for empty values
        if (!translation.value || translation.value.trim() === '') {
          validationResults.summary.emptyValues++;
          issues.push('Empty translation value');
        }

        // Check for placeholder consistency (e.g., {{variable}})
        const placeholderRegex = /\{\{([^}]+)\}\}/g;
        const placeholders = translation.value.match(placeholderRegex) || [];
        
        // Get base translation to compare placeholders
        const baseTranslation = await Translation.findOne({
          language: 'en',
          key: translation.key,
          isActive: true,
        });

        if (baseTranslation) {
          const basePlaceholders = baseTranslation.value.match(placeholderRegex) || [];
          
          if (placeholders.length !== basePlaceholders.length) {
            validationResults.summary.invalidPlaceholders++;
            issues.push('Placeholder count mismatch with base language');
          }
        }

        // Check for very long translations (>500 chars)
        if (translation.value.length > 500) {
          validationResults.summary.tooLong++;
          issues.push('Translation is very long (>500 characters)');
        }

        // Check for suspicious characters
        const suspiciousChars = /[<>{}]/g;
        if (suspiciousChars.test(translation.value)) {
          validationResults.summary.specialCharacters++;
          issues.push('Contains potentially unsafe characters');
        }

        // Track duplicate values
        if (valueMap.has(translation.value)) {
          valueMap.get(translation.value)!.push(translation.key);
        } else {
          valueMap.set(translation.value, [translation.key]);
        }

        if (issues.length > 0) {
          validationResults.issues.push({
            key: translation.key,
            value: translation.value,
            issues,
          });
        }
      }

      // Count duplicates
      for (const [value, keys] of valueMap.entries()) {
        if (keys.length > 1 && value.trim() !== '') {
          validationResults.summary.duplicateValues += keys.length;
          validationResults.issues.push({
            key: keys.join(', '),
            value,
            issues: ['Duplicate translation value'],
          });
        }
      }

      logger.info('Translation validation completed', {
        languageCode,
        totalKeys: validationResults.totalKeys,
        issueCount: validationResults.issues.length,
        summary: validationResults.summary,
        requestId: (req as any).id,
      });

      const response: ApiResponse<ValidationResultResponse> = {
        success: true,
        message: 'Translation validation completed successfully',
        data: validationResults,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  // Helper methods
  private async createBaseTranslations(languageCode: string): Promise<void> {
    const baseTranslations = await Translation.find({
      language: 'en',
      isActive: true,
    });

    const newTranslations = baseTranslations.map(base => ({
      language: languageCode,
      key: base.key,
      value: '', // Empty value to be translated later
      namespace: base.namespace,
      category: base.category,
      description: base.description,
      createdAt: new Date(),
    }));

    await Translation.insertMany(newTranslations);
  }

  private async getLastTranslationUpdate(languageCode: string): Promise<Date> {
    const lastUpdate = await Translation.findOne({
      language: languageCode,
      isActive: true,
    }).sort({ updatedAt: -1 }).select('updatedAt');

    return lastUpdate?.updatedAt || new Date();
  }

  private buildNestedTranslations(translations: any[]): any {
    const nested = {};

    for (const translation of translations) {
      const keys = translation.key.split('.');
      let current = nested;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!(keys[i] in current)) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = translation.value;
    }

    return nested;
  }

  private flattenTranslations(obj: any, prefix = ''): { [key: string]: string } {
    const flattened: { [key: string]: string } = {};

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const newKey = prefix ? `${prefix}.${key}` : key;

        if (typeof obj[key] === 'object' && obj[key] !== null) {
          Object.assign(flattened, this.flattenTranslations(obj[key], newKey));
        } else {
          flattened[newKey] = String(obj[key]);
        }
      }
    }

    return flattened;
  }

  private extractNamespace(key: string): string {
    const parts = key.split('.');
    return parts.length > 1 ? parts[0] : 'general';
  }

  private extractCategory(key: string): string {
    const parts = key.split('.');
    if (parts.length > 2) {
      return parts[1];
    }
    return 'common';
  }
}

export default new LanguageController();