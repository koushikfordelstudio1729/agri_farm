import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { MarketPrice } from '@/models/MarketPrice';
import { Crop } from '@/models/Crop';
import { logger } from '@/utils/logger';
import axios from 'axios';
import {
  NotFoundError,
  ValidationError,
  BadRequestError,
  createErrorContext,
} from '@/utils/errors';
import { ApiResponse, PaginationResponse } from '@/types/common.types';
import {
  AuthenticatedRequest,
  GetMarketPricesRequest,
  GetPriceHistoryRequest,
  GetPriceTrendsRequest,
  GetPriceAlertsRequest,
  CreatePriceAlertRequest,
  UpdatePriceAlertRequest,
  DeletePriceAlertRequest,
  GetMarketStatsRequest,
  AddMarketPriceRequest,
  UpdateMarketPriceRequest,
  DeleteMarketPriceRequest,
  GetMarketLocationsRequest,
  AddMarketLocationRequest,
  SearchMarketsRequest,
  MarketPriceResponse,
  PriceHistoryResponse,
  PriceTrendResponse,
  PriceAlertResponse,
  MarketStatsResponse,
  MarketLocationResponse,
  GetMarketPricesController,
  GetPriceHistoryController,
  GetPriceTrendsController,
  GetPriceAlertsController,
  CreatePriceAlertController,
  UpdatePriceAlertController,
  DeletePriceAlertController,
  GetMarketStatsController,
  AddMarketPriceController,
  UpdateMarketPriceController,
  DeleteMarketPriceController,
  GetMarketLocationsController,
  AddMarketLocationController,
  SearchMarketsController,
} from './marketController.types';

export class MarketController {
  public getMarketPrices: GetMarketPricesController = async (req, res, next) => {
    try {
      const {
        cropId,
        location,
        market,
        grade,
        unit,
        startDate,
        endDate,
        page = '1',
        limit = '20',
        sortBy = 'date',
        sortOrder = 'desc',
      } = req.query;

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      // Build filter query
      const filterQuery: any = {
        isActive: true,
      };

      if (cropId) filterQuery.crop = cropId;
      if (market) filterQuery.market = market;
      if (grade) filterQuery.grade = grade;
      if (unit) filterQuery.unit = unit;

      if (location) {
        const [lat, lng] = (location as string).split(',').map(Number);
        if (!isNaN(lat) && !isNaN(lng)) {
          filterQuery.location = {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [lng, lat],
              },
              $maxDistance: 100000, // 100km radius
            },
          };
        }
      }

      if (startDate || endDate) {
        filterQuery.date = {};
        if (startDate) filterQuery.date.$gte = new Date(startDate as string);
        if (endDate) filterQuery.date.$lte = new Date(endDate as string);
      }

      // Build sort object
      const sortObj: any = {};
      sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Execute query
      const [prices, total] = await Promise.all([
        MarketPrice.find(filterQuery)
          .populate('crop', 'name scientificName category image')
          .sort(sortObj)
          .skip(skip)
          .limit(limitNum)
          .lean(),
        MarketPrice.countDocuments(filterQuery),
      ]);

      const pagination: PaginationResponse = {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPreviousPage: pageNum > 1,
      };

      logger.info('Market prices retrieved', {
        userId: req.user?.id || 'anonymous',
        filters: { cropId, location, market, grade },
        resultCount: prices.length,
        requestId: (req as any).id,
      });

      const response: ApiResponse<MarketPriceResponse[]> = {
        success: true,
        message: 'Market prices retrieved successfully',
        data: prices as MarketPriceResponse[],
      };

      res.json({ ...response, pagination });
    } catch (error) {
      next(error);
    }
  };

  public getPriceHistory: GetPriceHistoryController = async (req, res, next) => {
    try {
      const { cropId, market, days = '30' } = req.query;

      if (!cropId) {
        throw new ValidationError('Crop ID is required', {
          cropId: ['Crop ID is required'],
        }, createErrorContext(req));
      }

      const daysNum = parseInt(days as string, 10);
      const startDate = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);

      const filterQuery: any = {
        crop: cropId,
        date: { $gte: startDate },
        isActive: true,
      };

      if (market) filterQuery.market = market;

      const priceHistory = await MarketPrice.find(filterQuery)
        .populate('crop', 'name scientificName')
        .sort({ date: 1 })
        .lean();

      // Group by date and calculate averages
      const groupedPrices: { [key: string]: any[] } = {};
      priceHistory.forEach(price => {
        const dateKey = price.date.toISOString().split('T')[0];
        if (!groupedPrices[dateKey]) {
          groupedPrices[dateKey] = [];
        }
        groupedPrices[dateKey].push(price);
      });

      const historyData = Object.entries(groupedPrices).map(([date, dayPrices]) => {
        const prices = dayPrices.map(p => p.price);
        const volumes = dayPrices.map(p => p.volume || 0);
        
        return {
          date: new Date(date),
          averagePrice: prices.reduce((a, b) => a + b, 0) / prices.length,
          minPrice: Math.min(...prices),
          maxPrice: Math.max(...prices),
          totalVolume: volumes.reduce((a, b) => a + b, 0),
          pricePoints: dayPrices.length,
        };
      });

      // Calculate trends
      const trends = this.calculatePriceTrends(historyData);

      const response: ApiResponse<PriceHistoryResponse> = {
        success: true,
        message: 'Price history retrieved successfully',
        data: {
          crop: priceHistory[0]?.crop || { _id: cropId, name: 'Unknown', scientificName: 'Unknown' },
          market: market as string,
          period: {
            startDate,
            endDate: new Date(),
            days: daysNum,
          },
          history: historyData,
          trends,
          summary: {
            totalDataPoints: priceHistory.length,
            averagePrice: historyData.reduce((sum, item) => sum + item.averagePrice, 0) / historyData.length,
            priceRange: {
              min: Math.min(...historyData.map(item => item.minPrice)),
              max: Math.max(...historyData.map(item => item.maxPrice)),
            },
            volatility: this.calculateVolatility(historyData),
          },
        },
      };

      logger.info('Price history retrieved', {
        userId: req.user?.id || 'anonymous',
        cropId,
        market,
        days: daysNum,
        dataPoints: priceHistory.length,
        requestId: (req as any).id,
      });

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public getPriceTrends: GetPriceTrendsController = async (req, res, next) => {
    try {
      const { period = '7d' } = req.query;

      let days: number;
      switch (period) {
        case '24h':
          days = 1;
          break;
        case '7d':
          days = 7;
          break;
        case '30d':
          days = 30;
          break;
        case '90d':
          days = 90;
          break;
        default:
          days = 7;
      }

      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Get trending crops based on price changes
      const trends = await MarketPrice.aggregate([
        {
          $match: {
            date: { $gte: startDate },
            isActive: true,
          }
        },
        {
          $group: {
            _id: '$crop',
            currentPrice: { $last: '$price' },
            previousPrice: { $first: '$price' },
            avgPrice: { $avg: '$price' },
            maxPrice: { $max: '$price' },
            minPrice: { $min: '$price' },
            volume: { $sum: '$volume' },
            priceCount: { $sum: 1 },
          }
        },
        {
          $addFields: {
            priceChange: { $subtract: ['$currentPrice', '$previousPrice'] },
            priceChangePercent: {
              $multiply: [
                { $divide: [
                  { $subtract: ['$currentPrice', '$previousPrice'] },
                  '$previousPrice'
                ]},
                100
              ]
            },
            volatility: {
              $divide: [
                { $subtract: ['$maxPrice', '$minPrice'] },
                '$avgPrice'
              ]
            }
          }
        },
        {
          $sort: { priceChangePercent: -1 }
        },
        {
          $limit: 20
        }
      ]);

      // Populate crop information
      const populatedTrends = await MarketPrice.populate(trends, {
        path: '_id',
        select: 'name scientificName category image',
        model: 'Crop',
      });

      const trendData: PriceTrendResponse = {
        period: period as string,
        updatedAt: new Date(),
        gainers: populatedTrends
          .filter(trend => trend.priceChangePercent > 0)
          .slice(0, 10)
          .map(trend => ({
            crop: trend._id,
            currentPrice: trend.currentPrice,
            previousPrice: trend.previousPrice,
            priceChange: trend.priceChange,
            priceChangePercent: trend.priceChangePercent,
            volume: trend.volume,
            volatility: trend.volatility,
          })),
        losers: populatedTrends
          .filter(trend => trend.priceChangePercent < 0)
          .slice(0, 10)
          .map(trend => ({
            crop: trend._id,
            currentPrice: trend.currentPrice,
            previousPrice: trend.previousPrice,
            priceChange: trend.priceChange,
            priceChangePercent: trend.priceChangePercent,
            volume: trend.volume,
            volatility: trend.volatility,
          })),
        mostActive: populatedTrends
          .sort((a, b) => b.volume - a.volume)
          .slice(0, 10)
          .map(trend => ({
            crop: trend._id,
            currentPrice: trend.currentPrice,
            volume: trend.volume,
            priceChangePercent: trend.priceChangePercent,
            volatility: trend.volatility,
          })),
      };

      logger.info('Price trends retrieved', {
        userId: req.user?.id || 'anonymous',
        period,
        gainersCount: trendData.gainers.length,
        losersCount: trendData.losers.length,
        requestId: (req as any).id,
      });

      const response: ApiResponse<PriceTrendResponse> = {
        success: true,
        message: 'Price trends retrieved successfully',
        data: trendData,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public getPriceAlerts: GetPriceAlertsController = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { status = 'active' } = req.query;

      const filterQuery: any = {
        user: userId,
      };

      if (status) filterQuery.status = status;

      const alerts = await MarketPrice.find({ 
        ...filterQuery, 
        type: 'price_alert' 
      })
        .populate('crop', 'name scientificName category')
        .sort({ createdAt: -1 })
        .lean();

      const response: ApiResponse<PriceAlertResponse[]> = {
        success: true,
        message: 'Price alerts retrieved successfully',
        data: alerts as PriceAlertResponse[],
      };

      logger.info('Price alerts retrieved', {
        userId,
        alertCount: alerts.length,
        status,
        requestId: (req as any).id,
      });

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public createPriceAlert: CreatePriceAlertController = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const {
        cropId,
        market,
        alertType,
        targetPrice,
        condition,
        location,
        notificationMethods = ['push'],
      } = req.body;

      // Validate crop exists
      const crop = await Crop.findById(cropId);
      if (!crop) {
        throw new NotFoundError('Crop not found', createErrorContext(req));
      }

      // Check if similar alert already exists
      const existingAlert = await MarketPrice.findOne({
        user: userId,
        crop: cropId,
        market,
        type: 'price_alert',
        status: 'active',
        alertType,
        targetPrice,
        condition,
      });

      if (existingAlert) {
        throw new ValidationError('Similar price alert already exists', {
          alert: ['You already have a similar active price alert for this crop'],
        }, createErrorContext(req));
      }

      const alert = new MarketPrice({
        user: userId,
        crop: cropId,
        market,
        type: 'price_alert',
        alertType,
        targetPrice,
        condition,
        location: location ? {
          type: 'Point',
          coordinates: [location.longitude, location.latitude],
          address: location.address,
          city: location.city,
          state: location.state,
          country: location.country,
        } : undefined,
        notificationMethods,
        status: 'active',
        createdAt: new Date(),
      });

      await alert.save();

      // Populate for response
      const populatedAlert = await MarketPrice.findById(alert._id)
        .populate('crop', 'name scientificName category image');

      logger.info('Price alert created', {
        alertId: alert._id.toString(),
        userId,
        cropId,
        alertType,
        targetPrice,
        condition,
        requestId: (req as any).id,
      });

      const response: ApiResponse<PriceAlertResponse> = {
        success: true,
        message: 'Price alert created successfully',
        data: populatedAlert?.toObject() as PriceAlertResponse,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  public updatePriceAlert: UpdatePriceAlertController = async (req, res, next) => {
    try {
      const { alertId } = req.params;
      const userId = req.user.id;
      const {
        targetPrice,
        condition,
        notificationMethods,
        status,
      } = req.body;

      if (!mongoose.Types.ObjectId.isValid(alertId)) {
        throw new ValidationError('Invalid alert ID');
      }

      const alert = await MarketPrice.findOne({
        _id: alertId,
        user: userId,
        type: 'price_alert',
      });

      if (!alert) {
        throw new NotFoundError('Price alert not found', createErrorContext(req));
      }

      // Update fields
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (targetPrice !== undefined) updateData.targetPrice = targetPrice;
      if (condition !== undefined) updateData.condition = condition;
      if (notificationMethods !== undefined) updateData.notificationMethods = notificationMethods;
      if (status !== undefined) updateData.status = status;

      const updatedAlert = await MarketPrice.findByIdAndUpdate(
        alertId,
        updateData,
        { new: true, runValidators: true }
      ).populate('crop', 'name scientificName category');

      logger.info('Price alert updated', {
        alertId,
        userId,
        updatedFields: Object.keys(updateData).filter(key => key !== 'updatedAt'),
        requestId: (req as any).id,
      });

      const response: ApiResponse<PriceAlertResponse> = {
        success: true,
        message: 'Price alert updated successfully',
        data: updatedAlert?.toObject() as PriceAlertResponse,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public deletePriceAlert: DeletePriceAlertController = async (req, res, next) => {
    try {
      const { alertId } = req.params;
      const userId = req.user.id;

      if (!mongoose.Types.ObjectId.isValid(alertId)) {
        throw new ValidationError('Invalid alert ID');
      }

      const alert = await MarketPrice.findOne({
        _id: alertId,
        user: userId,
        type: 'price_alert',
      });

      if (!alert) {
        throw new NotFoundError('Price alert not found', createErrorContext(req));
      }

      await MarketPrice.findByIdAndDelete(alertId);

      logger.info('Price alert deleted', {
        alertId,
        userId,
        cropId: alert.crop?.toString(),
        requestId: (req as any).id,
      });

      const response: ApiResponse<{}> = {
        success: true,
        message: 'Price alert deleted successfully',
        data: {},
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public getMarketStats: GetMarketStatsController = async (req, res, next) => {
    try {
      const { period = '30d' } = req.query;

      let days: number;
      switch (period) {
        case '7d':
          days = 7;
          break;
        case '30d':
          days = 30;
          break;
        case '90d':
          days = 90;
          break;
        case '1y':
          days = 365;
          break;
        default:
          days = 30;
      }

      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const stats = await MarketPrice.aggregate([
        {
          $match: {
            date: { $gte: startDate },
            isActive: true,
            type: { $ne: 'price_alert' },
          }
        },
        {
          $group: {
            _id: null,
            totalRecords: { $sum: 1 },
            uniqueCrops: { $addToSet: '$crop' },
            uniqueMarkets: { $addToSet: '$market' },
            avgPrice: { $avg: '$price' },
            maxPrice: { $max: '$price' },
            minPrice: { $min: '$price' },
            totalVolume: { $sum: '$volume' },
          }
        },
        {
          $project: {
            _id: 0,
            totalRecords: 1,
            uniqueCropsCount: { $size: '$uniqueCrops' },
            uniqueMarketsCount: { $size: '$uniqueMarkets' },
            avgPrice: { $round: ['$avgPrice', 2] },
            maxPrice: 1,
            minPrice: 1,
            totalVolume: 1,
          }
        }
      ]);

      // Get top performing crops
      const topCrops = await MarketPrice.aggregate([
        {
          $match: {
            date: { $gte: startDate },
            isActive: true,
            type: { $ne: 'price_alert' },
          }
        },
        {
          $group: {
            _id: '$crop',
            avgPrice: { $avg: '$price' },
            volume: { $sum: '$volume' },
            records: { $sum: 1 },
            maxPrice: { $max: '$price' },
            minPrice: { $min: '$price' },
          }
        },
        {
          $sort: { volume: -1 }
        },
        {
          $limit: 10
        }
      ]);

      const populatedTopCrops = await MarketPrice.populate(topCrops, {
        path: '_id',
        select: 'name scientificName category',
        model: 'Crop',
      });

      const marketStats: MarketStatsResponse = {
        period: period as string,
        overview: stats[0] || {
          totalRecords: 0,
          uniqueCropsCount: 0,
          uniqueMarketsCount: 0,
          avgPrice: 0,
          maxPrice: 0,
          minPrice: 0,
          totalVolume: 0,
        },
        topCrops: populatedTopCrops.map(crop => ({
          crop: crop._id,
          averagePrice: crop.avgPrice,
          volume: crop.volume,
          records: crop.records,
          priceRange: {
            min: crop.minPrice,
            max: crop.maxPrice,
          },
        })),
        lastUpdated: new Date(),
      };

      logger.info('Market statistics retrieved', {
        userId: req.user?.id || 'anonymous',
        period,
        totalRecords: marketStats.overview.totalRecords,
        requestId: (req as any).id,
      });

      const response: ApiResponse<MarketStatsResponse> = {
        success: true,
        message: 'Market statistics retrieved successfully',
        data: marketStats,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public addMarketPrice: AddMarketPriceController = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const {
        cropId,
        market,
        price,
        volume,
        unit,
        grade,
        location,
        source,
        date,
      } = req.body;

      // Validate crop exists
      const crop = await Crop.findById(cropId);
      if (!crop) {
        throw new NotFoundError('Crop not found', createErrorContext(req));
      }

      const marketPrice = new MarketPrice({
        crop: cropId,
        market,
        price,
        volume,
        unit,
        grade,
        location: location ? {
          type: 'Point',
          coordinates: [location.longitude, location.latitude],
          address: location.address,
          city: location.city,
          state: location.state,
          country: location.country,
        } : undefined,
        source: source || 'user_submitted',
        date: date ? new Date(date) : new Date(),
        submittedBy: userId,
        isVerified: req.user.role === 'admin' || req.user.role === 'expert',
        createdAt: new Date(),
      });

      await marketPrice.save();

      // Populate for response
      const populatedPrice = await MarketPrice.findById(marketPrice._id)
        .populate('crop', 'name scientificName category');

      logger.info('Market price added', {
        priceId: marketPrice._id.toString(),
        userId,
        cropId,
        market,
        price,
        requestId: (req as any).id,
      });

      const response: ApiResponse<MarketPriceResponse> = {
        success: true,
        message: 'Market price added successfully',
        data: populatedPrice?.toObject() as MarketPriceResponse,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  public updateMarketPrice: UpdateMarketPriceController = async (req, res, next) => {
    try {
      const { priceId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;
      const { price, volume, unit, grade } = req.body;

      if (!mongoose.Types.ObjectId.isValid(priceId)) {
        throw new ValidationError('Invalid price ID');
      }

      const marketPrice = await MarketPrice.findById(priceId);
      if (!marketPrice) {
        throw new NotFoundError('Market price not found', createErrorContext(req));
      }

      // Check permissions
      if (marketPrice.submittedBy?.toString() !== userId && !['admin', 'expert'].includes(userRole)) {
        throw new ValidationError('You can only edit your own price entries');
      }

      // Update fields
      const updateData: any = {
        updatedAt: new Date(),
        updatedBy: userId,
      };

      if (price !== undefined) updateData.price = price;
      if (volume !== undefined) updateData.volume = volume;
      if (unit !== undefined) updateData.unit = unit;
      if (grade !== undefined) updateData.grade = grade;

      const updatedPrice = await MarketPrice.findByIdAndUpdate(
        priceId,
        updateData,
        { new: true, runValidators: true }
      ).populate('crop', 'name scientificName category');

      logger.info('Market price updated', {
        priceId,
        userId,
        updatedFields: Object.keys(updateData).filter(key => !['updatedAt', 'updatedBy'].includes(key)),
        requestId: (req as any).id,
      });

      const response: ApiResponse<MarketPriceResponse> = {
        success: true,
        message: 'Market price updated successfully',
        data: updatedPrice?.toObject() as MarketPriceResponse,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public deleteMarketPrice: DeleteMarketPriceController = async (req, res, next) => {
    try {
      const { priceId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      if (!mongoose.Types.ObjectId.isValid(priceId)) {
        throw new ValidationError('Invalid price ID');
      }

      const marketPrice = await MarketPrice.findById(priceId);
      if (!marketPrice) {
        throw new NotFoundError('Market price not found', createErrorContext(req));
      }

      // Check permissions
      if (marketPrice.submittedBy?.toString() !== userId && userRole !== 'admin') {
        throw new ValidationError('You can only delete your own price entries');
      }

      await MarketPrice.findByIdAndDelete(priceId);

      logger.info('Market price deleted', {
        priceId,
        userId,
        deletedBy: userRole === 'admin' ? 'admin' : 'owner',
        requestId: (req as any).id,
      });

      const response: ApiResponse<{}> = {
        success: true,
        message: 'Market price deleted successfully',
        data: {},
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public getMarketLocations: GetMarketLocationsController = async (req, res, next) => {
    try {
      const { country, state, city, radius } = req.query;

      const filterQuery: any = {
        isActive: true,
        type: { $ne: 'price_alert' },
      };

      if (country) filterQuery['location.country'] = country;
      if (state) filterQuery['location.state'] = state;
      if (city) filterQuery['location.city'] = city;

      const locations = await MarketPrice.aggregate([
        { $match: filterQuery },
        {
          $group: {
            _id: {
              market: '$market',
              city: '$location.city',
              state: '$location.state',
              country: '$location.country',
              coordinates: '$location.coordinates',
            },
            priceCount: { $sum: 1 },
            latestPrice: { $max: '$date' },
            avgPrice: { $avg: '$price' },
            crops: { $addToSet: '$crop' },
          }
        },
        {
          $project: {
            _id: 0,
            market: '$_id.market',
            location: {
              city: '$_id.city',
              state: '$_id.state',
              country: '$_id.country',
              coordinates: '$_id.coordinates',
            },
            statistics: {
              priceCount: '$priceCount',
              latestPrice: '$latestPrice',
              avgPrice: { $round: ['$avgPrice', 2] },
              uniqueCrops: { $size: '$crops' },
            },
          }
        },
        { $sort: { 'statistics.priceCount': -1 } }
      ]);

      const response: ApiResponse<MarketLocationResponse[]> = {
        success: true,
        message: 'Market locations retrieved successfully',
        data: locations as MarketLocationResponse[],
      };

      logger.info('Market locations retrieved', {
        userId: req.user?.id || 'anonymous',
        filters: { country, state, city },
        locationCount: locations.length,
        requestId: (req as any).id,
      });

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public addMarketLocation: AddMarketLocationController = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { name, address, city, state, country, latitude, longitude } = req.body;

      // This would create a market location record
      // For now, we'll create a placeholder price record to establish the location
      const locationRecord = new MarketPrice({
        market: name,
        location: {
          type: 'Point',
          coordinates: [longitude, latitude],
          address,
          city,
          state,
          country,
        },
        type: 'market_location',
        submittedBy: userId,
        isVerified: req.user.role === 'admin',
        createdAt: new Date(),
      });

      await locationRecord.save();

      logger.info('Market location added', {
        locationId: locationRecord._id.toString(),
        userId,
        marketName: name,
        coordinates: `${latitude},${longitude}`,
        requestId: (req as any).id,
      });

      const response: ApiResponse<MarketLocationResponse> = {
        success: true,
        message: 'Market location added successfully',
        data: {
          market: name,
          location: {
            address,
            city,
            state,
            country,
            coordinates: [longitude, latitude],
          },
          statistics: {
            priceCount: 0,
            latestPrice: new Date(),
            avgPrice: 0,
            uniqueCrops: 0,
          },
        },
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  public searchMarkets: SearchMarketsController = async (req, res, next) => {
    try {
      const {
        q,
        cropId,
        location,
        priceRange,
        dateRange,
        page = '1',
        limit = '20',
        sortBy = 'date',
        sortOrder = 'desc',
      } = req.query;

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      // Build search query
      const searchQuery: any = {
        isActive: true,
        type: { $ne: 'price_alert' },
      };

      if (q) {
        searchQuery.$or = [
          { market: new RegExp(q as string, 'i') },
          { 'location.city': new RegExp(q as string, 'i') },
          { 'location.state': new RegExp(q as string, 'i') },
        ];
      }

      if (cropId) searchQuery.crop = cropId;

      if (location) {
        const [lat, lng] = (location as string).split(',').map(Number);
        if (!isNaN(lat) && !isNaN(lng)) {
          searchQuery.location = {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [lng, lat],
              },
              $maxDistance: 50000, // 50km
            },
          };
        }
      }

      if (priceRange) {
        const [min, max] = (priceRange as string).split(',').map(Number);
        searchQuery.price = {};
        if (!isNaN(min)) searchQuery.price.$gte = min;
        if (!isNaN(max)) searchQuery.price.$lte = max;
      }

      if (dateRange) {
        const [start, end] = (dateRange as string).split(',');
        if (start && end) {
          searchQuery.date = {
            $gte: new Date(start),
            $lte: new Date(end),
          };
        }
      }

      // Build sort object
      const sortObj: any = {};
      sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Execute search
      const [results, total] = await Promise.all([
        MarketPrice.find(searchQuery)
          .populate('crop', 'name scientificName category image')
          .sort(sortObj)
          .skip(skip)
          .limit(limitNum)
          .lean(),
        MarketPrice.countDocuments(searchQuery),
      ]);

      const pagination: PaginationResponse = {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPreviousPage: pageNum > 1,
      };

      logger.info('Markets searched', {
        query: q,
        filters: { cropId, location, priceRange, dateRange },
        resultCount: results.length,
        requestId: (req as any).id,
      });

      const response: ApiResponse<MarketPriceResponse[]> = {
        success: true,
        message: 'Market search completed successfully',
        data: results as MarketPriceResponse[],
      };

      res.json({ ...response, pagination });
    } catch (error) {
      next(error);
    }
  };

  // Helper methods
  private calculatePriceTrends(historyData: any[]): any {
    if (historyData.length < 2) {
      return {
        direction: 'stable',
        changePercent: 0,
        volatility: 'low',
      };
    }

    const firstPrice = historyData[0].averagePrice;
    const lastPrice = historyData[historyData.length - 1].averagePrice;
    const changePercent = ((lastPrice - firstPrice) / firstPrice) * 100;

    return {
      direction: changePercent > 5 ? 'increasing' : changePercent < -5 ? 'decreasing' : 'stable',
      changePercent: Math.round(changePercent * 100) / 100,
      volatility: this.calculateVolatility(historyData) > 0.2 ? 'high' : 'low',
    };
  }

  private calculateVolatility(historyData: any[]): number {
    if (historyData.length < 2) return 0;

    const prices = historyData.map(item => item.averagePrice);
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
    
    return Math.sqrt(variance) / mean; // Coefficient of variation
  }
}

export default new MarketController();