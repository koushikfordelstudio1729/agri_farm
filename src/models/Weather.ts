import { Schema, model } from 'mongoose';
import { IWeather, IWeatherMethods, IWeatherStatics } from './Weather.types';

const weatherSchema = new Schema<IWeather, IWeatherStatics, IWeatherMethods>({
  location: {
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },
    address: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    region: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true,
    },
    country: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true,
    },
    city: {
      type: String,
      trim: true,
      maxlength: 100,
    },
  },
  current: {
    temperature: {
      type: Number,
      required: true,
    },
    humidity: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    pressure: {
      type: Number,
      required: true,
      min: 0,
    },
    windSpeed: {
      type: Number,
      required: true,
      min: 0,
    },
    windDirection: {
      type: Number,
      required: true,
      min: 0,
      max: 360,
    },
    visibility: {
      type: Number,
      required: true,
      min: 0,
    },
    uvIndex: {
      type: Number,
      required: true,
      min: 0,
      max: 15,
    },
    condition: {
      type: String,
      required: true,
      enum: ['clear', 'cloudy', 'partly_cloudy', 'rain', 'snow', 'storm', 'fog', 'mist'],
      index: true,
    },
    icon: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    feelsLike: {
      type: Number,
      required: true,
    },
    dewPoint: {
      type: Number,
      required: true,
    },
  },
  precipitation: {
    current: {
      type: Number,
      default: 0,
      min: 0,
    },
    last24h: {
      type: Number,
      default: 0,
      min: 0,
    },
    last7days: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastMonth: {
      type: Number,
      default: 0,
      min: 0,
    },
    probability: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  hourlyForecast: [{
    time: {
      type: Date,
      required: true,
    },
    temperature: {
      type: Number,
      required: true,
    },
    humidity: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    precipitation: {
      type: Number,
      required: true,
      min: 0,
    },
    windSpeed: {
      type: Number,
      required: true,
      min: 0,
    },
    condition: {
      type: String,
      required: true,
      trim: true,
    },
    icon: {
      type: String,
      trim: true,
    },
  }],
  dailyForecast: [{
    date: {
      type: Date,
      required: true,
    },
    temperature: {
      min: { type: Number, required: true },
      max: { type: Number, required: true },
      avg: { type: Number, required: true },
    },
    humidity: {
      min: { type: Number, required: true, min: 0, max: 100 },
      max: { type: Number, required: true, min: 0, max: 100 },
      avg: { type: Number, required: true, min: 0, max: 100 },
    },
    precipitation: {
      total: { type: Number, required: true, min: 0 },
      probability: { type: Number, required: true, min: 0, max: 100 },
    },
    windSpeed: {
      avg: { type: Number, required: true, min: 0 },
      max: { type: Number, required: true, min: 0 },
    },
    condition: {
      type: String,
      required: true,
      trim: true,
    },
    icon: {
      type: String,
      trim: true,
    },
    sunrise: {
      type: Date,
      required: true,
    },
    sunset: {
      type: Date,
      required: true,
    },
  }],
  agriculturalData: {
    soilTemperature: {
      type: Number,
    },
    soilMoisture: {
      type: Number,
      min: 0,
      max: 100,
    },
    evapotranspiration: {
      type: Number,
      min: 0,
    },
    growingDegreeDays: {
      type: Number,
      min: 0,
    },
    chillHours: {
      type: Number,
      min: 0,
    },
    frostRisk: {
      type: String,
      enum: ['none', 'low', 'medium', 'high'],
      default: 'none',
      index: true,
    },
    heatStress: {
      type: String,
      enum: ['none', 'low', 'medium', 'high'],
      default: 'none',
      index: true,
    },
    diseaseRisk: {
      type: String,
      enum: ['none', 'low', 'medium', 'high'],
      default: 'none',
      index: true,
    },
  },
  alerts: [{
    type: {
      type: String,
      required: true,
      enum: ['frost', 'heat_wave', 'heavy_rain', 'drought', 'storm', 'hail', 'wind'],
    },
    severity: {
      type: String,
      required: true,
      enum: ['advisory', 'watch', 'warning', 'emergency'],
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  }],
  dataSource: {
    provider: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    apiVersion: {
      type: String,
      trim: true,
      maxlength: 20,
    },
    lastUpdated: {
      type: Date,
      required: true,
      default: Date.now,
    },
    nextUpdate: {
      type: Date,
    },
    accuracy: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    dataAge: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  quality: {
    completeness: {
      type: Number,
      min: 0,
      max: 100,
      default: 100,
    },
    accuracy: {
      type: Number,
      min: 0,
      max: 100,
      default: 95,
    },
    timeliness: {
      type: Number,
      min: 0,
      default: 0,
    },
    issues: [{
      type: String,
      trim: true,
    }],
  },
  historical: {
    temperatureAnomaly: {
      type: Number,
    },
    precipitationAnomaly: {
      type: Number,
    },
    normalTemperature: {
      type: Number,
    },
    normalPrecipitation: {
      type: Number,
    },
    recordHigh: {
      type: Number,
    },
    recordLow: {
      type: Number,
    },
  },
  customData: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    measurements: [{
      type: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50,
      },
      value: {
        type: Number,
        required: true,
      },
      unit: {
        type: String,
        required: true,
        trim: true,
        maxlength: 20,
      },
      measuredAt: {
        type: Date,
        required: true,
        default: Date.now,
      },
    }],
  }],
  tags: [{
    type: String,
    trim: true,
    maxlength: 50,
    index: true,
  }],
  isPublic: {
    type: Boolean,
    default: true,
    index: true,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  recordedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
});

// Geospatial index for location-based queries
weatherSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });
weatherSchema.index({ 'location.region': 1, recordedAt: -1 });
weatherSchema.index({ 'current.condition': 1, recordedAt: -1 });
weatherSchema.index({ 'alerts.isActive': 1, 'alerts.type': 1 });

export const Weather = model<IWeather, IWeatherStatics>('Weather', weatherSchema);
export default Weather;