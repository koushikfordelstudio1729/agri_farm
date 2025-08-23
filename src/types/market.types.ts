import type { 
  DatabaseId, 
  BaseDocument,
  LocationData,
  PriceData 
} from './common.types';

export interface Market {
  id: DatabaseId;
  name: string;
  type: 'wholesale' | 'retail' | 'direct' | 'online' | 'export' | 'auction';
  location: LocationData;
  operatingHours: {
    [key: string]: {
      open: string;
      close: string;
      isOpen: boolean;
    };
  };
  contact: {
    phone?: string;
    email?: string;
    website?: string;
    manager?: {
      name: string;
      phone: string;
      email: string;
    };
  };
  facilities: {
    storage: boolean;
    coldStorage: boolean;
    processing: boolean;
    grading: boolean;
    packaging: boolean;
    transportation: boolean;
    loading: boolean;
    parking: boolean;
    weighing: boolean;
  };
  services: {
    priceDiscovery: boolean;
    qualityTesting: boolean;
    certification: boolean;
    financing: boolean;
    insurance: boolean;
    logistics: boolean;
    documentation: boolean;
  };
  fees: {
    entry: number;
    commission: number;
    storage: number;
    handling: number;
    cleaning: number;
    grading: number;
    certification: number;
    currency: string;
    unit: string;
  };
  ratings: {
    overall: number;
    priceCompetitiveness: number;
    serviceQuality: number;
    reliability: number;
    facilities: number;
    count: number;
  };
  verification: {
    status: 'verified' | 'pending' | 'unverified';
    verifiedBy?: DatabaseId;
    verifiedAt?: Date;
    licenseNumber?: string;
    registrationNumber?: string;
  };
  isActive: boolean;
  createdBy: DatabaseId;
  createdAt: Date;
  updatedAt: Date;
}

export interface CropPrice extends BaseDocument {
  id: DatabaseId;
  cropId: DatabaseId;
  marketId: DatabaseId;
  variety?: string;
  grade: 'A' | 'B' | 'C' | 'premium' | 'standard' | 'low';
  quality: {
    moisture: number;
    purity: number;
    foreignMatter: number;
    brokenKernels?: number;
    color?: string;
    size?: string;
    certification?: 'organic' | 'fair_trade' | 'gmo_free' | 'conventional';
  };
  pricing: {
    minPrice: number;
    maxPrice: number;
    modalPrice: number;
    averagePrice: number;
    prevPrice?: number;
    change: number;
    changePercentage: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    currency: string;
    unit: 'kg' | 'quintal' | 'ton' | 'bag' | 'box' | 'piece';
    standardUnit: 'per_kg' | 'per_quintal' | 'per_ton';
  };
  volume: {
    arrivals: number;
    traded: number;
    unsold: number;
    carry_forward: number;
    unit: string;
  };
  demand: {
    level: 'low' | 'moderate' | 'high' | 'very_high';
    factors: string[];
    buyers: number;
    inquiries: number;
  };
  supply: {
    level: 'low' | 'moderate' | 'high' | 'excess';
    factors: string[];
    sellers: number;
    inventory: number;
  };
  seasonality: {
    season: 'peak' | 'lean' | 'moderate';
    expectedDuration: string;
    historicalPattern: string;
  };
  externalFactors: {
    weather: string[];
    policy: string[];
    global: string[];
    transportation: string[];
    storage: string[];
  };
  forecast: {
    nextWeek: {
      price: number;
      trend: 'up' | 'down' | 'stable';
      confidence: number;
    };
    nextMonth: {
      price: number;
      trend: 'up' | 'down' | 'stable';
      confidence: number;
    };
    factors: string[];
  };
  dataSource: {
    primary: 'manual' | 'api' | 'scraping' | 'reporting';
    secondary?: string[];
    reliability: number;
    lastUpdated: Date;
    updatedBy?: DatabaseId;
  };
  isActive: boolean;
  recordedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PriceAlert {
  id: DatabaseId;
  userId: DatabaseId;
  cropId: DatabaseId;
  marketId?: DatabaseId;
  alertType: 'price_above' | 'price_below' | 'price_change' | 'volume_change' | 'demand_high' | 'supply_low';
  conditions: {
    targetPrice?: number;
    changePercentage?: number;
    volumeThreshold?: number;
    priceComparison?: 'higher_than' | 'lower_than' | 'equal_to';
    timeframe?: 'daily' | 'weekly' | 'monthly';
  };
  markets: DatabaseId[];
  grades: string[];
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
    frequency: 'immediate' | 'daily_digest' | 'weekly_digest';
  };
  isActive: boolean;
  triggeredCount: number;
  lastTriggered?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MarketAnalysis {
  id: DatabaseId;
  cropId: DatabaseId;
  period: {
    start: Date;
    end: Date;
    type: 'daily' | 'weekly' | 'monthly' | 'seasonal' | 'yearly';
  };
  priceAnalysis: {
    average: number;
    minimum: number;
    maximum: number;
    volatility: number;
    trend: 'bullish' | 'bearish' | 'sideways';
    seasonalPattern: string;
    cycleAnalysis: {
      pattern: string;
      duration: number;
      reliability: number;
    };
  };
  volumeAnalysis: {
    totalArrivals: number;
    totalTraded: number;
    averageDaily: number;
    peakDays: Date[];
    lowDays: Date[];
    seasonality: string;
  };
  marketDynamics: {
    supplyDemandBalance: 'surplus' | 'deficit' | 'balanced';
    marketSentiment: 'bullish' | 'bearish' | 'neutral';
    priceDrivers: {
      factor: string;
      impact: 'positive' | 'negative' | 'neutral';
      weight: number;
    }[];
  };
  regionalComparison: {
    marketId: DatabaseId;
    marketName: string;
    priceComparison: number;
    volumeComparison: number;
    competitiveness: number;
  }[];
  forecast: {
    shortTerm: {
      period: '1_week' | '2_weeks' | '1_month';
      priceRange: { min: number; max: number };
      trend: string;
      confidence: number;
      factors: string[];
    };
    mediumTerm: {
      period: '3_months' | '6_months';
      priceRange: { min: number; max: number };
      trend: string;
      confidence: number;
      factors: string[];
    };
    longTerm: {
      period: '1_year';
      priceRange: { min: number; max: number };
      trend: string;
      confidence: number;
      factors: string[];
    };
  };
  recommendations: {
    farmers: {
      selling: string[];
      storage: string[];
      planting: string[];
      marketing: string[];
    };
    traders: {
      buying: string[];
      inventory: string[];
      timing: string[];
      markets: string[];
    };
    policymakers: string[];
  };
  riskFactors: {
    factor: string;
    probability: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
    mitigation: string[];
  }[];
  dataQuality: {
    completeness: number;
    accuracy: number;
    timeliness: number;
    sources: string[];
  };
  generatedBy: 'system' | 'analyst' | 'ai_model';
  generatedAt: Date;
  isPublished: boolean;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TradingOpportunity {
  id: DatabaseId;
  type: 'arbitrage' | 'seasonal' | 'quality_premium' | 'storage' | 'processing';
  cropId: DatabaseId;
  title: string;
  description: string;
  opportunity: {
    buyMarket: {
      marketId: DatabaseId;
      marketName: string;
      price: number;
      volume: number;
    };
    sellMarket: {
      marketId: DatabaseId;
      marketName: string;
      price: number;
      expectedPrice?: number;
    };
    margin: {
      absolute: number;
      percentage: number;
      currency: string;
    };
    volume: {
      available: number;
      recommended: number;
      unit: string;
    };
  };
  requirements: {
    capital: number;
    storage?: boolean;
    transportation: boolean;
    processing?: boolean;
    certification?: string[];
    timeline: string;
  };
  risks: {
    priceVolatility: 'low' | 'medium' | 'high';
    qualityDegradation: 'low' | 'medium' | 'high';
    transportationIssues: 'low' | 'medium' | 'high';
    marketAccess: 'low' | 'medium' | 'high';
    regulatoryChanges: 'low' | 'medium' | 'high';
    weatherDependency: 'low' | 'medium' | 'high';
  };
  timeframe: {
    window: {
      start: Date;
      end: Date;
    };
    urgency: 'immediate' | 'within_week' | 'within_month' | 'seasonal';
    duration: string;
  };
  confidence: {
    score: number;
    factors: string[];
    dataQuality: number;
  };
  targetAudience: {
    traders: boolean;
    farmers: boolean;
    processors: boolean;
    cooperatives: boolean;
    minCapital?: number;
    experience?: 'beginner' | 'intermediate' | 'advanced';
  };
  performance: {
    views: number;
    actions: number;
    feedback: {
      helpful: number;
      notHelpful: number;
    };
  };
  status: 'active' | 'expired' | 'realized' | 'missed';
  expiresAt: Date;
  createdBy: DatabaseId | 'system';
  createdAt: Date;
  updatedAt: Date;
}

export interface MarketNews {
  id: DatabaseId;
  title: string;
  content: string;
  summary: string;
  category: 'policy' | 'weather' | 'trade' | 'technology' | 'market_update' | 'analysis' | 'alert';
  impact: {
    level: 'low' | 'medium' | 'high' | 'critical';
    crops: DatabaseId[];
    markets: DatabaseId[];
    timeframe: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
  };
  source: {
    name: string;
    url?: string;
    reliability: number;
    type: 'government' | 'news_agency' | 'research' | 'trade_body' | 'internal';
  };
  tags: string[];
  attachments: {
    images: string[];
    documents: string[];
    videos: string[];
  };
  seo: {
    slug: string;
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
  };
  engagement: {
    views: number;
    likes: number;
    shares: number;
    comments: number;
  };
  isBreaking: boolean;
  isPinned: boolean;
  isFeatured: boolean;
  publishedAt: Date;
  authorId: DatabaseId;
  createdAt: Date;
  updatedAt: Date;
}

export interface PriceComparison {
  cropId: DatabaseId;
  date: Date;
  markets: {
    marketId: DatabaseId;
    marketName: string;
    location: string;
    price: number;
    volume: number;
    grade: string;
    trend: 'up' | 'down' | 'stable';
    change: number;
    rank: number;
  }[];
  bestBuyMarket: {
    marketId: DatabaseId;
    marketName: string;
    price: number;
    advantages: string[];
  };
  bestSellMarket: {
    marketId: DatabaseId;
    marketName: string;
    price: number;
    advantages: string[];
  };
  priceSpread: {
    highest: number;
    lowest: number;
    difference: number;
    percentage: number;
  };
  recommendations: {
    buyers: string[];
    sellers: string[];
    general: string[];
  };
  factors: {
    priceDrivers: string[];
    marketConditions: string[];
    externalFactors: string[];
  };
}

export interface CreatePriceAlertRequest {
  cropId: DatabaseId;
  alertType: 'price_above' | 'price_below' | 'price_change' | 'volume_change';
  conditions: {
    targetPrice?: number;
    changePercentage?: number;
    volumeThreshold?: number;
  };
  markets?: DatabaseId[];
  grades?: string[];
  notifications: {
    email?: boolean;
    sms?: boolean;
    push?: boolean;
  };
  expiresAt?: Date;
}

export interface MarketSearchFilters {
  cropId?: DatabaseId;
  marketType?: Market['type'];
  location?: {
    country?: string;
    state?: string;
    city?: string;
    radius?: number;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  priceRange?: {
    min: number;
    max: number;
  };
  facilities?: string[];
  services?: string[];
  rating?: number;
  isVerified?: boolean;
}

export interface MarketStats {
  totalMarkets: number;
  activeMarkets: number;
  verifiedMarkets: number;
  byType: Record<Market['type'], number>;
  byRegion: {
    region: string;
    count: number;
    averageRating: number;
  }[];
  topCrops: {
    cropId: DatabaseId;
    cropName: string;
    marketCount: number;
    averagePrice: number;
    volumeTraded: number;
  }[];
  priceVolatility: {
    cropId: DatabaseId;
    cropName: string;
    volatility: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  }[];
  recentActivity: {
    date: Date;
    newMarkets: number;
    priceUpdates: number;
    tradingVolume: number;
  }[];
}