export type MLProvider = 'plant_id' | 'plantnet' | 'tensorflow' | 'google_vision' | 'huggingface';

export interface MLServiceConfig {
  provider: MLProvider;
  apiKey?: string;
  apiUrl?: string;
  modelUrl?: string;
  confidenceThreshold: number;
  timeout: number;
  enabled: boolean;
}

export interface PlantIdRequest {
  images: string[]; // base64 encoded
  plant_details?: string[];
  disease_details?: string[];
  modifiers?: string[];
  plant_net_search?: boolean;
  plant_identification?: boolean;
  crop?: boolean;
}

export interface PlantIdResponse {
  id: string;
  custom_id?: string;
  created: number;
  completed: number;
  is_plant: boolean;
  disease?: {
    suggestions: PlantIdDisease[];
  };
  plant?: {
    suggestions: PlantIdPlant[];
  };
}

export interface PlantIdDisease {
  id: string;
  name: string;
  probability: number;
  description: string;
  treatment: {
    chemical?: string[];
    biological?: string[];
    prevention?: string[];
  };
  classification: {
    type: string;
    kingdom: string;
    phylum: string;
    class: string;
    order: string;
    family: string;
    genus: string;
    species: string;
  };
  common_names: string[];
  url: string;
  similar_images: Array<{
    id: string;
    similarity: number;
    url: string;
    url_small: string;
  }>;
}

export interface PlantIdPlant {
  id: string;
  name: string;
  probability: number;
  description: string;
  classification: {
    kingdom: string;
    phylum: string;
    class: string;
    order: string;
    family: string;
    genus: string;
    species: string;
  };
  common_names: string[];
  url: string;
  similar_images: Array<{
    id: string;
    similarity: number;
    url: string;
    url_small: string;
  }>;
  edible_parts: string[];
  watering: {
    min: number;
    max: number;
  };
  propagation_methods: string[];
}

export interface PlantNetRequest {
  images: Array<{
    organ: string;
    author: string;
    date: number;
  }>;
  organs: string[];
  include_related_images: boolean;
  no_reject: boolean;
  nb_results: number;
  lang: string;
}

export interface PlantNetResponse {
  query: {
    project: string;
    images: Array<{
      organ: string;
      author: string;
      date: number;
    }>;
    organs: string[];
    includeRelatedImages: boolean;
    noReject: boolean;
    nbResults: number;
    lang: string;
  };
  language: string;
  preferedReferential: string;
  results: PlantNetPlant[];
  version: string;
  remainingIdentificationRequests: number;
}

export interface PlantNetPlant {
  score: number;
  species: {
    scientificNameWithoutAuthor: string;
    scientificNameAuthorship: string;
    genus: {
      scientificNameWithoutAuthor: string;
      scientificNameAuthorship: string;
    };
    family: {
      scientificNameWithoutAuthor: string;
      scientificNameAuthorship: string;
    };
    commonNames: string[];
  };
  images: Array<{
    organ: string;
    author: string;
    license: string;
    date: {
      timestamp: number;
      string: string;
    };
    citation: string;
    url: {
      o: string;
      m: string;
      s: string;
    };
  }>;
}

export interface GoogleVisionRequest {
  requests: Array<{
    image: {
      content?: string; // base64
      source?: {
        imageUri: string;
      };
    };
    features: Array<{
      type: string;
      maxResults: number;
    }>;
    imageContext?: {
      cropHintsParams?: {
        aspectRatios: number[];
      };
      languageHints?: string[];
    };
  }>;
}

export interface GoogleVisionResponse {
  responses: Array<{
    localizedObjectAnnotations?: Array<{
      mid: string;
      languageCode: string;
      name: string;
      score: number;
      boundingPoly: {
        normalizedVertices: Array<{
          x: number;
          y: number;
        }>;
      };
    }>;
    labelAnnotations?: Array<{
      mid: string;
      description: string;
      score: number;
      confidence: number;
    }>;
    textAnnotations?: Array<{
      locale: string;
      description: string;
      boundingPoly: {
        vertices: Array<{
          x: number;
          y: number;
        }>;
      };
    }>;
    error?: {
      code: number;
      message: string;
      status: string;
    };
  }>;
}

export interface HuggingFaceRequest {
  inputs: string | string[] | Buffer | Buffer[];
  parameters?: {
    top_k?: number;
    temperature?: number;
    max_length?: number;
    do_sample?: boolean;
  };
  options?: {
    wait_for_model?: boolean;
    use_cache?: boolean;
  };
}

export interface HuggingFaceResponse {
  label: string;
  score: number;
}

export interface TensorFlowPrediction {
  className: string;
  probability: number;
}

export interface MLDiagnosisResult {
  provider: MLProvider;
  confidence: number;
  predictions: Array<{
    diseaseId: string;
    diseaseName: string;
    confidence: number;
    description?: string;
    treatment?: {
      chemical?: string[];
      biological?: string[];
      prevention?: string[];
      organic?: string[];
    };
    severity?: 'low' | 'medium' | 'high' | 'critical';
    symptoms?: string[];
    causes?: string[];
    affectedAreas?: string[];
  }>;
  isHealthy: boolean;
  metadata: {
    modelVersion?: string;
    processingTime: number;
    imageCount: number;
    language?: string;
    apiCallsUsed?: number;
    rawResponse?: any;
  };
  error?: string;
}

export interface EnsembleDiagnosisResult {
  finalPrediction: {
    diseaseId: string;
    diseaseName: string;
    confidence: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    treatment: {
      chemical?: string[];
      biological?: string[];
      prevention?: string[];
      organic?: string[];
    };
    symptoms: string[];
    causes: string[];
    affectedAreas: string[];
  };
  individualResults: MLDiagnosisResult[];
  consensus: {
    agreementLevel: number; // 0-1
    conflictingPredictions: boolean;
    reliabilityScore: number; // 0-1
  };
  metadata: {
    modelsUsed: MLProvider[];
    totalProcessingTime: number;
    imageCount: number;
    ensembleMethod: 'weighted_average' | 'majority_vote' | 'confidence_based';
  };
}

export interface MLServiceError {
  provider: MLProvider;
  error: string;
  code?: string | number;
  retryable: boolean;
  timestamp: Date;
}

export interface MLApiUsage {
  provider: MLProvider;
  date: string;
  requestsUsed: number;
  requestsLimit: number;
  costPerRequest?: number;
  totalCost?: number;
}

export interface ImagePreprocessingResult {
  buffer: Buffer;
  base64: string;
  dimensions: {
    width: number;
    height: number;
  };
  format: string;
  size: number;
  quality?: number;
}