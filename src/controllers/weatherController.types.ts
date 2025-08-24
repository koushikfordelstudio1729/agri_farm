import type { Request, Response } from 'express';
import type {
  WeatherData,
  LocationData,
  WeatherAlert,
  AgriculturalFactors,
  DatabaseId,
  ApiResponse,
  TypedResponse,
  AuthenticatedUser,
} from '@/types';

// Request interfaces
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

export interface GetCurrentWeatherRequest extends AuthenticatedRequest {
  query: {
    latitude: string;
    longitude: string;
    locationName?: string;
  };
}

export interface GetWeatherForecastRequest extends AuthenticatedRequest {
  query: {
    latitude: string;
    longitude: string;
    days?: string;
    locationName?: string;
  };
}

export interface GetHistoricalWeatherRequest extends AuthenticatedRequest {
  query: {
    latitude: string;
    longitude: string;
    startDate: string;
    endDate: string;
  };
}

export interface GetWeatherAlertsRequest extends AuthenticatedRequest {
  query: {
    latitude: string;
    longitude: string;
    severity?: 'low' | 'medium' | 'high';
  };
}

export interface GetAgriculturalAdviceRequest extends AuthenticatedRequest {
  query: {
    latitude: string;
    longitude: string;
    cropType?: string;
    growthStage?: string;
  };
}

export interface SaveLocationRequest extends AuthenticatedRequest {
  body: {
    name: string;
    latitude: number;
    longitude: number;
    country?: string;
    region?: string;
    isDefault?: boolean;
  };
}

export interface GetSavedLocationsRequest extends AuthenticatedRequest {}

export interface DeleteLocationRequest extends AuthenticatedRequest {
  params: {
    locationId: string;
  };
}

export interface GetWeatherStatsRequest extends AuthenticatedRequest {
  query: {
    latitude: string;
    longitude: string;
    period?: '7d' | '30d' | '90d' | '1y';
  };
}

// Response interfaces
export interface WeatherResponse {
  location: {
    name: string;
    latitude: number;
    longitude: number;
    country: string;
    region: string;
  };
  current: {
    temperature: number;
    feelsLike: number;
    humidity: number;
    pressure: number;
    windSpeed: number;
    windDirection: number;
    visibility: number;
    uvIndex: number;
    cloudCover: number;
    condition: string;
    description: string;
    icon: string;
    precipitation?: number;
  };
  agriculturalFactors: {
    soilMoisture: 'very_low' | 'low' | 'moderate' | 'high';
    growingDegreeDays: number;
    evapotranspiration: number;
    diseaseRisk: 'low' | 'moderate' | 'high';
    pestRisk: 'low' | 'moderate' | 'high';
  };
  timestamp: Date;
  source: string;
}

export interface WeatherForecastResponse {
  location: {
    name: string;
    latitude: number;
    longitude: number;
    country: string;
    region: string;
  };
  forecast: Array<{
    date: Date;
    temperature: {
      min: number;
      max: number;
      average: number;
    };
    humidity: {
      min: number;
      max: number;
      average: number;
    };
    precipitation: {
      probability: number;
      amount: number;
    };
    wind: {
      speed: number;
      direction: number;
    };
    condition: {
      main: string;
      description: string;
      icon: string;
    };
    description: string;
    icon: string;
    agriculturalFactors: {
      soilMoisture: 'very_low' | 'low' | 'moderate' | 'high';
      growingDegreeDays: number;
      diseaseRisk: 'low' | 'moderate' | 'high';
      pestRisk: 'low' | 'moderate' | 'high';
    };
  }>;
  timestamp: Date;
  source: string;
}

export interface HistoricalWeatherResponse {
  location: {
    name: string;
    latitude: number;
    longitude: number;
    country: string;
    region: string;
  };
  period: {
    startDate: Date;
    endDate: Date;
  };
  data: Array<{
    timestamp: Date;
    temperature: number;
    humidity: number;
    precipitation: number;
    windSpeed: number;
    pressure: number;
    condition: string;
    description: string;
    agriculturalFactors?: AgriculturalFactors;
  }>;
  statistics: {
    temperature: {
      min: number;
      max: number;
      average: number;
    };
    humidity: {
      min: number;
      max: number;
      average: number;
    };
    precipitation: {
      total: number;
      average: number;
      days: number;
    };
    recordCount: number;
  };
  source: string;
}

export interface WeatherAlertResponse {
  location: {
    name: string;
    latitude: number;
    longitude: number;
    country: string;
    region: string;
  };
  alerts: Array<{
    id: string;
    type: 'temperature' | 'precipitation' | 'wind' | 'humidity' | 'frost' | 'drought';
    severity: 'low' | 'medium' | 'high';
    title: string;
    description: string;
    startTime: Date;
    endTime: Date;
    affectedAreas: string[];
    recommendations: string[];
    agriculturalImpact: {
      crops: string[];
      riskLevel: 'low' | 'moderate' | 'high';
      actions: string[];
    };
  }>;
  alertsCount: number;
  timestamp: Date;
}

export interface AgriculturalAdviceResponse {
  location: {
    name: string;
    latitude: number;
    longitude: number;
    country: string;
    region: string;
  };
  currentConditions: {
    temperature: number;
    humidity: number;
    precipitation: number;
    windSpeed: number;
    condition: string;
    description: string;
  };
  cropType: string;
  growthStage: string;
  recommendations: string[];
  warnings: string[];
  optimalConditions: {
    temperature: { min: number; max: number };
    humidity: { min: number; max: number };
    soilMoisture: string;
    sunlight: string;
  };
  agriculturalFactors: {
    soilMoisture: 'very_low' | 'low' | 'moderate' | 'high';
    growingDegreeDays: number;
    evapotranspiration: number;
    diseaseRisk: 'low' | 'moderate' | 'high';
    pestRisk: 'low' | 'moderate' | 'high';
  };
  timestamp: Date;
}

export interface LocationResponse {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  region: string;
  isDefault: boolean;
  createdAt: Date;
}

export interface WeatherStatsResponse {
  period: string;
  overview: {
    recordCount: number;
    dataQuality: 'good' | 'fair' | 'poor' | 'insufficient';
    coverage: string;
  };
  temperature: {
    min: number;
    max: number;
    average: number;
  };
  humidity: {
    min: number;
    max: number;
    average: number;
  };
  precipitation: {
    total: number;
    average: number;
    days: number;
  };
  trends: {
    temperatureTrend: 'increasing' | 'decreasing' | 'stable';
    precipitationTrend: 'increasing' | 'decreasing' | 'stable';
    humidityTrend: 'increasing' | 'decreasing' | 'stable';
  };
  agriculturalSummary: {
    favorableDays: number;
    stressDays: number;
    criticalDays: number;
    avgGrowingDegreeDays: number;
  };
}

// Controller method types
export type GetCurrentWeatherController = (
  req: GetCurrentWeatherRequest,
  res: TypedResponse<WeatherResponse>
) => Promise<void>;

export type GetWeatherForecastController = (
  req: GetWeatherForecastRequest,
  res: TypedResponse<WeatherForecastResponse>
) => Promise<void>;

export type GetHistoricalWeatherController = (
  req: GetHistoricalWeatherRequest,
  res: TypedResponse<HistoricalWeatherResponse>
) => Promise<void>;

export type GetWeatherAlertsController = (
  req: GetWeatherAlertsRequest,
  res: TypedResponse<WeatherAlertResponse>
) => Promise<void>;

export type GetAgriculturalAdviceController = (
  req: GetAgriculturalAdviceRequest,
  res: TypedResponse<AgriculturalAdviceResponse>
) => Promise<void>;

export type SaveLocationController = (
  req: SaveLocationRequest,
  res: TypedResponse<LocationResponse>
) => Promise<void>;

export type GetSavedLocationsController = (
  req: GetSavedLocationsRequest,
  res: TypedResponse<LocationResponse[]>
) => Promise<void>;

export type DeleteLocationController = (
  req: DeleteLocationRequest,
  res: TypedResponse<{}>
) => Promise<void>;

export type GetWeatherStatsController = (
  req: GetWeatherStatsRequest,
  res: TypedResponse<WeatherStatsResponse>
) => Promise<void>;

// Service response types
export interface WeatherServiceResult {
  success: boolean;
  data?: WeatherResponse;
  message?: string;
  error?: string;
}

export interface WeatherApiError {
  code: number;
  message: string;
  details?: string;
}

// Validation types
export interface WeatherValidationErrors {
  latitude?: string[];
  longitude?: string[];
  startDate?: string[];
  endDate?: string[];
  locationName?: string[];
  cropType?: string[];
  growthStage?: string[];
}