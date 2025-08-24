import type { Request, Response } from 'express';
import type {
  MarketPriceData,
  PriceAlertData,
  MarketStats,
  DatabaseId,
  ApiResponse,
  TypedResponse,
  PaginationResponse,
  AuthenticatedUser,
} from '@/types';

// Request interfaces
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

export interface GetMarketPricesRequest extends AuthenticatedRequest {
  query: {
    cropId?: string;
    location?: string; // "lat,lng" format
    market?: string;
    grade?: string;
    unit?: string;
    startDate?: string;
    endDate?: string;
    page?: string;
    limit?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };
}

export interface GetPriceHistoryRequest extends AuthenticatedRequest {
  query: {
    cropId: string;
    market?: string;
    days?: string;
  };
}

export interface GetPriceTrendsRequest extends AuthenticatedRequest {
  query: {
    period?: '24h' | '7d' | '30d' | '90d';
  };
}

export interface GetPriceAlertsRequest extends AuthenticatedRequest {
  query: {
    status?: 'active' | 'triggered' | 'paused' | 'cancelled';
  };
}

export interface CreatePriceAlertRequest extends AuthenticatedRequest {
  body: {
    cropId: string;
    market?: string;
    alertType: 'price_above' | 'price_below' | 'price_change';
    targetPrice: number;
    condition: 'above' | 'below' | 'equal';
    location?: {
      latitude: number;
      longitude: number;
      address?: string;
      city?: string;
      state?: string;
      country?: string;
    };
    notificationMethods?: ('push' | 'email' | 'sms')[];
  };
}

export interface UpdatePriceAlertRequest extends AuthenticatedRequest {
  params: {
    alertId: string;
  };
  body: {
    targetPrice?: number;
    condition?: 'above' | 'below' | 'equal';
    notificationMethods?: ('push' | 'email' | 'sms')[];
    status?: 'active' | 'paused' | 'cancelled';
  };
}

export interface DeletePriceAlertRequest extends AuthenticatedRequest {
  params: {
    alertId: string;
  };
}

export interface GetMarketStatsRequest extends AuthenticatedRequest {
  query: {
    period?: '7d' | '30d' | '90d' | '1y';
  };
}

export interface AddMarketPriceRequest extends AuthenticatedRequest {
  body: {
    cropId: string;
    market: string;
    price: number;
    volume?: number;
    unit: string;
    grade?: string;
    location?: {
      latitude: number;
      longitude: number;
      address?: string;
      city?: string;
      state?: string;
      country?: string;
    };
    source?: string;
    date?: string;
  };
}

export interface UpdateMarketPriceRequest extends AuthenticatedRequest {
  params: {
    priceId: string;
  };
  body: {
    price?: number;
    volume?: number;
    unit?: string;
    grade?: string;
  };
}

export interface DeleteMarketPriceRequest extends AuthenticatedRequest {
  params: {
    priceId: string;
  };
}

export interface GetMarketLocationsRequest extends AuthenticatedRequest {
  query: {
    country?: string;
    state?: string;
    city?: string;
    radius?: string;
  };
}

export interface AddMarketLocationRequest extends AuthenticatedRequest {
  body: {
    name: string;
    address: string;
    city: string;
    state: string;
    country: string;
    latitude: number;
    longitude: number;
  };
}

export interface SearchMarketsRequest extends AuthenticatedRequest {
  query: {
    q?: string;
    cropId?: string;
    location?: string;
    priceRange?: string; // "min,max" format
    dateRange?: string; // "start,end" format
    page?: string;
    limit?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };
}

// Response interfaces
export interface MarketPriceResponse {
  _id: DatabaseId;
  crop: {
    _id: DatabaseId;
    name: string;
    scientificName: string;
    category: string;
    image?: string;
  };
  market: string;
  price: number;
  volume?: number;
  unit: string;
  grade?: string;
  location?: {
    type: 'Point';
    coordinates: [number, number];
    address?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  source: string;
  date: Date;
  submittedBy?: DatabaseId;
  isVerified: boolean;
  createdAt: Date;
  updatedAt?: Date;
  updatedBy?: DatabaseId;
}

export interface PriceHistoryResponse {
  crop: {
    _id: DatabaseId;
    name: string;
    scientificName: string;
  };
  market?: string;
  period: {
    startDate: Date;
    endDate: Date;
    days: number;
  };
  history: Array<{
    date: Date;
    averagePrice: number;
    minPrice: number;
    maxPrice: number;
    totalVolume: number;
    pricePoints: number;
  }>;
  trends: {
    direction: 'increasing' | 'decreasing' | 'stable';
    changePercent: number;
    volatility: 'low' | 'high';
  };
  summary: {
    totalDataPoints: number;
    averagePrice: number;
    priceRange: {
      min: number;
      max: number;
    };
    volatility: number;
  };
}

export interface PriceTrendResponse {
  period: string;
  updatedAt: Date;
  gainers: Array<{
    crop: {
      _id: DatabaseId;
      name: string;
      scientificName: string;
      category: string;
      image?: string;
    };
    currentPrice: number;
    previousPrice: number;
    priceChange: number;
    priceChangePercent: number;
    volume: number;
    volatility: number;
  }>;
  losers: Array<{
    crop: {
      _id: DatabaseId;
      name: string;
      scientificName: string;
      category: string;
      image?: string;
    };
    currentPrice: number;
    previousPrice: number;
    priceChange: number;
    priceChangePercent: number;
    volume: number;
    volatility: number;
  }>;
  mostActive: Array<{
    crop: {
      _id: DatabaseId;
      name: string;
      scientificName: string;
      category: string;
      image?: string;
    };
    currentPrice: number;
    volume: number;
    priceChangePercent: number;
    volatility: number;
  }>;
}

export interface PriceAlertResponse {
  _id: DatabaseId;
  user: DatabaseId;
  crop: {
    _id: DatabaseId;
    name: string;
    scientificName: string;
    category: string;
    image?: string;
  };
  market?: string;
  alertType: 'price_above' | 'price_below' | 'price_change';
  targetPrice: number;
  condition: 'above' | 'below' | 'equal';
  currentPrice?: number;
  location?: {
    type: 'Point';
    coordinates: [number, number];
    address?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  notificationMethods: ('push' | 'email' | 'sms')[];
  status: 'active' | 'triggered' | 'paused' | 'cancelled';
  triggeredAt?: Date;
  lastChecked?: Date;
  createdAt: Date;
  updatedAt?: Date;
}

export interface MarketStatsResponse {
  period: string;
  overview: {
    totalRecords: number;
    uniqueCropsCount: number;
    uniqueMarketsCount: number;
    avgPrice: number;
    maxPrice: number;
    minPrice: number;
    totalVolume: number;
  };
  topCrops: Array<{
    crop: {
      _id: DatabaseId;
      name: string;
      scientificName: string;
      category: string;
    };
    averagePrice: number;
    volume: number;
    records: number;
    priceRange: {
      min: number;
      max: number;
    };
  }>;
  lastUpdated: Date;
}

export interface MarketLocationResponse {
  market: string;
  location: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    coordinates?: [number, number];
  };
  statistics: {
    priceCount: number;
    latestPrice: Date;
    avgPrice: number;
    uniqueCrops: number;
  };
}

// Controller method types
export type GetMarketPricesController = (
  req: GetMarketPricesRequest,
  res: TypedResponse<MarketPriceResponse[]>
) => Promise<void>;

export type GetPriceHistoryController = (
  req: GetPriceHistoryRequest,
  res: TypedResponse<PriceHistoryResponse>
) => Promise<void>;

export type GetPriceTrendsController = (
  req: GetPriceTrendsRequest,
  res: TypedResponse<PriceTrendResponse>
) => Promise<void>;

export type GetPriceAlertsController = (
  req: GetPriceAlertsRequest,
  res: TypedResponse<PriceAlertResponse[]>
) => Promise<void>;

export type CreatePriceAlertController = (
  req: CreatePriceAlertRequest,
  res: TypedResponse<PriceAlertResponse>
) => Promise<void>;

export type UpdatePriceAlertController = (
  req: UpdatePriceAlertRequest,
  res: TypedResponse<PriceAlertResponse>
) => Promise<void>;

export type DeletePriceAlertController = (
  req: DeletePriceAlertRequest,
  res: TypedResponse<{}>
) => Promise<void>;

export type GetMarketStatsController = (
  req: GetMarketStatsRequest,
  res: TypedResponse<MarketStatsResponse>
) => Promise<void>;

export type AddMarketPriceController = (
  req: AddMarketPriceRequest,
  res: TypedResponse<MarketPriceResponse>
) => Promise<void>;

export type UpdateMarketPriceController = (
  req: UpdateMarketPriceRequest,
  res: TypedResponse<MarketPriceResponse>
) => Promise<void>;

export type DeleteMarketPriceController = (
  req: DeleteMarketPriceRequest,
  res: TypedResponse<{}>
) => Promise<void>;

export type GetMarketLocationsController = (
  req: GetMarketLocationsRequest,
  res: TypedResponse<MarketLocationResponse[]>
) => Promise<void>;

export type AddMarketLocationController = (
  req: AddMarketLocationRequest,
  res: TypedResponse<MarketLocationResponse>
) => Promise<void>;

export type SearchMarketsController = (
  req: SearchMarketsRequest,
  res: TypedResponse<MarketPriceResponse[]>
) => Promise<void>;

// Service response types
export interface MarketServiceResult {
  success: boolean;
  data?: MarketPriceResponse | MarketPriceResponse[];
  message?: string;
  error?: string;
}

export interface PriceAlertServiceResult {
  success: boolean;
  alert?: PriceAlertResponse;
  message?: string;
  error?: string;
}

export interface MarketSearchResult {
  success: boolean;
  prices: MarketPriceResponse[];
  pagination: PaginationResponse;
  message?: string;
  error?: string;
}

// Validation types
export interface MarketValidationErrors {
  cropId?: string[];
  market?: string[];
  price?: string[];
  volume?: string[];
  unit?: string[];
  grade?: string[];
  location?: string[];
  date?: string[];
}

export interface PriceAlertValidationErrors {
  cropId?: string[];
  alertType?: string[];
  targetPrice?: string[];
  condition?: string[];
  notificationMethods?: string[];
}