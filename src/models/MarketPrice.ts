import { Schema, model } from 'mongoose';
import { IMarketPrice, IMarketPriceMethods, IMarketPriceStatics } from './MarketPrice.types';

const marketPriceSchema = new Schema<IMarketPrice, IMarketPriceStatics, IMarketPriceMethods>({
  cropId: {
    type: Schema.Types.ObjectId,
    ref: 'Crop',
    required: true,
    index: true,
  },
  cropName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
    index: true,
  },
  variety: {
    type: String,
    trim: true,
    maxlength: 100,
  },
  quality: {
    type: String,
    required: true,
    enum: ['premium', 'grade_a', 'grade_b', 'standard', 'low_grade'],
    index: true,
  },
  market: {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['wholesale', 'retail', 'mandi', 'auction', 'online', 'direct_sale'],
      index: true,
    },
    address: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    city: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true,
    },
    state: {
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
    coordinates: {
      latitude: {
        type: Number,
        min: -90,
        max: 90,
      },
      longitude: {
        type: Number,
        min: -180,
        max: 180,
      },
    },
  },
  pricing: {
    current: {
      price: {
        type: Number,
        required: true,
        min: 0,
        index: true,
      },
      currency: {
        type: String,
        required: true,
        trim: true,
        maxlength: 3,
        default: 'USD',
      },
      unit: {
        type: String,
        required: true,
        enum: ['kg', 'quintal', 'ton', 'piece', 'dozen', 'liter'],
      },
      pricePerKg: {
        type: Number,
        min: 0,
        index: true,
      },
    },
    previous: {
      price: {
        type: Number,
        min: 0,
      },
      date: {
        type: Date,
      },
      changePercent: {
        type: Number,
      },
    },
    trend: {
      direction: {
        type: String,
        required: true,
        enum: ['up', 'down', 'stable'],
        index: true,
      },
      changePercent: {
        type: Number,
        required: true,
        index: true,
      },
      changePeriod: {
        type: String,
        required: true,
        enum: ['24h', '7d', '30d', '90d'],
      },
    },
    forecast: {
      predictedPrice: {
        type: Number,
        min: 0,
      },
      confidenceLevel: {
        type: Number,
        min: 0,
        max: 100,
      },
      forecastDate: {
        type: Date,
      },
      factors: [{
        type: String,
        trim: true,
      }],
    },
  },
  trading: {
    volume: {
      quantity: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },
      unit: {
        type: String,
        required: true,
        trim: true,
        maxlength: 20,
      },
      value: {
        type: Number,
        min: 0,
      },
    },
    transactions: {
      type: Number,
      default: 0,
      min: 0,
    },
    buyers: {
      type: Number,
      default: 0,
      min: 0,
    },
    sellers: {
      type: Number,
      default: 0,
      min: 0,
    },
    averageTransactionSize: {
      type: Number,
      default: 0,
      min: 0,
    },
    priceRange: {
      min: {
        type: Number,
        required: true,
        min: 0,
      },
      max: {
        type: Number,
        required: true,
        min: 0,
      },
      median: {
        type: Number,
        required: true,
        min: 0,
      },
    },
  },
  specifications: {
    size: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    color: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    moisture: {
      type: Number,
      min: 0,
      max: 100,
    },
    purity: {
      type: Number,
      min: 0,
      max: 100,
    },
    grade: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    certifications: [{
      type: String,
      trim: true,
      maxlength: 100,
    }],
    organicCertified: {
      type: Boolean,
      default: false,
      index: true,
    },
    harvestDate: {
      type: Date,
    },
    storageCondition: {
      type: String,
      trim: true,
      maxlength: 200,
    },
  },
  supplyDemand: {
    supplyLevel: {
      type: String,
      enum: ['excess', 'adequate', 'limited', 'shortage'],
      index: true,
    },
    demandLevel: {
      type: String,
      enum: ['very_low', 'low', 'normal', 'high', 'very_high'],
      index: true,
    },
    inventoryLevel: {
      type: Number,
      min: 0,
    },
    expectedSupply: {
      quantity: {
        type: Number,
        min: 0,
      },
      timeframe: {
        type: String,
        trim: true,
        maxlength: 100,
      },
      sources: [{
        type: String,
        trim: true,
        maxlength: 100,
      }],
    },
    demandDrivers: [{
      type: String,
      trim: true,
      maxlength: 200,
    }],
  },
  seasonal: {
    isSeasonalPeak: {
      type: Boolean,
      default: false,
      index: true,
    },
    seasonType: {
      type: String,
      enum: ['harvest', 'off_season', 'planting', 'pre_harvest'],
      index: true,
    },
    historicalAverage: {
      sameMonth: { type: Number, min: 0 },
      sameQuarter: { type: Number, min: 0 },
      yearlyAverage: { type: Number, min: 0 },
    },
    volatilityIndex: {
      type: Number,
      min: 0,
      max: 100,
    },
  },
  externalFactors: {
    weather: {
      impact: {
        type: String,
        enum: ['positive', 'negative', 'neutral'],
      },
      description: {
        type: String,
        trim: true,
        maxlength: 500,
      },
      severity: {
        type: String,
        enum: ['low', 'medium', 'high'],
      },
    },
    government: {
      policies: [{
        type: String,
        trim: true,
        maxlength: 200,
      }],
      subsidies: [{
        amount: { type: Number, min: 0 },
        type: { type: String, trim: true, maxlength: 100 },
        duration: { type: String, trim: true, maxlength: 100 },
      }],
      regulations: [{
        type: String,
        trim: true,
        maxlength: 200,
      }],
      msp: {
        type: Number,
        min: 0,
      },
    },
    international: {
      exportPrice: { type: Number, min: 0 },
      importPrice: { type: Number, min: 0 },
      tradeBalance: { type: Number },
      majorTradingPartners: [{
        type: String,
        trim: true,
        maxlength: 100,
      }],
    },
  },
  alerts: [{
    type: {
      type: String,
      required: true,
      enum: ['price_increase', 'price_decrease', 'volume_spike', 'unusual_activity'],
    },
    threshold: {
      type: Number,
      required: true,
    },
    currentValue: {
      type: Number,
      required: true,
    },
    triggeredAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    severity: {
      type: String,
      required: true,
      enum: ['low', 'medium', 'high'],
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  }],
  dataSource: {
    provider: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    reliability: {
      type: String,
      enum: ['low', 'medium', 'high', 'verified'],
      default: 'medium',
    },
    collectionMethod: {
      type: String,
      enum: ['manual', 'api', 'scraping', 'direct_feed'],
      default: 'api',
    },
    lastUpdated: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    updateFrequency: {
      type: String,
      enum: ['realtime', 'hourly', 'daily', 'weekly'],
      default: 'daily',
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    verificationDate: {
      type: Date,
    },
  },
  historical: {
    yearAgo: {
      price: { type: Number, min: 0 },
      changePercent: { type: Number },
    },
    monthAgo: {
      price: { type: Number, min: 0 },
      changePercent: { type: Number },
    },
    weekAgo: {
      price: { type: Number, min: 0 },
      changePercent: { type: Number },
    },
    allTimeHigh: {
      price: { type: Number, min: 0 },
      date: { type: Date },
    },
    allTimeLow: {
      price: { type: Number, min: 0 },
      date: { type: Date },
    },
  },
  analytics: {
    priceVolatility: {
      type: Number,
      min: 0,
      default: 0,
    },
    marketSharePercent: {
      type: Number,
      min: 0,
      max: 100,
    },
    competitorPrices: [{
      market: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
      },
      price: {
        type: Number,
        required: true,
        min: 0,
      },
      difference: {
        type: Number,
        required: true,
      },
      differencePercent: {
        type: Number,
        required: true,
      },
    }],
    recommendations: [{
      type: {
        type: String,
        required: true,
        enum: ['buy', 'sell', 'hold'],
      },
      confidence: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
      },
      reasoning: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500,
      },
      validUntil: {
        type: Date,
        required: true,
      },
    }],
  },
  userActivity: {
    views: { type: Number, default: 0, min: 0 },
    bookmarks: { type: Number, default: 0, min: 0 },
    shares: { type: Number, default: 0, min: 0 },
    priceAlerts: { type: Number, default: 0, min: 0 },
    lastViewedAt: { type: Date },
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 50,
    index: true,
  }],
  notes: {
    type: String,
    trim: true,
    maxlength: 1000,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  isFeatured: {
    type: Boolean,
    default: false,
    index: true,
  },
  validUntil: {
    type: Date,
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

// Indexes for complex queries
marketPriceSchema.index({ cropId: 1, 'market.city': 1, recordedAt: -1 });
marketPriceSchema.index({ 'pricing.current.pricePerKg': 1, quality: 1 });
marketPriceSchema.index({ 'pricing.trend.direction': 1, 'pricing.trend.changePercent': -1 });
marketPriceSchema.index({ 'market.type': 1, 'market.state': 1 });

export const MarketPrice = model<IMarketPrice, IMarketPriceStatics>('MarketPrice', marketPriceSchema);
export default MarketPrice;