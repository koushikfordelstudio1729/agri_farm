import { Document, Model } from 'mongoose';

export interface IMarketPrice extends Document {
  cropId: string;
  cropName: string;
  variety?: string;
  quality: 'premium' | 'grade_a' | 'grade_b' | 'standard' | 'low_grade';
  market: {
    name: string;
    type: 'wholesale' | 'retail' | 'commodity_exchange' | 'farmer_market' | 'online';
    location: {
      city: string;
      state: string;
      country: string;
      coordinates?: {
        latitude: number;
        longitude: number;
      };
    };
    contact?: {
      phone?: string;
      email?: string;
      website?: string;
      address?: string;
    };
  };
  pricing: {
    current: {
      price: number;
      currency: string;
      unit: 'kg' | 'lb' | 'ton' | 'quintal' | 'bushel' | 'piece' | 'dozen';
      pricePerKg?: number; // normalized price
    };
    previous: {
      price: number;
      date: Date;
    };
    history: Array<{
      date: Date;
      price: number;
      volume?: number;
      source?: string;
    }>;
    trends: {
      daily: {
        change: number;
        percentage: number;
        direction: 'up' | 'down' | 'stable';
      };
      weekly: {
        change: number;
        percentage: number;
        direction: 'up' | 'down' | 'stable';
      };
      monthly: {
        change: number;
        percentage: number;
        direction: 'up' | 'down' | 'stable';
      };
    };
  };
  supply: {
    availability: 'abundant' | 'adequate' | 'limited' | 'scarce';
    volume?: number;
    unit?: string;
    qualityDistribution?: {
      premium: number;
      gradeA: number;
      gradeB: number;
      standard: number;
    };
    seasonality: {
      peak: string[]; // months
      low: string[]; // months
    };
  };
  demand: {
    level: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';
    factors: string[];
    projections?: Array<{
      period: string;
      expectedDemand: 'increasing' | 'stable' | 'decreasing';
      confidence: number; // 0-100
    }>;
  };
  metadata: {
    source: string;
    reliability: number; // 0-100
    lastUpdated: Date;
    nextUpdate?: Date;
    dataCollector?: string;
    verifiedBy?: string;
    notes?: string;
  };
  alerts: Array<{
    type: 'price_spike' | 'price_drop' | 'low_supply' | 'high_demand' | 'quality_issue';
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    triggeredAt: Date;
    resolved: boolean;
    resolvedAt?: Date;
  }>;
  forecast: Array<{
    date: Date;
    predictedPrice: number;
    confidence: number; // 0-100
    factors: string[];
    model?: string;
  }>;
  isActive: boolean;
  isVerified: boolean;

  // Virtuals
  priceChangeToday: number;
  priceChangeWeek: number;
  priceChangeMonth: number;
  isHighDemand: boolean;
  isLowSupply: boolean;
  marketScore: number; // computed score based on price, supply, demand

  // Instance methods
  updatePrice(newPrice: number, volume?: number): Promise<void>;
  addPriceHistory(date: Date, price: number, volume?: number): Promise<void>;
  calculateTrends(): Promise<void>;
  createAlert(type: IMarketPrice['alerts'][0]['type'], message: string, severity: string): Promise<void>;
  resolveAlert(alertId: string): Promise<void>;
  updateSupplyDemand(supply: Partial<IMarketPrice['supply']>, demand: Partial<IMarketPrice['demand']>): Promise<void>;
  generatePriceForecast(days: number): Promise<Array<{ date: Date; price: number; confidence: number }>>;
  compareWithMarkets(marketIds: string[]): Promise<Array<{
    marketId: string;
    marketName: string;
    price: number;
    difference: number;
    percentageDifference: number;
  }>>;
}

export interface IMarketPriceStatics {
  findByCrop(cropId: string, filters?: {
    market?: string;
    quality?: string[];
    location?: { city?: string; state?: string; country?: string };
    priceRange?: { min: number; max: number };
  }): Promise<IMarketPrice[]>;
  findByMarket(marketName: string, location?: { city: string; state: string; country: string }): Promise<IMarketPrice[]>;
  findByLocation(location: {
    latitude: number;
    longitude: number;
    radiusKm?: number;
  }): Promise<IMarketPrice[]>;
  getPriceComparison(cropId: string, markets?: string[]): Promise<Array<{
    market: string;
    location: string;
    price: number;
    change24h: number;
    quality: string;
    lastUpdated: Date;
  }>>;
  getTrendingPrices(period: 'day' | 'week' | 'month'): Promise<Array<{
    cropId: string;
    cropName: string;
    price: number;
    change: number;
    percentage: number;
    trend: 'up' | 'down';
  }>>;
  getMarketAlerts(filters?: {
    crop?: string;
    market?: string;
    severity?: string[];
    resolved?: boolean;
  }): Promise<IMarketPrice['alerts']>;
  searchPrices(query: string, filters?: {
    location?: string;
    priceRange?: { min: number; max: number };
    quality?: string[];
    markets?: string[];
  }): Promise<IMarketPrice[]>;
  getMarketStats(period?: 'day' | 'week' | 'month' | 'year'): Promise<{
    totalCrops: number;
    totalMarkets: number;
    averagePrice: number;
    priceRange: { min: number; max: number };
    mostTraded: Array<{ crop: string; volume: number }>;
    topGainers: Array<{ crop: string; change: number }>;
    topLosers: Array<{ crop: string; change: number }>;
  }>;
  getCropSeasonality(cropId: string): Promise<{
    peakMonths: string[];
    lowMonths: string[];
    averagePrices: Array<{ month: string; price: number }>;
    volatility: number;
  }>;
  getPriceHistory(
    cropId: string,
    market?: string,
    period?: { start: Date; end: Date }
  ): Promise<Array<{
    date: Date;
    price: number;
    volume?: number;
    market: string;
  }>>;
  updatePricesFromFeed(data: Array<{
    cropId: string;
    market: string;
    price: number;
    quality?: string;
    volume?: number;
  }>): Promise<{ updated: number; created: number; errors: string[] }>;
  cleanupOldPrices(daysToKeep: number): Promise<number>;
  generatePriceReport(
    filters: {
      crops?: string[];
      markets?: string[];
      dateRange?: { start: Date; end: Date };
    }
  ): Promise<{
    summary: any;
    priceData: any[];
    trends: any;
    recommendations: string[];
  }>;
}

export interface IMarketPriceModel extends Model<IMarketPrice>, IMarketPriceStatics {}