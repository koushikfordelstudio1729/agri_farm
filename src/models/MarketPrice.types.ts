import { Document } from 'mongoose';
import { DatabaseId } from '@/types/common.types';

export interface IMarketPrice extends Document {
  _id: DatabaseId;
  cropId: DatabaseId;
  cropName: string;
  variety?: string;
  quality: 'premium' | 'grade_a' | 'grade_b' | 'standard' | 'low_grade';
  
  // Location information
  market: {
    name: string;
    type: 'wholesale' | 'retail' | 'mandi' | 'auction' | 'online' | 'direct_sale';
    address?: string;
    city: string;
    state: string;
    country: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  
  // Price information
  pricing: {
    current: {
      price: number;
      currency: string;
      unit: 'kg' | 'quintal' | 'ton' | 'piece' | 'dozen' | 'liter';
      pricePerKg?: number; // normalized price for comparison
    };
    previous?: {
      price: number;
      date: Date;
      changePercent?: number;
    };
    trend: {
      direction: 'up' | 'down' | 'stable';
      changePercent: number;
      changePeriod: '24h' | '7d' | '30d' | '90d';
    };
    forecast?: {
      predictedPrice: number;
      confidenceLevel: number; // 0-100%
      forecastDate: Date;
      factors: string[];
    };
  };
  
  // Trading information
  trading: {
    volume: {
      quantity: number;
      unit: string;
      value?: number; // total value traded
    };
    transactions: number; // number of transactions
    buyers: number; // number of unique buyers
    sellers: number; // number of unique sellers
    averageTransactionSize: number;
    priceRange: {
      min: number;
      max: number;
      median: number;
    };
  };
  
  // Quality specifications
  specifications: {
    size?: string;
    color?: string;
    moisture?: number; // percentage
    purity?: number; // percentage
    grade?: string;
    certifications?: string[];
    organicCertified?: boolean;
    harvestDate?: Date;
    storageCondition?: string;
  };
  
  // Supply and demand factors
  supplyDemand: {
    supplyLevel: 'excess' | 'adequate' | 'limited' | 'shortage';
    demandLevel: 'very_low' | 'low' | 'normal' | 'high' | 'very_high';
    inventoryLevel?: number;
    expectedSupply?: {
      quantity: number;
      timeframe: string;
      sources: string[];
    };
    demandDrivers?: string[];
  };
  
  // Seasonal information
  seasonal: {
    isSeasonalPeak: boolean;
    seasonType: 'harvest' | 'off_season' | 'planting' | 'pre_harvest';
    historicalAverage?: {
      sameMonth: number;
      sameQuarter: number;
      yearlyAverage: number;
    };
    volatilityIndex?: number; // 0-100, higher = more volatile
  };
  
  // External factors
  externalFactors: {
    weather: {
      impact: 'positive' | 'negative' | 'neutral';
      description?: string;
      severity?: 'low' | 'medium' | 'high';
    };
    government: {
      policies?: string[];
      subsidies?: {
        amount: number;
        type: string;
        duration: string;
      }[];
      regulations?: string[];
      msp?: number; // minimum support price
    };
    international: {
      exportPrice?: number;
      importPrice?: number;
      tradeBalance?: number;
      majorTradingPartners?: string[];
    };
  };
  
  // Price alerts and notifications
  alerts: {
    type: 'price_increase' | 'price_decrease' | 'volume_spike' | 'unusual_activity';
    threshold: number;
    currentValue: number;
    triggeredAt: Date;
    severity: 'low' | 'medium' | 'high';
    message: string;
    isActive: boolean;
  }[];
  
  // Data source and reliability
  dataSource: {
    provider: string;
    reliability: 'low' | 'medium' | 'high' | 'verified';
    collectionMethod: 'manual' | 'api' | 'scraping' | 'direct_feed';
    lastUpdated: Date;
    updateFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
    verifiedBy?: DatabaseId;
    verificationDate?: Date;
  };
  
  // Historical data reference
  historical: {
    yearAgo?: {
      price: number;
      changePercent: number;
    };
    monthAgo?: {
      price: number;
      changePercent: number;
    };
    weekAgo?: {
      price: number;
      changePercent: number;
    };
    allTimeHigh?: {
      price: number;
      date: Date;
    };
    allTimeLow?: {
      price: number;
      date: Date;
    };
  };
  
  // Analytics and insights
  analytics: {
    priceVolatility: number;
    marketSharePercent?: number;
    competitorPrices?: {
      market: string;
      price: number;
      difference: number;
      differencePercent: number;
    }[];
    recommendations: {
      type: 'buy' | 'sell' | 'hold';
      confidence: number;
      reasoning: string;
      validUntil: Date;
    }[];
  };
  
  // User engagement
  userActivity: {
    views: number;
    bookmarks: number;
    shares: number;
    priceAlerts: number;
    lastViewedAt?: Date;
  };
  
  // Metadata
  tags: string[];
  notes?: string;
  isActive: boolean;
  isFeatured: boolean;
  validUntil?: Date;
  
  createdAt: Date;
  updatedAt: Date;
  recordedAt: Date;
}

export interface IMarketPriceMethods {
  calculateTrend(period: '24h' | '7d' | '30d' | '90d'): Promise<{ direction: string; changePercent: number }>;
  updatePrice(newPrice: number): Promise<void>;
  addAlert(alert: IMarketPrice['alerts'][0]): Promise<void>;
  removeAlert(alertIndex: number): Promise<void>;
  compareWith(otherMarketId: DatabaseId): Promise<{ difference: number; differencePercent: number }>;
  getPriceHistory(days: number): Promise<{ date: Date; price: number }[]>;
  calculateVolatility(days?: number): Promise<number>;
  isStaleData(maxAgeHours?: number): boolean;
  generateForecast(days: number): Promise<{ price: number; confidence: number }>;
  addRecommendation(recommendation: IMarketPrice['analytics']['recommendations'][0]): Promise<void>;
  incrementViews(): Promise<void>;
}

export interface IMarketPriceStatics {
  findByCrop(cropId: DatabaseId, options?: PriceQueryOptions): Promise<IMarketPrice[]>;
  findByMarket(marketName: string, options?: PriceQueryOptions): Promise<IMarketPrice[]>;
  findByLocation(city: string, state?: string, country?: string): Promise<IMarketPrice[]>;
  findTrending(direction: 'up' | 'down', limit?: number): Promise<IMarketPrice[]>;
  findByPriceRange(minPrice: number, maxPrice: number, cropId?: DatabaseId): Promise<IMarketPrice[]>;
  getMarketSummary(cropId: DatabaseId): Promise<{
    averagePrice: number;
    minPrice: number;
    maxPrice: number;
    totalVolume: number;
    marketCount: number;
    trend: string;
  }>;
  findArbitrage(minPriceDifference?: number): Promise<{
    cropName: string;
    lowPriceMarket: string;
    highPriceMarket: string;
    priceDifference: number;
    profitPotential: number;
  }[]>;
  getPriceAlerts(userId: DatabaseId): Promise<IMarketPrice[]>;
  getTopMovers(period: '24h' | '7d' | '30d', direction: 'up' | 'down', limit?: number): Promise<IMarketPrice[]>;
  cleanup(olderThanDays: number): Promise<number>;
  findStaleData(maxAgeHours?: number): Promise<IMarketPrice[]>;
}

export interface PriceQueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'price' | 'createdAt' | 'volume' | 'changePercent';
  sortOrder?: 'asc' | 'desc';
  dateRange?: { from: Date; to: Date };
  quality?: IMarketPrice['quality'];
  marketType?: IMarketPrice['market']['type'];
  includeInactive?: boolean;
}

export interface CreateMarketPriceData {
  cropId: DatabaseId;
  cropName: string;
  variety?: string;
  quality: IMarketPrice['quality'];
  market: IMarketPrice['market'];
  pricing: {
    current: IMarketPrice['pricing']['current'];
    previous?: IMarketPrice['pricing']['previous'];
  };
  trading?: Partial<IMarketPrice['trading']>;
  specifications?: IMarketPrice['specifications'];
  supplyDemand?: Partial<IMarketPrice['supplyDemand']>;
  seasonal?: Partial<IMarketPrice['seasonal']>;
  dataSource: IMarketPrice['dataSource'];
  tags?: string[];
  recordedAt?: Date;
}

export interface UpdateMarketPriceData {
  pricing?: {
    current?: Partial<IMarketPrice['pricing']['current']>;
    previous?: IMarketPrice['pricing']['previous'];
  };
  trading?: Partial<IMarketPrice['trading']>;
  supplyDemand?: Partial<IMarketPrice['supplyDemand']>;
  specifications?: Partial<IMarketPrice['specifications']>;
  isActive?: boolean;
}