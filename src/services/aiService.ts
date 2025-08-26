import axios, { AxiosResponse } from 'axios';
import * as tf from '@tensorflow/tfjs-node';
import sharp from 'sharp';
import { logger } from '@/utils/logger';
import { AIServiceError } from '@/utils/errors';
import type {
  DiagnosisResult
} from '@/types/diagnosis.types';
import type {
  MLProvider,
  MLServiceConfig,
  MLDiagnosisResult,
  EnsembleDiagnosisResult,
  PlantIdRequest,
  PlantIdResponse,
  PlantNetRequest,
  PlantNetResponse,
  GoogleVisionRequest,
  GoogleVisionResponse,
  HuggingFaceRequest,
  HuggingFaceResponse,
  TensorFlowPrediction,
  ImagePreprocessingResult,
  MLServiceError
} from '@/types/ml.types';

class AIService {
  private mlConfigs: Map<MLProvider, MLServiceConfig> = new Map();
  private tfModel: tf.LayersModel | null = null;
  private confidenceThreshold: number = 0.7;
  private maxRetries: number = 3;
  private retryDelay: number = 1000;

  constructor() {
    this.initializeMLConfigs();
    this.initializeTensorFlowModel();
  }

  /**
   * Initialize ML service configurations from environment variables
   */
  private initializeMLConfigs(): void {
    // Plant.id configuration
    this.mlConfigs.set('plant_id', {
      provider: 'plant_id',
      apiKey: process.env.PLANT_ID_API_KEY,
      apiUrl: process.env.PLANT_ID_API_URL || 'https://api.plant.id/v3',
      confidenceThreshold: Number(process.env.ML_CONFIDENCE_THRESHOLD) || 0.7,
      timeout: Number(process.env.ML_TIMEOUT_SECONDS) * 1000 || 10000,
      enabled: Boolean(process.env.PLANT_ID_API_KEY)
    });

    // PlantNet configuration
    this.mlConfigs.set('plantnet', {
      provider: 'plantnet',
      apiKey: process.env.PLANTNET_API_KEY,
      apiUrl: process.env.PLANTNET_API_URL || 'https://my-api.plantnet.org/v1',
      confidenceThreshold: Number(process.env.ML_CONFIDENCE_THRESHOLD) || 0.7,
      timeout: Number(process.env.ML_TIMEOUT_SECONDS) * 1000 || 10000,
      enabled: Boolean(process.env.PLANTNET_API_KEY)
    });

    // Google Vision configuration
    this.mlConfigs.set('google_vision', {
      provider: 'google_vision',
      apiKey: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      apiUrl: 'https://vision.googleapis.com/v1',
      confidenceThreshold: Number(process.env.ML_CONFIDENCE_THRESHOLD) || 0.7,
      timeout: Number(process.env.ML_TIMEOUT_SECONDS) * 1000 || 10000,
      enabled: Boolean(process.env.GOOGLE_CLOUD_PROJECT_ID)
    });

    // TensorFlow configuration
    this.mlConfigs.set('tensorflow', {
      provider: 'tensorflow',
      modelUrl: process.env.TENSORFLOW_MODEL_URL,
      confidenceThreshold: Number(process.env.ML_CONFIDENCE_THRESHOLD) || 0.7,
      timeout: Number(process.env.ML_TIMEOUT_SECONDS) * 1000 || 10000,
      enabled: Boolean(process.env.TENSORFLOW_MODEL_URL)
    });

    // Hugging Face configuration
    this.mlConfigs.set('huggingface', {
      provider: 'huggingface',
      apiKey: process.env.HF_API_TOKEN,
      apiUrl: 'https://api-inference.huggingface.co/models',
      confidenceThreshold: Number(process.env.ML_CONFIDENCE_THRESHOLD) || 0.7,
      timeout: Number(process.env.ML_TIMEOUT_SECONDS) * 1000 || 10000,
      enabled: Boolean(process.env.HF_API_TOKEN)
    });

    this.confidenceThreshold = Number(process.env.ML_CONFIDENCE_THRESHOLD) || 0.7;
    
    logger.info('ML services initialized', {
      enabledProviders: Array.from(this.mlConfigs.entries())
        .filter(([_, config]) => config.enabled)
        .map(([provider]) => provider)
    });
  }

  /**
   * Initialize TensorFlow model for fallback
   */
  private async initializeTensorFlowModel(): Promise<void> {
    try {
      const modelUrl = process.env.TENSORFLOW_MODEL_URL;
      if (!modelUrl) {
        logger.info('TensorFlow model URL not provided, skipping TensorFlow initialization');
        return;
      }

      logger.info('Loading TensorFlow model', { modelUrl });
      this.tfModel = await tf.loadLayersModel(modelUrl);
      
      logger.info('TensorFlow model loaded successfully', {
        inputShape: this.tfModel.inputs[0].shape,
        outputShape: this.tfModel.outputs[0].shape,
      });
    } catch (error) {
      logger.error('Failed to load TensorFlow model', { error });
      // Continue without TensorFlow model
    }
  }

  /**
   * Preprocess image for ML analysis
   */
  private async preprocessImage(
    imageBuffer: Buffer,
    targetSize: number = 512
  ): Promise<ImagePreprocessingResult> {
    try {
      // Optimize image for ML APIs
      const processedBuffer = await sharp(imageBuffer)
        .resize(targetSize, targetSize, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      const metadata = await sharp(processedBuffer).metadata();
      
      return {
        buffer: processedBuffer,
        base64: processedBuffer.toString('base64'),
        dimensions: {
          width: metadata.width || targetSize,
          height: metadata.height || targetSize
        },
        format: metadata.format || 'jpeg',
        size: processedBuffer.length,
        quality: 85
      };
    } catch (error) {
      throw new AIServiceError('Failed to preprocess image', { error });
    }
  }

  /**
   * Run ML diagnosis on plant images using multiple providers
   */
  async diagnoseDisease(
    imageBuffers: Buffer[], 
    cropId?: string,
    useEnsemble: boolean = false
  ): Promise<DiagnosisResult> {
    try {
      const startTime = Date.now();
      logger.info('Starting ML disease diagnosis', {
        imageCount: imageBuffers.length,
        cropId,
        useEnsemble
      });

      // Preprocess images
      const processedImages = await Promise.all(
        imageBuffers.map(buffer => this.preprocessImage(buffer))
      );

      if (useEnsemble) {
        return await this.runEnsembleDiagnosis(processedImages, cropId);
      } else {
        return await this.runPrimaryDiagnosis(processedImages, cropId);
      }
    } catch (error) {
      logger.error('ML diagnosis failed', { error });
      throw new AIServiceError('Failed to process ML diagnosis', { error });
    }
  }

  /**
   * Run primary ML service diagnosis with fallbacks
   */
  private async runPrimaryDiagnosis(
    images: ImagePreprocessingResult[], 
    cropId?: string
  ): Promise<DiagnosisResult> {
    const primaryProvider = process.env.ML_PRIMARY_MODEL as MLProvider || 'plant_id';
    const fallbackProvider = process.env.ML_FALLBACK_MODEL as MLProvider || 'tensorflow';
    
    let result: MLDiagnosisResult | null = null;
    let lastError: Error | null = null;

    // Try primary provider
    try {
      result = await this.callMLProvider(primaryProvider, images, cropId);
      if (result.confidence >= this.confidenceThreshold) {
        return this.convertMLResultToDiagnosisResult(result);
      }
    } catch (error) {
      lastError = error as Error;
      logger.warn(`Primary ML provider ${primaryProvider} failed`, { error });
    }

    // Try fallback provider
    try {
      result = await this.callMLProvider(fallbackProvider, images, cropId);
      return this.convertMLResultToDiagnosisResult(result);
    } catch (error) {
      logger.error(`Fallback ML provider ${fallbackProvider} failed`, { error });
      throw lastError || error;
    }
  }

  /**
   * Run ensemble diagnosis using multiple ML providers
   */
  private async runEnsembleDiagnosis(
    images: ImagePreprocessingResult[], 
    cropId?: string
  ): Promise<DiagnosisResult> {
    const enabledProviders = Array.from(this.mlConfigs.entries())
      .filter(([_, config]) => config.enabled)
      .map(([provider]) => provider);

    if (enabledProviders.length === 0) {
      throw new AIServiceError('No ML providers available');
    }

    const results: MLDiagnosisResult[] = [];
    const errors: MLServiceError[] = [];

    // Call all available providers
    await Promise.allSettled(
      enabledProviders.map(async (provider) => {
        try {
          const result = await this.callMLProvider(provider, images, cropId);
          results.push(result);
        } catch (error) {
          errors.push({
            provider,
            error: (error as Error).message,
            retryable: false,
            timestamp: new Date()
          });
        }
      })
    );

    if (results.length === 0) {
      throw new AIServiceError('All ML providers failed', { errors });
    }

    // Combine results using ensemble method
    const ensembleResult = this.combineEnsembleResults(results);
    const firstResult = ensembleResult.individualResults[0];
    if (!firstResult) {
      throw new AIServiceError('No ML results found in ensemble');
    }
    return this.convertMLResultToDiagnosisResult(firstResult, ensembleResult);
  }

  /**
   * Call specific ML provider
   */
  private async callMLProvider(
    provider: MLProvider, 
    images: ImagePreprocessingResult[], 
    _cropId?: string
  ): Promise<MLDiagnosisResult> {
    const config = this.mlConfigs.get(provider);
    if (!config || !config.enabled) {
      throw new Error(`ML provider ${provider} not configured or disabled`);
    }

    const startTime = Date.now();
    
    try {
      switch (provider) {
        case 'plant_id':
          return await this.callPlantIdAPI(images, config);
        case 'plantnet':
          return await this.callPlantNetAPI(images, config);
        case 'google_vision':
          return await this.callGoogleVisionAPI(images, config);
        case 'tensorflow':
          return await this.callTensorFlowModel(images, config);
        case 'huggingface':
          return await this.callHuggingFaceAPI(images, config);
        default:
          throw new Error(`Unsupported ML provider: ${provider}`);
      }
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error(`ML provider ${provider} failed`, {
        error: (error as Error).message,
        processingTime,
        imageCount: images.length
      });
      throw error;
    }
  }

  /**
   * Call Plant.id API for disease detection
   */
  private async callPlantIdAPI(
    images: ImagePreprocessingResult[], 
    config: MLServiceConfig
  ): Promise<MLDiagnosisResult> {
    const request: PlantIdRequest = {
      images: images.map(img => img.base64),
      plant_details: ['common_names', 'url', 'description', 'taxonomy'],
      disease_details: ['description', 'treatment', 'classification'],
      modifiers: ['crops_fast', 'disease_similar_images'],
      plant_identification: true,
      crop: true
    };

    const startTime = Date.now();
    const response = await this.makeAPICall<PlantIdResponse>(
      `${config.apiUrl}/identification`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': config.apiKey!
        },
        data: request,
        timeout: config.timeout
      }
    );

    const processingTime = Date.now() - startTime;
    
    return this.parsePlantIdResponse(response.data, processingTime, images.length);
  }

  /**
   * Call PlantNet API for plant identification
   */
  private async callPlantNetAPI(
    images: ImagePreprocessingResult[], 
    config: MLServiceConfig
  ): Promise<MLDiagnosisResult> {
    const project = process.env.PLANTNET_PROJECT || 'weurope';
    const request: PlantNetRequest = {
      images: images.map((_, index) => ({
        organ: 'leaf',
        author: 'user',
        date: Date.now()
      })),
      organs: ['leaf', 'flower', 'fruit'],
      include_related_images: false,
      no_reject: false,
      nb_results: 5,
      lang: 'en'
    };

    const formData = new FormData();
    formData.append('query', JSON.stringify(request));
    
    images.forEach((image, index) => {
      formData.append(`images`, new Blob([image.buffer]), `image_${index}.jpg`);
    });

    const startTime = Date.now();
    const response = await this.makeAPICall<PlantNetResponse>(
      `${config.apiUrl}/identify/${project}?api-key=${config.apiKey}`,
      {
        method: 'POST',
        data: formData,
        timeout: config.timeout
      }
    );

    const processingTime = Date.now() - startTime;
    return this.parsePlantNetResponse(response.data, processingTime, images.length);
  }

  /**
   * Call Google Vision API for plant analysis
   */
  private async callGoogleVisionAPI(
    images: ImagePreprocessingResult[], 
    config: MLServiceConfig
  ): Promise<MLDiagnosisResult> {
    const request: GoogleVisionRequest = {
      requests: images.map(image => ({
        image: {
          content: image.base64
        },
        features: [
          { type: 'LABEL_DETECTION', maxResults: 10 },
          { type: 'OBJECT_LOCALIZATION', maxResults: 10 }
        ]
      }))
    };

    const startTime = Date.now();
    const response = await this.makeAPICall<GoogleVisionResponse>(
      `${config.apiUrl}/images:annotate?key=${process.env.GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        data: request,
        timeout: config.timeout
      }
    );

    const processingTime = Date.now() - startTime;
    return this.parseGoogleVisionResponse(response.data, processingTime, images.length);
  }

  /**
   * Call TensorFlow model for plant disease detection
   */
  private async callTensorFlowModel(
    images: ImagePreprocessingResult[], 
    config: MLServiceConfig
  ): Promise<MLDiagnosisResult> {
    if (!this.tfModel) {
      throw new Error('TensorFlow model not loaded');
    }

    const startTime = Date.now();
    const predictions: TensorFlowPrediction[] = [];

    for (const image of images) {
      // Convert image to tensor
      const imageTensor = tf.node.decodeImage(image.buffer, 3)
        .resizeNearestNeighbor([224, 224])
        .expandDims(0)
        .div(255.0);

      const prediction = this.tfModel.predict(imageTensor) as tf.Tensor;
      const predictionData = await prediction.data();
      
      // Get top predictions (assuming we have class labels)
      const diseaseClasses = this.getTensorFlowDiseaseClasses();
      const topPredictions = Array.from(predictionData)
        .map((confidence, index) => ({
          className: diseaseClasses[index] || `Disease_${index}`,
          probability: confidence
        }))
        .sort((a, b) => (b.probability as number) - (a.probability as number))
        .slice(0, 5);

      predictions.push(...topPredictions.map(p => ({ className: p.className, probability: p.probability as number })));
      
      // Clean up tensors
      imageTensor.dispose();
      prediction.dispose();
    }

    const processingTime = Date.now() - startTime;
    return this.parseTensorFlowResponse(predictions, processingTime, images.length);
  }

  /**
   * Call Hugging Face API for plant disease detection
   */
  private async callHuggingFaceAPI(
    images: ImagePreprocessingResult[], 
    config: MLServiceConfig
  ): Promise<MLDiagnosisResult> {
    const model = process.env.HF_PLANT_MODEL || 'microsoft/plant-disease-classifier';
    
    const startTime = Date.now();
    const allPredictions: HuggingFaceResponse[] = [];

    for (const image of images) {
      const response = await this.makeAPICall<HuggingFaceResponse[]>(
        `${config.apiUrl}/${model}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
          },
          data: {
            inputs: image.base64,
            options: {
              wait_for_model: true
            }
          },
          timeout: config.timeout
        }
      );

      allPredictions.push(...response.data);
    }

    const processingTime = Date.now() - startTime;
    return this.parseHuggingFaceResponse(allPredictions, processingTime, images.length);
  }

  /**
   * Make API call with retry logic
   */
  private async makeAPICall<T>(
    url: string, 
    config: any
  ): Promise<AxiosResponse<T>> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await axios(url, config);
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          logger.warn(`API call failed, retrying in ${delay}ms`, {
            url,
            attempt,
            error: lastError.message
          });
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError!;
  }

  /**
   * Combine ensemble results from multiple providers
   */
  private combineEnsembleResults(results: MLDiagnosisResult[]): EnsembleDiagnosisResult {
    const diseaseVotes = new Map<string, { votes: number; totalConfidence: number; providers: MLProvider[] }>();
    
    // Collect votes and confidence scores
    results.forEach(result => {
      result.predictions.forEach(prediction => {
        const key = prediction.diseaseId;
        if (!diseaseVotes.has(key)) {
          diseaseVotes.set(key, { votes: 0, totalConfidence: 0, providers: [] });
        }
        
        const vote = diseaseVotes.get(key)!;
        vote.votes++;
        vote.totalConfidence += prediction.confidence * result.confidence; // Weight by provider confidence
        vote.providers.push(result.provider);
      });
    });

    // Find consensus prediction
    const sortedDiseases = Array.from(diseaseVotes.entries())
      .map(([diseaseId, vote]) => ({
        diseaseId,
        votes: vote.votes,
        avgConfidence: vote.totalConfidence / vote.votes,
        providers: vote.providers
      }))
      .sort((a, b) => {
        // Sort by votes first, then by confidence
        if (a.votes !== b.votes) return b.votes - a.votes;
        return b.avgConfidence - a.avgConfidence;
      });

    const topPrediction = sortedDiseases[0];
    if (!topPrediction) {
      throw new Error('No predictions found in ensemble results');
    }
    const agreementLevel = topPrediction.votes / results.length;
    const conflictingPredictions = sortedDiseases.length > 1 && sortedDiseases[1].votes > 0;
    
    // Get detailed info for top prediction
    const detailedPrediction = results
      .flatMap(r => r.predictions)
      .find(p => p.diseaseId === topPrediction.diseaseId);
      
    if (!detailedPrediction) {
      throw new Error('Could not find detailed prediction for top result');
    }

    return {
      finalPrediction: {
        diseaseId: topPrediction.diseaseId,
        diseaseName: detailedPrediction.diseaseName,
        confidence: topPrediction.avgConfidence,
        severity: detailedPrediction.severity || 'medium',
        description: detailedPrediction.description || '',
        treatment: detailedPrediction.treatment || {},
        symptoms: detailedPrediction.symptoms || [],
        causes: detailedPrediction.causes || [],
        affectedAreas: detailedPrediction.affectedAreas || []
      },
      individualResults: results,
      consensus: {
        agreementLevel,
        conflictingPredictions,
        reliabilityScore: agreementLevel * Math.min(...results.map(r => r.confidence))
      },
      metadata: {
        modelsUsed: results.map(r => r.provider),
        totalProcessingTime: Math.max(...results.map(r => r.metadata.processingTime)),
        imageCount: results[0]?.metadata.imageCount || 0,
        ensembleMethod: 'weighted_average'
      }
    };
  }

  /**
   * Convert ML result to diagnosis result format
   */
  private convertMLResultToDiagnosisResult(
    mlResult: MLDiagnosisResult, 
    ensembleResult?: EnsembleDiagnosisResult
  ): DiagnosisResult {
    const topPrediction = ensembleResult?.finalPrediction || mlResult.predictions[0];
    
    if (!topPrediction) {
      throw new AIServiceError('No predictions found in ML result');
    }

    return {
      diseaseId: topPrediction.diseaseId,
      diseaseName: topPrediction.diseaseName,
      confidence: mlResult.confidence,
      severity: topPrediction.severity || this.calculateSeverity(mlResult.confidence),
      affectedArea: 80, // Default percentage
      symptoms: topPrediction.symptoms || [],
      causes: topPrediction.causes || [],
      treatments: this.convertTreatmentFormat(topPrediction.treatment),
      preventionTips: topPrediction.treatment?.prevention || [],
      expectedRecoveryTime: this.estimateRecoveryTime(topPrediction.severity || 'medium'),
      riskFactors: []
    };
  }

  /**
   * Calculate disease severity based on confidence
   */
  private calculateSeverity(confidence: number): 'low' | 'medium' | 'high' | 'critical' {
    if (confidence >= 0.9) return 'high';
    if (confidence >= 0.7) return 'medium';
    if (confidence >= 0.5) return 'low';
    return 'critical';
  }

  /**
   * Convert ML treatment format to diagnosis treatment format
   */
  private convertTreatmentFormat(treatment?: any): any[] {
    if (!treatment) return [];
    
    const treatments = [];
    
    if (treatment.chemical && treatment.chemical.length > 0) {
      treatments.push({
        type: 'chemical',
        steps: treatment.chemical,
        duration: '7-14 days',
        frequency: 'Daily'
      });
    }
    
    if (treatment.biological && treatment.biological.length > 0) {
      treatments.push({
        type: 'biological',
        steps: treatment.biological,
        duration: '14-21 days',
        frequency: 'Weekly'
      });
    }
    
    if (treatment.organic && treatment.organic.length > 0) {
      treatments.push({
        type: 'organic',
        steps: treatment.organic,
        duration: '21-30 days',
        frequency: 'Bi-weekly'
      });
    }
    
    return treatments;
  }

  /**
   * Estimate recovery time based on severity
   */
  private estimateRecoveryTime(severity: 'low' | 'medium' | 'high' | 'critical'): string {
    switch (severity) {
      case 'low': return '1-2 weeks';
      case 'medium': return '2-4 weeks';
      case 'high': return '1-2 months';
      case 'critical': return '2-3 months';
      default: return '2-4 weeks';
    }
  }

  /**
   * Get TensorFlow disease classes
   */
  private getTensorFlowDiseaseClasses(): string[] {
    // PlantVillage dataset classes
    return [
      'Apple___Apple_scab',
      'Apple___Black_rot',
      'Apple___Cedar_apple_rust',
      'Apple___healthy',
      'Blueberry___healthy',
      'Cherry_(including_sour)___Powdery_mildew',
      'Cherry_(including_sour)___healthy',
      'Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot',
      'Corn_(maize)___Common_rust_',
      'Corn_(maize)___Northern_Leaf_Blight',
      'Corn_(maize)___healthy',
      'Grape___Black_rot',
      'Grape___Esca_(Black_Measles)',
      'Grape___Leaf_blight_(Isariopsis_Leaf_Spot)',
      'Grape___healthy',
      'Orange___Haunglongbing_(Citrus_greening)',
      'Peach___Bacterial_spot',
      'Peach___healthy',
      'Pepper,_bell___Bacterial_spot',
      'Pepper,_bell___healthy',
      'Potato___Early_blight',
      'Potato___Late_blight',
      'Potato___healthy',
      'Raspberry___healthy',
      'Soybean___healthy',
      'Squash___Powdery_mildew',
      'Strawberry___Leaf_scorch',
      'Strawberry___healthy',
      'Tomato___Bacterial_spot',
      'Tomato___Early_blight',
      'Tomato___Late_blight',
      'Tomato___Leaf_Mold',
      'Tomato___Septoria_leaf_spot',
      'Tomato___Spider_mites Two-spotted_spider_mite',
      'Tomato___Target_Spot',
      'Tomato___Yellow_Leaf_Curl_Virus',
      'Tomato___mosaic_virus',
      'Tomato___healthy'
    ];
  }

  /**
   * Parse Plant.id API response
   */
  private parsePlantIdResponse(
    response: PlantIdResponse, 
    processingTime: number, 
    imageCount: number
  ): MLDiagnosisResult {
    const predictions = [];
    const isHealthy = response.is_plant && !response.disease?.suggestions.length;
    
    if (response.disease?.suggestions) {
      for (const disease of response.disease.suggestions) {
        predictions.push({
          diseaseId: disease.id,
          diseaseName: disease.name,
          confidence: disease.probability,
          description: disease.description,
          treatment: {
            chemical: disease.treatment.chemical || [],
            biological: disease.treatment.biological || [],
            prevention: disease.treatment.prevention || []
          },
          severity: (disease.probability > 0.8 ? 'high' : disease.probability > 0.6 ? 'medium' : 'low') as const,
          symptoms: [],
          causes: [],
          affectedAreas: ['leaves'] // Default
        });
      }
    }
    
    if (predictions.length === 0) {
      predictions.push({
        diseaseId: 'healthy',
        diseaseName: 'Healthy Plant',
        confidence: response.is_plant ? 0.9 : 0.3,
        description: 'Plant appears to be healthy',
        severity: 'low' as const
      });
    }

    return {
      provider: 'plant_id',
      confidence: Math.max(...predictions.map(p => p.confidence)),
      predictions,
      isHealthy,
      metadata: {
        processingTime,
        imageCount,
        modelVersion: '3.0',
        rawResponse: response
      }
    };
  }

  /**
   * Parse PlantNet API response
   */
  private parsePlantNetResponse(
    response: PlantNetResponse, 
    processingTime: number, 
    imageCount: number
  ): MLDiagnosisResult {
    const predictions = response.results.map(result => ({
      diseaseId: result.species.scientificNameWithoutAuthor.replace(/\s+/g, '_'),
      diseaseName: result.species.commonNames[0] || result.species.scientificNameWithoutAuthor,
      confidence: result.score,
      description: `Plant identification: ${result.species.scientificNameWithoutAuthor}`,
      severity: 'low' as const
    }));

    return {
      provider: 'plantnet',
      confidence: predictions[0]?.confidence || 0,
      predictions,
      isHealthy: true, // PlantNet is for identification, not disease detection
      metadata: {
        processingTime,
        imageCount,
        language: response.language,
        rawResponse: response
      }
    };
  }

  /**
   * Parse Google Vision API response
   */
  private parseGoogleVisionResponse(
    response: GoogleVisionResponse, 
    processingTime: number, 
    imageCount: number
  ): MLDiagnosisResult {
    const predictions = [];
    const labels = response.responses[0]?.labelAnnotations || [];
    
    // Look for plant/disease related labels
    const plantLabels = labels.filter(label => 
      label.description.toLowerCase().includes('plant') ||
      label.description.toLowerCase().includes('leaf') ||
      label.description.toLowerCase().includes('disease') ||
      label.description.toLowerCase().includes('pest')
    );

    for (const label of plantLabels.slice(0, 5)) {
      predictions.push({
        diseaseId: label.description.toLowerCase().replace(/\s+/g, '_'),
        diseaseName: label.description,
        confidence: label.score,
        description: `Detected: ${label.description}`,
        severity: 'medium' as const
      });
    }

    if (predictions.length === 0) {
      predictions.push({
        diseaseId: 'unknown',
        diseaseName: 'Unable to identify disease',
        confidence: 0.3,
        description: 'No plant diseases detected by Google Vision',
        severity: 'low' as const
      });
    }

    return {
      provider: 'google_vision',
      confidence: predictions[0]?.confidence || 0.3,
      predictions,
      isHealthy: !plantLabels.some(l => l.description.toLowerCase().includes('disease')),
      metadata: {
        processingTime,
        imageCount,
        rawResponse: response
      }
    };
  }

  /**
   * Parse TensorFlow model response
   */
  private parseTensorFlowResponse(
    predictions: TensorFlowPrediction[], 
    processingTime: number, 
    imageCount: number
  ): MLDiagnosisResult {
    const mlPredictions = predictions.slice(0, 5).map(pred => {
      const parts = pred.className.split('___');
      const crop = parts[0];
      const disease = parts[1] || 'unknown';
      
      return {
        diseaseId: pred.className.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        diseaseName: disease === 'healthy' ? `Healthy ${crop}` : disease.replace(/_/g, ' '),
        confidence: pred.probability,
        description: `${crop}: ${disease}`,
        severity: (pred.probability > 0.8 ? 'high' : pred.probability > 0.6 ? 'medium' : 'low') as const
      };
    });

    return {
      provider: 'tensorflow',
      confidence: mlPredictions[0]?.confidence || 0,
      predictions: mlPredictions,
      isHealthy: predictions[0]?.className.includes('healthy') || false,
      metadata: {
        processingTime,
        imageCount,
        modelVersion: 'PlantVillage-v1'
      }
    };
  }

  /**
   * Parse Hugging Face API response
   */
  private parseHuggingFaceResponse(
    predictions: HuggingFaceResponse[], 
    processingTime: number, 
    imageCount: number
  ): MLDiagnosisResult {
    const mlPredictions = predictions.slice(0, 5).map(pred => ({
      diseaseId: pred.label.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      diseaseName: pred.label,
      confidence: pred.score,
      description: `Detected: ${pred.label}`,
      severity: (pred.score > 0.8 ? 'high' : pred.score > 0.6 ? 'medium' : 'low') as const
    }));

    return {
      provider: 'huggingface',
      confidence: mlPredictions[0]?.confidence || 0,
      predictions: mlPredictions,
      isHealthy: predictions[0]?.label.toLowerCase().includes('healthy') || false,
      metadata: {
        processingTime,
        imageCount,
        rawResponse: predictions
      }
    };
  }

  /**
   * Update confidence threshold for all providers
   */
  updateConfidenceThreshold(threshold: number): void {
    if (threshold < 0 || threshold > 1) {
      throw new AIServiceError('Confidence threshold must be between 0 and 1');
    }
    
    this.confidenceThreshold = threshold;
    
    // Update individual provider configs
    this.mlConfigs.forEach(config => {
      config.confidenceThreshold = threshold;
    });
    
    logger.info('Updated confidence threshold', { threshold });
  }

  /**
   * Get ML service information and status
   */
  getServiceInfo(): any {
    const enabledProviders = Array.from(this.mlConfigs.entries())
      .filter(([_, config]) => config.enabled)
      .map(([provider, config]) => ({
        provider,
        apiUrl: config.apiUrl,
        confidenceThreshold: config.confidenceThreshold,
        timeout: config.timeout,
        hasApiKey: Boolean(config.apiKey)
      }));

    return {
      enabledProviders,
      totalProviders: enabledProviders.length,
      primaryProvider: process.env.ML_PRIMARY_MODEL || 'plant_id',
      fallbackProvider: process.env.ML_FALLBACK_MODEL || 'tensorflow',
      ensembleEnabled: process.env.ML_USE_ENSEMBLE === 'true',
      globalConfidenceThreshold: this.confidenceThreshold,
      tensorflowLoaded: Boolean(this.tfModel),
      maxImageSize: process.env.ML_IMAGE_MAX_SIZE || '2048',
      supportedFormats: (process.env.ML_SUPPORTED_FORMATS || 'jpg,jpeg,png,webp').split(',')
    };
  }

  /**
   * Test ML service with sample data
   */
  async testMLService(provider: MLProvider, testImages: Buffer[]): Promise<any> {
    try {
      const config = this.mlConfigs.get(provider);
      if (!config || !config.enabled) {
        throw new Error(`Provider ${provider} not available`);
      }

      const processedImages = await Promise.all(
        testImages.map(buffer => this.preprocessImage(buffer))
      );

      const result = await this.callMLProvider(provider, processedImages);
      
      return {
        provider,
        success: true,
        confidence: result.confidence,
        predictions: result.predictions.slice(0, 3),
        processingTime: result.metadata.processingTime,
        isHealthy: result.isHealthy
      };
    } catch (error) {
      return {
        provider,
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Get provider health status
   */
  async getProviderHealthStatus(): Promise<any> {
    const results = [];
    
    for (const [provider, config] of this.mlConfigs.entries()) {
      if (!config.enabled) {
        results.push({ provider, status: 'disabled', reason: 'Not configured' });
        continue;
      }

      try {
        // Simple health check - try to make a basic API call
        const startTime = Date.now();
        
        switch (provider) {
          case 'plant_id':
            await axios.get(`${config.apiUrl}/health`, { 
              headers: { 'Api-Key': config.apiKey },
              timeout: 5000 
            });
            break;
          case 'plantnet':
            // PlantNet doesn't have a health endpoint, just check if API key exists
            if (!config.apiKey) throw new Error('No API key');
            break;
          case 'tensorflow':
            if (!this.tfModel) throw new Error('Model not loaded');
            break;
          case 'google_vision':
          case 'huggingface':
            if (!config.apiKey) throw new Error('No API key');
            break;
        }
        
        results.push({
          provider,
          status: 'healthy',
          responseTime: Date.now() - startTime
        });
      } catch (error) {
        results.push({
          provider,
          status: 'unhealthy',
          error: (error as Error).message
        });
      }
    }
    
    return results;
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.tfModel) {
      this.tfModel.dispose();
      this.tfModel = null;
      logger.info('TensorFlow model disposed');
    }
    
    this.mlConfigs.clear();
    logger.info('ML service disposed');
  }
}

export const aiService = new AIService();
export { AIService };