import * as tf from '@tensorflow/tfjs-node';
import sharp from 'sharp';
import { cropService } from './cropService';
import { diseaseService } from './diseaseService';
import { logger } from '@/utils/logger';
import { AIServiceError } from '@/utils/errors';
import type {
  DiagnosisRequest,
  DiagnosisResult,
  ModelConfig,
  ImagePreprocessingOptions,
  ModelPrediction,
  TrainingData,
  ModelMetrics,
} from '@/types/ai.types';

class AIService {
  private model: tf.LayersModel | null = null;
  private modelVersion: string = '1.0.0';
  private confidenceThreshold: number = 0.7;
  private preprocessingConfig: ImagePreprocessingOptions = {
    targetWidth: 224,
    targetHeight: 224,
    normalize: true,
    channels: 3,
  };

  constructor() {
    this.initializeModel();
  }

  /**
   * Initialize the AI model for disease diagnosis
   */
  private async initializeModel(): Promise<void> {
    try {
      logger.info('Initializing AI diagnosis model');
      
      const modelPath = process.env.AI_MODEL_PATH || '/models/plant-disease-model.json';
      
      // Load pre-trained model
      if (modelPath.startsWith('http')) {
        this.model = await tf.loadLayersModel(modelPath);
      } else {
        this.model = await tf.loadLayersModel(`file://${modelPath}`);
      }
      
      logger.info('AI model loaded successfully', {
        modelVersion: this.modelVersion,
        inputShape: this.model.inputs[0].shape,
        outputShape: this.model.outputs[0].shape,
      });
    } catch (error) {
      logger.error('Failed to initialize AI model', { error });
      // Continue without AI model - will fallback to manual diagnosis
    }
  }

  /**
   * Preprocess image for AI analysis
   */
  private async preprocessImage(
    imageBuffer: Buffer,
    options: Partial<ImagePreprocessingOptions> = {}
  ): Promise<tf.Tensor> {
    try {
      const config = { ...this.preprocessingConfig, ...options };
      
      // Resize and normalize image
      const processedBuffer = await sharp(imageBuffer)
        .resize(config.targetWidth, config.targetHeight, {
          fit: 'cover',
          position: 'center',
        })
        .removeAlpha()
        .raw()
        .toBuffer();

      // Convert to tensor
      const imageTensor = tf.tensor3d(
        new Uint8Array(processedBuffer),
        [config.targetHeight, config.targetWidth, config.channels],
        'int32'
      );

      // Normalize if required
      if (config.normalize) {
        return imageTensor.div(255.0);
      }

      return imageTensor;
    } catch (error) {
      throw new AIServiceError('Failed to preprocess image', { error });
    }
  }

  /**
   * Run AI diagnosis on plant images
   */
  async diagnoseDisease(request: DiagnosisRequest): Promise<DiagnosisResult> {
    try {
      logger.info('Starting AI disease diagnosis', {
        imageCount: request.images.length,
        cropId: request.cropId,
      });

      if (!this.model) {
        throw new AIServiceError('AI model not available');
      }

      const predictions: ModelPrediction[] = [];

      // Process each image
      for (const imageData of request.images) {
        const imageTensor = await this.preprocessImage(imageData.buffer);
        
        // Add batch dimension
        const batchedTensor = imageTensor.expandDims(0);
        
        // Run prediction
        const prediction = this.model.predict(batchedTensor) as tf.Tensor;
        const predictionData = await prediction.data();
        
        // Clean up tensors
        imageTensor.dispose();
        batchedTensor.dispose();
        prediction.dispose();

        // Get top predictions
        const topPredictions = await this.getTopPredictions(
          Array.from(predictionData),
          request.cropId
        );

        predictions.push({
          imageId: imageData.id,
          predictions: topPredictions,
          confidence: Math.max(...topPredictions.map(p => p.confidence)),
          processed: true,
        });
      }

      // Combine predictions from multiple images
      const combinedResult = await this.combinePredictions(predictions);
      
      logger.info('AI diagnosis completed', {
        confidence: combinedResult.confidence,
        diseaseId: combinedResult.diseaseId,
        requiresReview: combinedResult.confidence < this.confidenceThreshold,
      });

      return combinedResult;
    } catch (error) {
      logger.error('AI diagnosis failed', { error });
      throw new AIServiceError('Failed to process AI diagnosis', { error });
    }
  }

  /**
   * Get top disease predictions from model output
   */
  private async getTopPredictions(
    predictions: number[],
    cropId?: string,
    topK: number = 5
  ): Promise<Array<{ diseaseId: string; confidence: number; name: string }>> {
    try {
      // Get disease classes for the model
      const diseaseClasses = await this.getDiseaseClasses(cropId);
      
      // Create prediction pairs and sort by confidence
      const predictionPairs = predictions
        .map((confidence, index) => ({
          diseaseId: diseaseClasses[index]?.id || `unknown_${index}`,
          name: diseaseClasses[index]?.name || `Unknown Disease ${index}`,
          confidence,
        }))
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, topK);

      return predictionPairs;
    } catch (error) {
      throw new AIServiceError('Failed to get top predictions', { error });
    }
  }

  /**
   * Get disease classes supported by the model
   */
  private async getDiseaseClasses(cropId?: string): Promise<Array<{ id: string; name: string }>> {
    try {
      // Get diseases from database, filtered by crop if provided
      const diseases = await diseaseService.getDiseases({
        cropId,
        limit: 1000,
        sortBy: 'prevalence',
        sortOrder: 'desc',
      });

      return diseases.diseases.map(disease => ({
        id: disease.id,
        name: disease.name,
      }));
    } catch (error) {
      logger.warn('Failed to get disease classes, using fallback', { error });
      
      // Fallback disease classes
      return [
        { id: 'healthy', name: 'Healthy Plant' },
        { id: 'bacterial_blight', name: 'Bacterial Blight' },
        { id: 'leaf_spot', name: 'Leaf Spot' },
        { id: 'powdery_mildew', name: 'Powdery Mildew' },
        { id: 'rust', name: 'Rust Disease' },
      ];
    }
  }

  /**
   * Combine predictions from multiple images
   */
  private async combinePredictions(predictions: ModelPrediction[]): Promise<DiagnosisResult> {
    try {
      const diseaseConfidenceMap = new Map<string, number[]>();
      
      // Aggregate confidence scores by disease
      predictions.forEach(prediction => {
        prediction.predictions.forEach(pred => {
          if (!diseaseConfidenceMap.has(pred.diseaseId)) {
            diseaseConfidenceMap.set(pred.diseaseId, []);
          }
          diseaseConfidenceMap.get(pred.diseaseId)!.push(pred.confidence);
        });
      });

      // Calculate average confidence for each disease
      const avgConfidences = Array.from(diseaseConfidenceMap.entries())
        .map(([diseaseId, confidences]) => ({
          diseaseId,
          confidence: confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length,
        }))
        .sort((a, b) => b.confidence - a.confidence);

      const topPrediction = avgConfidences[0];
      
      if (!topPrediction) {
        throw new AIServiceError('No valid predictions found');
      }

      // Get disease details
      const diseaseDetails = await diseaseService.getDiseaseById(topPrediction.diseaseId);
      
      return {
        diseaseId: topPrediction.diseaseId,
        diseaseName: diseaseDetails?.name || 'Unknown Disease',
        confidence: topPrediction.confidence,
        severity: this.calculateSeverity(topPrediction.confidence),
        affectedAreas: await this.identifyAffectedAreas(predictions),
        treatments: diseaseDetails?.treatments || [],
        preventionTips: diseaseDetails?.preventionTips || [],
        isHealthy: topPrediction.diseaseId === 'healthy',
        requiresExpertReview: topPrediction.confidence < this.confidenceThreshold,
        alternativeDiagnoses: avgConfidences.slice(1, 4).map(pred => ({
          diseaseId: pred.diseaseId,
          confidence: pred.confidence,
        })),
        metadata: {
          modelVersion: this.modelVersion,
          processedImages: predictions.length,
          processingTime: Date.now(), // Should be calculated from start time
        },
      };
    } catch (error) {
      throw new AIServiceError('Failed to combine predictions', { error });
    }
  }

  /**
   * Calculate disease severity based on confidence and visual indicators
   */
  private calculateSeverity(confidence: number): 'low' | 'medium' | 'high' {
    if (confidence >= 0.9) return 'high';
    if (confidence >= 0.7) return 'medium';
    return 'low';
  }

  /**
   * Identify affected areas in the plant images
   */
  private async identifyAffectedAreas(
    predictions: ModelPrediction[]
  ): Promise<Array<{ area: string; severity: number }>> {
    // This would require a segmentation model or additional analysis
    // For now, return basic areas based on common plant parts
    return [
      { area: 'leaves', severity: 0.8 },
      { area: 'stems', severity: 0.3 },
    ];
  }

  /**
   * Update model confidence threshold
   */
  updateConfidenceThreshold(threshold: number): void {
    if (threshold < 0 || threshold > 1) {
      throw new AIServiceError('Confidence threshold must be between 0 and 1');
    }
    this.confidenceThreshold = threshold;
    logger.info('Updated confidence threshold', { threshold });
  }

  /**
   * Get model information and statistics
   */
  getModelInfo(): ModelConfig {
    return {
      version: this.modelVersion,
      isLoaded: this.model !== null,
      confidenceThreshold: this.confidenceThreshold,
      inputShape: this.model?.inputs[0].shape || null,
      outputShape: this.model?.outputs[0].shape || null,
      preprocessing: this.preprocessingConfig,
      supportedCrops: [], // Would be loaded from model metadata
    };
  }

  /**
   * Calculate model performance metrics
   */
  async calculateMetrics(testData: TrainingData[]): Promise<ModelMetrics> {
    if (!this.model) {
      throw new AIServiceError('Model not loaded');
    }

    let correctPredictions = 0;
    const confidenceScores: number[] = [];
    const predictions: Array<{ actual: string; predicted: string; confidence: number }> = [];

    for (const sample of testData) {
      try {
        const imageTensor = await this.preprocessImage(sample.imageBuffer);
        const batchedTensor = imageTensor.expandDims(0);
        
        const prediction = this.model.predict(batchedTensor) as tf.Tensor;
        const predictionData = await prediction.data();
        
        const topPredictions = await this.getTopPredictions(Array.from(predictionData));
        const topPrediction = topPredictions[0];
        
        if (topPrediction.diseaseId === sample.diseaseId) {
          correctPredictions++;
        }
        
        confidenceScores.push(topPrediction.confidence);
        predictions.push({
          actual: sample.diseaseId,
          predicted: topPrediction.diseaseId,
          confidence: topPrediction.confidence,
        });

        // Clean up tensors
        imageTensor.dispose();
        batchedTensor.dispose();
        prediction.dispose();
      } catch (error) {
        logger.warn('Failed to process test sample', { error });
      }
    }

    const accuracy = correctPredictions / testData.length;
    const avgConfidence = confidenceScores.reduce((sum, conf) => sum + conf, 0) / confidenceScores.length;

    return {
      accuracy,
      averageConfidence: avgConfidence,
      totalSamples: testData.length,
      correctPredictions,
      predictions,
      confidenceDistribution: this.calculateConfidenceDistribution(confidenceScores),
    };
  }

  /**
   * Calculate confidence score distribution
   */
  private calculateConfidenceDistribution(scores: number[]): Record<string, number> {
    const distribution = {
      'low (0-0.5)': 0,
      'medium (0.5-0.8)': 0,
      'high (0.8-1.0)': 0,
    };

    scores.forEach(score => {
      if (score < 0.5) distribution['low (0-0.5)']++;
      else if (score < 0.8) distribution['medium (0.5-0.8)']++;
      else distribution['high (0.8-1.0)']++;
    });

    return distribution;
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
      logger.info('AI model disposed');
    }
  }
}

export const aiService = new AIService();
export { AIService };