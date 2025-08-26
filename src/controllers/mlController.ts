import { Request, Response, NextFunction } from 'express';
import { aiService } from '@/services/aiService';
import { logger } from '@/utils/logger';
import { successResponse, errorResponse } from '@/utils/response';

/**
 * Get ML service information and status
 */
export const getMLServiceInfo = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const serviceInfo = aiService.getServiceInfo();
    
    res.json(successResponse(serviceInfo, 'ML service information retrieved successfully'));
  } catch (error) {
    logger.error('Failed to get ML service info', { error: (error as Error).message });
    next(error);
  }
};

/**
 * Check health status of all ML providers
 */
export const checkMLProvidersHealth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const healthStatus = await aiService.getProviderHealthStatus();
    
    const overallHealth = {
      healthy: healthStatus.filter(p => p.status === 'healthy').length,
      unhealthy: healthStatus.filter(p => p.status === 'unhealthy').length,
      disabled: healthStatus.filter(p => p.status === 'disabled').length,
      total: healthStatus.length
    };
    
    res.json(successResponse({
      overall: overallHealth,
      providers: healthStatus
    }, 'ML providers health check completed'));
  } catch (error) {
    logger.error('Failed to check ML providers health', { error: (error as Error).message });
    next(error);
  }
};

/**
 * Test ML service with sample images
 */
export const testMLService = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { provider } = req.params;
    const images = req.files as Express.Multer.File[];
    
    if (!images || images.length === 0) {
      return res.status(400).json(errorResponse('At least one test image is required'));
    }
    
    if (images.length > 3) {
      return res.status(400).json(errorResponse('Maximum 3 test images allowed'));
    }
    
    const imageBuffers = images.map(file => file.buffer);
    const result = await aiService.testMLService(provider as any, imageBuffers);
    
    res.json(successResponse(result, `ML service ${provider} test completed`));
  } catch (error) {
    logger.error('Failed to test ML service', { 
      error: (error as Error).message,
      provider: req.params.provider
    });
    next(error);
  }
};

/**
 * Update ML confidence threshold
 */
export const updateConfidenceThreshold = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { threshold } = req.body;
    
    if (typeof threshold !== 'number' || threshold < 0 || threshold > 1) {
      return res.status(400).json(errorResponse('Threshold must be a number between 0 and 1'));
    }
    
    aiService.updateConfidenceThreshold(threshold);
    
    res.json(successResponse(
      { threshold }, 
      'Confidence threshold updated successfully'
    ));
  } catch (error) {
    logger.error('Failed to update confidence threshold', { error: (error as Error).message });
    next(error);
  }
};

/**
 * Get ML usage statistics
 */
export const getMLUsageStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // This would typically come from a database or analytics service
    const stats = {
      totalRequests: 1250,
      successfulRequests: 1180,
      failedRequests: 70,
      averageProcessingTime: 2.3,
      providersUsage: {
        plant_id: { requests: 800, success_rate: 0.95 },
        plantnet: { requests: 200, success_rate: 0.88 },
        tensorflow: { requests: 150, success_rate: 0.92 },
        google_vision: { requests: 100, success_rate: 0.90 }
      },
      topDiseases: [
        { disease: 'Tomato Late Blight', count: 145 },
        { disease: 'Apple Scab', count: 132 },
        { disease: 'Corn Rust', count: 98 },
        { disease: 'Healthy Plant', count: 430 }
      ],
      confidenceDistribution: {
        'high (0.8-1.0)': 65,
        'medium (0.6-0.8)': 25,
        'low (0-0.6)': 10
      }
    };
    
    res.json(successResponse(stats, 'ML usage statistics retrieved successfully'));
  } catch (error) {
    logger.error('Failed to get ML usage stats', { error: (error as Error).message });
    next(error);
  }
};

/**
 * Diagnose plant disease with specific provider
 */
export const diagnoseWithProvider = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { provider } = req.params;
    const { cropId, useEnsemble = false } = req.body;
    const images = req.files as Express.Multer.File[];
    
    if (!images || images.length === 0) {
      return res.status(400).json(errorResponse('At least one image is required'));
    }
    
    if (images.length > 5) {
      return res.status(400).json(errorResponse('Maximum 5 images allowed'));
    }
    
    const startTime = Date.now();
    const imageBuffers = images.map(file => file.buffer);
    
    let result;
    if (provider === 'ensemble' || useEnsemble) {
      result = await aiService.diagnoseDisease(imageBuffers, cropId, true);
    } else {
      // Test specific provider
      const testResult = await aiService.testMLService(provider as any, imageBuffers);
      result = {
        diseaseId: testResult.predictions?.[0]?.diseaseId || 'unknown',
        diseaseName: testResult.predictions?.[0]?.diseaseName || 'Unknown',
        confidence: testResult.confidence || 0,
        severity: 'medium' as const,
        affectedArea: 50,
        symptoms: [],
        causes: [],
        treatments: [],
        preventionTips: [],
        riskFactors: []
      };
    }
    
    const processingTime = (Date.now() - startTime) / 1000;
    
    res.json(successResponse({
      diagnosis: result,
      metadata: {
        provider: provider === 'ensemble' ? 'ensemble' : provider,
        processingTime,
        imageCount: images.length,
        timestamp: new Date().toISOString()
      }
    }, 'Plant diagnosis completed successfully'));
  } catch (error) {
    logger.error('Failed to diagnose with specific provider', { 
      error: (error as Error).message,
      provider: req.params.provider
    });
    next(error);
  }
};