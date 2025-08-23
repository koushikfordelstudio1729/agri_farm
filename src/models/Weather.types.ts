import { Document } from 'mongoose';
import { DatabaseId } from '@/types/common.types';

export interface IWeather extends Document {
  _id: DatabaseId;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
    region: string;
    country: string;
    city?: string;
  };
  
  // Current weather data
  current: {
    temperature: number; // Celsius
    humidity: number; // percentage
    pressure: number; // hPa
    windSpeed: number; // km/h
    windDirection: number; // degrees
    visibility: number; // km
    uvIndex: number;
    condition: 'clear' | 'cloudy' | 'partly_cloudy' | 'rain' | 'snow' | 'storm' | 'fog' | 'mist';
    icon?: string;
    description: string;
    feelsLike: number;
    dewPoint: number;
  };
  
  // Precipitation data
  precipitation: {
    current: number; // mm
    last24h: number; // mm
    last7days: number; // mm
    lastMonth: number; // mm
    probability: number; // percentage for next hour
  };
  
  // Forecast data
  hourlyForecast: {
    time: Date;
    temperature: number;
    humidity: number;
    precipitation: number;
    windSpeed: number;
    condition: string;
    icon?: string;
  }[];
  
  dailyForecast: {
    date: Date;
    temperature: {
      min: number;
      max: number;
      avg: number;
    };
    humidity: {
      min: number;
      max: number;
      avg: number;
    };
    precipitation: {
      total: number;
      probability: number;
    };
    windSpeed: {
      avg: number;
      max: number;
    };
    condition: string;
    icon?: string;
    sunrise: Date;
    sunset: Date;
  }[];
  
  // Agricultural indices
  agriculturalData: {
    soilTemperature?: number;
    soilMoisture?: number;
    evapotranspiration?: number; // mm/day
    growingDegreeDays?: number;
    chillHours?: number;
    frostRisk: 'none' | 'low' | 'medium' | 'high';
    heatStress: 'none' | 'low' | 'medium' | 'high';
    diseaseRisk: 'none' | 'low' | 'medium' | 'high';
  };
  
  // Alerts and warnings
  alerts: {
    type: 'frost' | 'heat_wave' | 'heavy_rain' | 'drought' | 'storm' | 'hail' | 'wind';
    severity: 'advisory' | 'watch' | 'warning' | 'emergency';
    title: string;
    description: string;
    startTime: Date;
    endTime: Date;
    isActive: boolean;
  }[];
  
  // Data source information
  dataSource: {
    provider: string;
    apiVersion?: string;
    lastUpdated: Date;
    nextUpdate?: Date;
    accuracy: 'low' | 'medium' | 'high';
    dataAge: number; // minutes since collection
  };
  
  // Quality indicators
  quality: {
    completeness: number; // percentage
    accuracy: number; // percentage
    timeliness: number; // minutes delay
    issues?: string[];
  };
  
  // Historical comparison
  historical?: {
    temperatureAnomaly: number; // deviation from normal
    precipitationAnomaly: number; // deviation from normal
    normalTemperature: number;
    normalPrecipitation: number;
    recordHigh?: number;
    recordLow?: number;
  };
  
  // User-specific data
  customData?: {
    userId: DatabaseId;
    notes?: string;
    measurements?: {
      type: string;
      value: number;
      unit: string;
      measuredAt: Date;
    }[];
  }[];
  
  // Metadata
  tags: string[];
  isPublic: boolean;
  isActive: boolean;
  
  createdAt: Date;
  updatedAt: Date;
  recordedAt: Date;
}

export interface IWeatherMethods {
  addAlert(alert: IWeather['alerts'][0]): Promise<void>;
  removeAlert(alertIndex: number): Promise<void>;
  updateCurrent(data: Partial<IWeather['current']>): Promise<void>;
  addHourlyForecast(forecast: IWeather['hourlyForecast'][0]): Promise<void>;
  addDailyForecast(forecast: IWeather['dailyForecast'][0]): Promise<void>;
  calculateAgriculturalIndices(): Promise<void>;
  isStaleData(maxAgeMinutes?: number): boolean;
  getFrostRisk(): string;
  getHeatStressLevel(): string;
  getDiseaseRiskLevel(): string;
  addUserMeasurement(userId: DatabaseId, measurement: IWeather['customData'][0]['measurements'][0]): Promise<void>;
}

export interface IWeatherStatics {
  findByLocation(latitude: number, longitude: number, radiusKm?: number): Promise<IWeather[]>;
  findByRegion(region: string): Promise<IWeather[]>;
  findCurrent(): Promise<IWeather[]>;
  findWithAlerts(): Promise<IWeather[]>;
  findByCondition(condition: IWeather['current']['condition']): Promise<IWeather[]>;
  getRegionalForecast(region: string, days?: number): Promise<IWeather[]>;
  getAgriculturalSummary(region: string): Promise<{
    averageTemperature: number;
    totalPrecipitation: number;
    frostRiskAreas: number;
    heatStressAreas: number;
    diseaseRiskAreas: number;
    activeAlerts: number;
  }>;
  cleanup(olderThanDays: number): Promise<number>;
  findStaleData(maxAgeMinutes?: number): Promise<IWeather[]>;
  getHistoricalData(location: { latitude: number; longitude: number }, dateRange: { from: Date; to: Date }): Promise<IWeather[]>;
}

export interface WeatherSearchFilters {
  region?: string;
  condition?: IWeather['current']['condition'];
  minTemperature?: number;
  maxTemperature?: number;
  hasAlerts?: boolean;
  alertType?: IWeather['alerts'][0]['type'];
  dateRange?: { from: Date; to: Date };
}

export interface CreateWeatherData {
  location: IWeather['location'];
  current: IWeather['current'];
  precipitation?: IWeather['precipitation'];
  hourlyForecast?: IWeather['hourlyForecast'];
  dailyForecast?: IWeather['dailyForecast'];
  agriculturalData?: IWeather['agriculturalData'];
  alerts?: IWeather['alerts'];
  dataSource: IWeather['dataSource'];
  quality?: IWeather['quality'];
  historical?: IWeather['historical'];
  recordedAt?: Date;
}

export interface UpdateWeatherData {
  current?: Partial<IWeather['current']>;
  precipitation?: Partial<IWeather['precipitation']>;
  agriculturalData?: Partial<IWeather['agriculturalData']>;
  quality?: Partial<IWeather['quality']>;
  historical?: Partial<IWeather['historical']>;
}