import type { DatabaseId, BaseDocument, LocationData } from './common.types';

export interface WeatherData {
  temperature: {
    current: number;
    min: number;
    max: number;
    feelsLike: number;
    unit: 'celsius' | 'fahrenheit';
  };
  humidity: {
    current: number;
    unit: 'percentage';
  };
  pressure: {
    current: number;
    unit: 'hPa' | 'inHg';
  };
  wind: {
    speed: number;
    direction: number;
    gust?: number;
    unit: 'kmh' | 'mph' | 'ms';
  };
  precipitation: {
    current: number;
    probability: number;
    type: 'none' | 'rain' | 'snow' | 'sleet' | 'hail';
    unit: 'mm' | 'inches';
  };
  cloudCover: {
    percentage: number;
    description: string;
  };
  visibility: {
    distance: number;
    unit: 'km' | 'miles';
  };
  uvi: {
    index: number;
    level: 'low' | 'moderate' | 'high' | 'very-high' | 'extreme';
  };
  dewPoint: {
    temperature: number;
    unit: 'celsius' | 'fahrenheit';
  };
}

export interface WeatherCondition {
  id: number;
  main: string;
  description: string;
  icon: string;
  severity?: 'light' | 'moderate' | 'heavy' | 'extreme';
}

export interface CurrentWeather {
  location: LocationData;
  timestamp: Date;
  timezone: string;
  condition: WeatherCondition;
  data: WeatherData;
  source: string;
  reliability: number;
}

export interface WeatherForecast {
  location: LocationData;
  generatedAt: Date;
  timezone: string;
  source: string;
  reliability: number;
  hourly: {
    timestamp: Date;
    condition: WeatherCondition;
    data: WeatherData;
  }[];
  daily: {
    date: Date;
    condition: WeatherCondition;
    data: WeatherData & {
      sunrise: Date;
      sunset: Date;
      moonPhase: number;
      summary: string;
    };
  }[];
  alerts?: WeatherAlert[];
}

export interface WeatherAlert {
  id: string;
  title: string;
  description: string;
  severity: 'minor' | 'moderate' | 'severe' | 'extreme';
  urgency: 'immediate' | 'expected' | 'future';
  certainty: 'observed' | 'likely' | 'possible' | 'unknown';
  category: 'meteorological' | 'hydrological' | 'climatological' | 'geophysical' | 'environmental';
  event: string;
  areas: string[];
  startDate: Date;
  endDate?: Date;
  issuedBy: string;
  issuedAt: Date;
  instructions?: string[];
  impact: {
    agriculture?: string[];
    general?: string[];
  };
}

export interface AgriculturalWeatherData {
  id: DatabaseId;
  location: LocationData;
  date: Date;
  weather: WeatherData;
  agricultural: {
    soilTemperature: {
      surface: number;
      depth5cm: number;
      depth10cm: number;
      depth20cm: number;
      unit: 'celsius' | 'fahrenheit';
    };
    soilMoisture: {
      surface: number;
      root_zone: number;
      deep: number;
      unit: 'percentage' | 'mm';
    };
    evapotranspiration: {
      reference: number;
      crop?: number;
      unit: 'mm';
    };
    growingDegreeDays: {
      accumulated: number;
      daily: number;
      baseTemp: number;
      unit: 'celsius' | 'fahrenheit';
    };
    chillHours?: {
      accumulated: number;
      daily: number;
      threshold: number;
    };
    heatStress: {
      index: number;
      level: 'none' | 'mild' | 'moderate' | 'severe' | 'extreme';
      duration: number;
    };
    diseaseRisk: {
      fungal: 'low' | 'medium' | 'high';
      bacterial: 'low' | 'medium' | 'high';
      viral: 'low' | 'medium' | 'high';
      factors: string[];
    };
    pestRisk: {
      level: 'low' | 'medium' | 'high';
      activePests: string[];
      factors: string[];
    };
  };
  recommendations: {
    irrigation: {
      needed: boolean;
      amount?: number;
      timing?: string;
      method?: string;
    };
    protection: {
      frost?: boolean;
      heat?: boolean;
      wind?: boolean;
      hail?: boolean;
      measures: string[];
    };
    fieldOperations: {
      planting: 'suitable' | 'caution' | 'not-recommended';
      spraying: 'suitable' | 'caution' | 'not-recommended';
      harvesting: 'suitable' | 'caution' | 'not-recommended';
      tillage: 'suitable' | 'caution' | 'not-recommended';
      reasons: string[];
    };
    diseaseManagement: string[];
    pestManagement: string[];
  };
  createdAt: Date;
}

export interface WeatherStation {
  id: DatabaseId;
  name: string;
  location: LocationData;
  type: 'automatic' | 'manual' | 'satellite' | 'radar';
  elevation: number;
  owner: string;
  parameters: string[];
  accuracy: Record<string, number>;
  calibrationDate?: Date;
  maintenanceSchedule: string;
  dataInterval: number;
  transmissionMethod: string;
  isActive: boolean;
  lastDataReceived?: Date;
  contact: {
    person: string;
    phone?: string;
    email?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface WeatherHistory {
  location: LocationData;
  dateRange: {
    start: Date;
    end: Date;
  };
  data: {
    date: Date;
    weather: WeatherData;
    condition: WeatherCondition;
  }[];
  statistics: {
    temperature: {
      avg: number;
      min: number;
      max: number;
      extreme_min: number;
      extreme_max: number;
    };
    rainfall: {
      total: number;
      avg_daily: number;
      max_daily: number;
      rainy_days: number;
    };
    humidity: {
      avg: number;
      min: number;
      max: number;
    };
    wind: {
      avg_speed: number;
      max_speed: number;
      dominant_direction: number;
    };
  };
  trends: {
    parameter: string;
    direction: 'increasing' | 'decreasing' | 'stable';
    rate: number;
    significance: number;
  }[];
  anomalies: {
    date: Date;
    parameter: string;
    value: number;
    deviation: number;
    historical_avg: number;
  }[];
  extremeEvents: {
    date: Date;
    event: string;
    intensity: string;
    duration: number;
    impact?: string;
  }[];
}

export interface ClimateData {
  location: LocationData;
  period: {
    start: number;
    end: number;
  };
  koppen_climate: string;
  seasons: {
    name: string;
    months: number[];
    characteristics: {
      temperature: { avg: number; range: number };
      rainfall: { total: number; distribution: string };
      humidity: { avg: number };
      conditions: string[];
    };
  }[];
  extremes: {
    temperature: {
      highest: { value: number; date: Date };
      lowest: { value: number; date: Date };
    };
    rainfall: {
      highest_daily: { value: number; date: Date };
      highest_monthly: { value: number; month: string; year: number };
      longest_dry: { days: number; period: string };
    };
    wind: {
      highest: { speed: number; date: Date; direction: number };
    };
  };
  agricultural_zones: {
    zone: string;
    suitability: Record<string, 'excellent' | 'good' | 'fair' | 'poor'>;
    constraints: string[];
    opportunities: string[];
  }[];
  climate_risks: {
    drought: { frequency: string; severity: string; months: number[] };
    flood: { frequency: string; severity: string; months: number[] };
    frost: { frequency: string; first_date: string; last_date: string };
    heatwave: { frequency: string; severity: string; months: number[] };
    cyclone: { frequency: string; season: string; intensity: string };
  };
  trends: {
    temperature: { trend: number; per_decade: number; significance: number };
    rainfall: { trend: number; per_decade: number; significance: number };
    extreme_events: { trend: string; frequency_change: number };
  };
}

export interface WeatherSubscription {
  id: DatabaseId;
  userId: DatabaseId;
  location: LocationData;
  alertTypes: WeatherAlert['category'][];
  severityThreshold: WeatherAlert['severity'];
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
    inApp: boolean;
  };
  schedule: {
    dailyForecast: string;
    weeklyForecast: string;
    alerts: 'immediate' | 'hourly' | 'daily';
  };
  customThresholds: {
    parameter: string;
    condition: 'above' | 'below' | 'between';
    value: number | { min: number; max: number };
    duration?: number;
  }[];
  crops: DatabaseId[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WeatherAPI {
  name: string;
  url: string;
  apiKey?: string;
  rateLimit: {
    requests: number;
    period: string;
  };
  coverage: string[];
  parameters: string[];
  accuracy: Record<string, number>;
  updateFrequency: string;
  historical: {
    available: boolean;
    startDate?: Date;
    cost?: string;
  };
  forecast: {
    hours: number;
    days: number;
    accuracy: number;
  };
  cost: {
    free_tier: string;
    paid_tiers: {
      name: string;
      price: number;
      requests: number;
      features: string[];
    }[];
  };
}

export interface CreateWeatherAlertRequest {
  title: string;
  description: string;
  severity: WeatherAlert['severity'];
  event: string;
  areas: string[];
  startDate: Date;
  endDate?: Date;
  instructions?: string[];
}

export interface WeatherQuery {
  location: LocationData;
  parameters: string[];
  timeframe: {
    start: Date;
    end: Date;
  };
  resolution: 'hourly' | 'daily' | 'monthly';
  includeForecasts?: boolean;
  includeHistorical?: boolean;
}