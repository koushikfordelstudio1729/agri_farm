import { Request, Response } from 'express';
import { 
  MarketPriceRequest,
  UpdateMarketPriceRequest,
  MarketPriceResponse,
  PriceAlertRequest,
  UpdatePriceAlertRequest,
  PriceAlertResponse,
  MarketLocationRequest,
  MarketLocationResponse,
  MarketDataSourcesRequest,
  BulkPriceRequest
} from '@/controllers/marketController.types';

// Route parameter types
export interface PriceParamsWithId {
  priceId: string;
}

export interface CropPriceParams {
  cropId: string;
}

export interface AlertParamsWithId {
  alertId: string;
}

// Query parameter types
export interface GetPricesQuery {
  crop?: string;
  location?: string;
  market?: string;
  type?: 'wholesale' | 'retail' | 'farm_gate' | 'export';
  radius?: string;
  lat?: string;
  lng?: string;
  page?: string;
  limit?: string;
  sortBy?: 'price' | 'date' | 'distance' | 'demand';
  sortOrder?: 'asc' | 'desc';
}

export interface GetPriceHistoryQuery {
  startDate?: string;
  endDate?: string;
  location?: string;
  market?: string;
  interval?: 'daily' | 'weekly' | 'monthly';
}

export interface GetPriceTrendsQuery {
  period?: '7d' | '30d' | '90d' | '6m' | '1y';
  location?: string;
  market?: string;
  includeForcast?: string;
}

export interface GetPriceAlertsQuery {
  active?: string;
  crop?: string;
  page?: string;
  limit?: string;
}

export interface GetMarketLocationsQuery {
  search?: string;
  lat?: string;
  lng?: string;
  radius?: string;
  type?: 'wholesale' | 'retail' | 'farm_gate' | 'export';
  limit?: string;
}

export interface GetDemandSupplyQuery {
  location?: string;
  period?: 'current' | 'week' | 'month' | 'season';
}

export interface ComparePricesQuery {
  markets?: string[];
  date?: string;
}

export interface GetSeasonalPatternsQuery {
  location?: string;
  years?: string;
}

export interface SearchMarketsQuery {
  q: string;
  type?: 'crops' | 'markets' | 'all';
  location?: string;
  limit?: string;
}

export interface GetPersonalizedInsightsQuery {
  crops?: string[];
  location?: string;
}

export interface GetMarketNewsQuery {
  category?: 'prices' | 'supply' | 'demand' | 'weather' | 'policy';
  crop?: string;
  location?: string;
  page?: string;
  limit?: string;
}

export interface GetMarketAnalyticsQuery {
  period?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  startDate?: string;
  endDate?: string;
  crop?: string;
  location?: string;
}

// Express request types
export interface GetCurrentPricesRequestHandler extends Request<{}, MarketPriceResponse[], {}, GetPricesQuery> {}
export interface GetPriceByIdRequestHandler extends Request<PriceParamsWithId, MarketPriceResponse> {}
export interface GetPriceHistoryRequestHandler extends Request<CropPriceParams, any[], {}, GetPriceHistoryQuery> {}
export interface GetPriceTrendsRequestHandler extends Request<CropPriceParams, any, {}, GetPriceTrendsQuery> {}

export interface GetPriceAlertsRequestHandler extends Request<{}, PriceAlertResponse[], {}, GetPriceAlertsQuery> {}
export interface CreatePriceAlertRequestHandler extends Request<{}, PriceAlertResponse, PriceAlertRequest> {}
export interface UpdatePriceAlertRequestHandler extends Request<AlertParamsWithId, PriceAlertResponse, UpdatePriceAlertRequest> {}
export interface DeletePriceAlertRequestHandler extends Request<AlertParamsWithId, any> {}

export interface GetMarketLocationsRequestHandler extends Request<{}, MarketLocationResponse[], {}, GetMarketLocationsQuery> {}
export interface GetDemandSupplyRequestHandler extends Request<CropPriceParams, any, {}, GetDemandSupplyQuery> {}
export interface ComparePricesRequestHandler extends Request<CropPriceParams, any, {}, ComparePricesQuery> {}
export interface GetSeasonalPatternsRequestHandler extends Request<CropPriceParams, any, {}, GetSeasonalPatternsQuery> {}

export interface SearchMarketsRequestHandler extends Request<{}, any, {}, SearchMarketsQuery> {}
export interface GetPersonalizedInsightsRequestHandler extends Request<{}, any, {}, GetPersonalizedInsightsQuery> {}
export interface GetMarketNewsRequestHandler extends Request<{}, any[], {}, GetMarketNewsQuery> {}

export interface ReportMarketPriceRequestHandler extends Request<{}, MarketPriceResponse, MarketPriceRequest> {}
export interface UpdateMarketPriceRequestHandler extends Request<PriceParamsWithId, MarketPriceResponse, UpdateMarketPriceRequest> {}
export interface AddMarketLocationRequestHandler extends Request<{}, MarketLocationResponse, MarketLocationRequest> {}

export interface GetMarketAnalyticsRequestHandler extends Request<{}, any, {}, GetMarketAnalyticsQuery> {}
export interface UpdateMarketDataSourcesRequestHandler extends Request<{}, any, MarketDataSourcesRequest> {}
export interface BulkImportPricesRequestHandler extends Request<{}, any, BulkPriceRequest> {}

// Response types with Express
export interface MarketPriceResponseHandler extends Response<MarketPriceResponse> {}
export interface MarketPricesListResponseHandler extends Response<MarketPriceResponse[]> {}
export interface PriceAlertResponseHandler extends Response<PriceAlertResponse> {}
export interface PriceAlertsListResponseHandler extends Response<PriceAlertResponse[]> {}
export interface MarketLocationResponseHandler extends Response<MarketLocationResponse> {}
export interface MarketAnalyticsResponseHandler extends Response<any> {}