import { Request, Response } from 'express';
import { 
  CurrentWeatherRequest,
  WeatherForecastRequest,
  WeatherAlertsRequest,
  AgriculturalAdviceRequest,
  WeatherHistoryRequest,
  WeatherStatsRequest,
  AlertSubscriptionRequest,
  CropRecommendationRequest,
  IrrigationRecommendationRequest,
  RiskAssessmentRequest,
  PlantingCalendarRequest,
  WeatherSourceConfig
} from '@/controllers/weatherController.types';

// Route parameter types
export interface WeatherLocationParams {
  lat: string;
  lng: string;
}

export interface SubscriptionParams {
  subscriptionId: string;
}

// Query parameter types
export interface GetCurrentWeatherQuery {
  lat: string;
  lng: string;
  units?: 'metric' | 'imperial';
  lang?: string;
}

export interface GetForecastQuery {
  lat: string;
  lng: string;
  days?: string;
  units?: 'metric' | 'imperial';
  lang?: string;
}

export interface GetWeatherAlertsQuery {
  lat: string;
  lng: string;
  radius?: string;
  types?: string;
}

export interface GetHistoricalWeatherQuery {
  lat: string;
  lng: string;
  startDate: string;
  endDate: string;
  interval?: 'hourly' | 'daily';
}

export interface GetWeatherStatsQuery {
  lat: string;
  lng: string;
  period: 'week' | 'month' | 'season' | 'year';
  year?: string;
}

// Express request types
export interface GetCurrentWeatherRequestHandler extends Request<{}, any, {}, GetCurrentWeatherQuery> {}
export interface GetForecastRequestHandler extends Request<{}, any, {}, GetForecastQuery> {}
export interface GetWeatherAlertsRequestHandler extends Request<{}, any, {}, GetWeatherAlertsQuery> {}

export interface GetAgriculturalAdviceRequestHandler extends Request<{}, any, AgriculturalAdviceRequest> {}
export interface GetHistoricalWeatherRequestHandler extends Request<{}, any, {}, GetHistoricalWeatherQuery> {}
export interface GetWeatherStatsRequestHandler extends Request<{}, any, {}, GetWeatherStatsQuery> {}

export interface SubscribeToAlertsRequestHandler extends Request<{}, any, AlertSubscriptionRequest> {}
export interface UnsubscribeFromAlertsRequestHandler extends Request<SubscriptionParams, any> {}

export interface GetCropRecommendationsRequestHandler extends Request<{}, any, CropRecommendationRequest> {}
export interface GetIrrigationRecommendationsRequestHandler extends Request<{}, any, IrrigationRecommendationRequest> {}
export interface GetRiskAssessmentRequestHandler extends Request<{}, any, RiskAssessmentRequest> {}
export interface GetPlantingCalendarRequestHandler extends Request<{}, any, PlantingCalendarRequest> {}

export interface UpdateWeatherSourcesRequestHandler extends Request<{}, any, WeatherSourceConfig> {}

// Response types with Express
export interface WeatherResponseHandler extends Response<any> {}
export interface WeatherListResponseHandler extends Response<any[]> {}
export interface WeatherSubscriptionResponseHandler extends Response<any> {}