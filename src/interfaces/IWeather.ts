import { Document, Model } from 'mongoose';

export interface IWeather extends Document {
  location: {
    latitude: number;
    longitude: number;
    city?: string;
    state?: string;
    country: string;
    timezone?: string;
  };
  current: {
    temperature: number;
    feelsLike: number;
    humidity: number;
    pressure: number;
    visibility: number;
    windSpeed: number;
    windDirection: number;
    windGust?: number;
    cloudCover: number;
    uvIndex: number;
    dewPoint: number;
    condition: string;
    description: string;
    icon: string;
  };
  forecast: Array<{
    date: Date;
    dayOfWeek: string;
    high: number;
    low: number;
    humidity: number;
    windSpeed: number;
    windDirection: number;
    precipitationChance: number;
    precipitationAmount: number;
    condition: string;
    description: string;
    icon: string;
    sunrise?: Date;
    sunset?: Date;
    moonPhase?: string;
  }>;
  hourly?: Array<{
    time: Date;
    temperature: number;
    feelsLike: number;
    humidity: number;
    windSpeed: number;
    precipitationChance: number;
    condition: string;
    icon: string;
  }>;
  alerts?: Array<{
    id: string;
    title: string;
    description: string;
    severity: 'minor' | 'moderate' | 'severe' | 'extreme';
    urgency: 'immediate' | 'expected' | 'future' | 'past';
    areas: string[];
    startTime: Date;
    endTime: Date;
    instruction?: string;
  }>;
  agricultural: {
    growingDegreeDays: number;
    soilTemperature?: number;
    soilMoisture?: string;
    evapotranspiration?: number;
    recommendations: Array<{
      category: 'irrigation' | 'fertilization' | 'pest_control' | 'harvesting' | 'planting' | 'general';
      message: string;
      priority: 'low' | 'medium' | 'high' | 'critical';
      crops?: string[];
    }>;
    diseaseRisk: Array<{
      disease: string;
      risk: 'low' | 'medium' | 'high';
      factors: string[];
      preventionTips: string[];
    }>;
    pestRisk?: Array<{
      pest: string;
      risk: 'low' | 'medium' | 'high';
      factors: string[];
      preventionTips: string[];
    }>;
  };
  source: {
    provider: string;
    lastUpdated: Date;
    nextUpdate?: Date;
    accuracy?: 'low' | 'medium' | 'high';
  };
  quality: {
    score: number; // 0-100
    factors: {
      dataAge: number; // minutes
      sourceReliability: number; // 0-100
      locationAccuracy: number; // meters
    };
  };
  isActive: boolean;
  expiresAt: Date;

  // Virtuals
  isExpired: boolean;
  ageInMinutes: number;
  temperatureRange: { min: number; max: number };
  hasAlerts: boolean;

  // Instance methods
  updateWeatherData(data: Partial<IWeather>): Promise<void>;
  addAlert(alert: IWeather['alerts'][0]): Promise<void>;
  removeExpiredAlerts(): Promise<void>;
  generateAgriculturalRecommendations(crops?: string[]): Promise<void>;
  calculateDiseaseRisk(crops: string[]): Promise<Array<{
    disease: string;
    risk: 'low' | 'medium' | 'high';
    factors: string[];
  }>>;
  getWeatherSummary(language?: string): Promise<{
    current: string;
    forecast: string;
    alerts: string[];
    recommendations: string[];
  }>;
}

export interface IWeatherStatics {
  findByLocation(latitude: number, longitude: number, radiusKm?: number): Promise<IWeather | null>;
  findByCity(city: string, state?: string, country?: string): Promise<IWeather | null>;
  createWeatherRecord(data: {
    location: IWeather['location'];
    current: IWeather['current'];
    forecast: IWeather['forecast'];
    source: IWeather['source'];
  }): Promise<IWeather>;
  cleanupExpiredRecords(): Promise<number>;
  getWeatherStats(dateRange?: { start: Date; end: Date }): Promise<{
    totalRecords: number;
    activeRecords: number;
    expiredRecords: number;
    averageAccuracy: number;
    byProvider: Record<string, number>;
    byCountry: Record<string, number>;
  }>;
  findNearbyWeatherStations(latitude: number, longitude: number, radiusKm?: number): Promise<Array<{
    location: IWeather['location'];
    distance: number;
    lastUpdated: Date;
  }>>;
  getAgriculturalWeatherData(
    crops: string[],
    location: { latitude: number; longitude: number },
    days?: number
  ): Promise<{
    current: IWeather['agricultural'];
    forecast: Array<{
      date: Date;
      recommendations: IWeather['agricultural']['recommendations'];
      diseaseRisk: IWeather['agricultural']['diseaseRisk'];
    }>;
  }>;
  getWeatherAlerts(
    location: { latitude: number; longitude: number },
    severity?: Array<'minor' | 'moderate' | 'severe' | 'extreme'>
  ): Promise<IWeather['alerts']>;
  findByDateRange(
    location: { latitude: number; longitude: number },
    startDate: Date,
    endDate: Date
  ): Promise<IWeather[]>;
}

export interface IWeatherModel extends Model<IWeather>, IWeatherStatics {}