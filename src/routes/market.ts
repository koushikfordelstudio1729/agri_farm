import express from 'express';
import marketController from '@/controllers/marketController';
import { authenticate, authorize } from '@/middleware/auth';
import { validateRequest } from '@/middleware/validation';
import { rateLimit } from '@/middleware/rateLimit';

const router = express.Router();

// Rate limiting for market data requests
const marketDataRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100, // 100 requests per window per IP
  message: {
    error: 'Too many market data requests. Please try again later.',
    retryAfter: 5 * 60,
  },
});

router.use(marketDataRateLimit);

// Public routes (no authentication required)
router.get('/public/prices', 
  validateRequest({
    query: {
      crop: 'string',
      location: 'string',
      market: 'string',
      limit: 'number|min:1|max:100',
    },
  }),
  marketController.getPublicPrices
);

router.get('/public/trends/:cropId', 
  validateRequest({
    params: { cropId: 'required|string|mongoId' },
    query: {
      period: 'string|in:7d,30d,90d,1y',
      location: 'string',
    },
  }),
  marketController.getPublicPriceTrends
);

// Protected routes (authentication required)
router.use(authenticate);

// Get current market prices with filtering
router.get('/prices', 
  validateRequest({
    query: {
      crop: 'string|mongoId',
      location: 'string',
      market: 'string',
      type: 'string|in:wholesale,retail,farm_gate,export',
      radius: 'number|min:1|max:500', // km
      lat: 'number|between:-90,90',
      lng: 'number|between:-180,180',
      page: 'number|min:1',
      limit: 'number|min:1|max:100',
      sortBy: 'string|in:price,date,distance,demand',
      sortOrder: 'string|in:asc,desc',
    },
  }),
  marketController.getCurrentPrices
);

// Get specific market price by ID
router.get('/prices/:priceId', 
  validateRequest({
    params: { priceId: 'required|string|mongoId' },
  }),
  marketController.getPriceById
);

// Get price history for a crop
router.get('/prices/history/:cropId', 
  validateRequest({
    params: { cropId: 'required|string|mongoId' },
    query: {
      startDate: 'date',
      endDate: 'date',
      location: 'string',
      market: 'string',
      interval: 'string|in:daily,weekly,monthly',
    },
  }),
  marketController.getPriceHistory
);

// Get price trends and analytics
router.get('/trends/:cropId', 
  validateRequest({
    params: { cropId: 'required|string|mongoId' },
    query: {
      period: 'string|in:7d,30d,90d,6m,1y',
      location: 'string',
      market: 'string',
      includeForcast: 'boolean',
    },
  }),
  marketController.getPriceTrends
);

// Get price alerts for user
router.get('/alerts', 
  validateRequest({
    query: {
      active: 'boolean',
      crop: 'string|mongoId',
      page: 'number|min:1',
      limit: 'number|min:1|max:50',
    },
  }),
  marketController.getPriceAlerts
);

// Create price alert
router.post('/alerts', 
  validateRequest({
    body: {
      crop: 'required|string|mongoId',
      targetPrice: 'required|number|min:0',
      condition: 'required|string|in:above,below,change',
      threshold: 'number|min:0|max:100', // percentage for change condition
      location: 'object',
      'location.latitude': 'number|between:-90,90',
      'location.longitude': 'number|between:-180,180',
      'location.radius': 'number|min:1|max:500',
      notificationChannels: 'array',
      'notificationChannels.*': 'string|in:push,email,sms',
      isActive: 'boolean',
    },
  }),
  marketController.createPriceAlert
);

// Update price alert
router.put('/alerts/:alertId', 
  validateRequest({
    params: { alertId: 'required|string|mongoId' },
    body: {
      targetPrice: 'number|min:0',
      condition: 'string|in:above,below,change',
      threshold: 'number|min:0|max:100',
      notificationChannels: 'array',
      'notificationChannels.*': 'string|in:push,email,sms',
      isActive: 'boolean',
    },
  }),
  marketController.updatePriceAlert
);

// Delete price alert
router.delete('/alerts/:alertId', 
  validateRequest({
    params: { alertId: 'required|string|mongoId' },
  }),
  marketController.deletePriceAlert
);

// Get markets/locations
router.get('/locations', 
  validateRequest({
    query: {
      search: 'string|min:2',
      lat: 'number|between:-90,90',
      lng: 'number|between:-180,180',
      radius: 'number|min:1|max:1000',
      type: 'string|in:wholesale,retail,farm_gate,export',
      limit: 'number|min:1|max:100',
    },
  }),
  marketController.getMarketLocations
);

// Get demand/supply indicators
router.get('/demand-supply/:cropId', 
  validateRequest({
    params: { cropId: 'required|string|mongoId' },
    query: {
      location: 'string',
      period: 'string|in:current,week,month,season',
    },
  }),
  marketController.getDemandSupplyIndicators
);

// Get price comparison across markets
router.get('/compare/:cropId', 
  validateRequest({
    params: { cropId: 'required|string|mongoId' },
    query: {
      markets: 'array|min:2',
      'markets.*': 'string',
      date: 'date',
    },
  }),
  marketController.comparePricesAcrossMarkets
);

// Get seasonal price patterns
router.get('/seasonal/:cropId', 
  validateRequest({
    params: { cropId: 'required|string|mongoId' },
    query: {
      location: 'string',
      years: 'number|min:1|max:10',
    },
  }),
  marketController.getSeasonalPricePatterns
);

// Search markets and crops
router.get('/search', 
  validateRequest({
    query: {
      q: 'required|string|min:2|max:100',
      type: 'string|in:crops,markets,all',
      location: 'string',
      limit: 'number|min:1|max:50',
    },
  }),
  marketController.searchMarkets
);

// Get personalized market insights
router.get('/insights', 
  validateRequest({
    query: {
      crops: 'array',
      'crops.*': 'string|mongoId',
      location: 'string',
    },
  }),
  marketController.getPersonalizedInsights
);

// Get market news and updates
router.get('/news', 
  validateRequest({
    query: {
      category: 'string|in:prices,supply,demand,weather,policy',
      crop: 'string|mongoId',
      location: 'string',
      page: 'number|min:1',
      limit: 'number|min:1|max:20',
    },
  }),
  marketController.getMarketNews
);

// Contributor/Market Admin routes
router.use(authorize(['expert', 'market_admin', 'admin', 'super_admin']));

// Report/update market price
router.post('/prices', 
  validateRequest({
    body: {
      crop: 'required|string|mongoId',
      variety: 'string',
      price: 'required|number|min:0',
      unit: 'required|string|in:kg,quintal,ton,piece,dozen',
      currency: 'string|length:3', // ISO currency code
      quality: 'string|in:grade_a,grade_b,mixed,organic',
      quantity: 'number|min:0',
      market: 'required|object',
      'market.name': 'required|string',
      'market.type': 'required|string|in:wholesale,retail,farm_gate,export',
      'market.location': 'required|object',
      'market.location.latitude': 'required|number|between:-90,90',
      'market.location.longitude': 'required|number|between:-180,180',
      'market.location.address': 'required|string',
      source: 'string',
      reliability: 'number|min:0|max:100',
      date: 'date',
    },
  }),
  marketController.reportMarketPrice
);

// Update market price
router.put('/prices/:priceId', 
  validateRequest({
    params: { priceId: 'required|string|mongoId' },
  }),
  marketController.updateMarketPrice
);

// Add market location
router.post('/locations', 
  validateRequest({
    body: {
      name: 'required|string|min:2|max:200',
      type: 'required|string|in:wholesale,retail,farm_gate,export',
      location: 'required|object',
      'location.latitude': 'required|number|between:-90,90',
      'location.longitude': 'required|number|between:-180,180',
      'location.address': 'required|string',
      'location.city': 'string',
      'location.state': 'string',
      'location.country': 'required|string',
      contactInfo: 'object',
      'contactInfo.phone': 'string',
      'contactInfo.email': 'string|email',
      'contactInfo.website': 'string|url',
      operatingHours: 'array',
      specialties: 'array',
      'specialties.*': 'string|mongoId',
    },
  }),
  marketController.addMarketLocation
);

// Admin only routes
router.use(authorize(['admin', 'super_admin']));

// Get market analytics
router.get('/analytics', 
  validateRequest({
    query: {
      period: 'string|in:day,week,month,quarter,year',
      startDate: 'date',
      endDate: 'date',
      crop: 'string|mongoId',
      location: 'string',
    },
  }),
  marketController.getMarketAnalytics
);

// Manage market data sources
router.put('/sources', 
  validateRequest({
    body: {
      sources: 'required|array|min:1',
      'sources.*': 'required|object',
      'sources.*.name': 'required|string',
      'sources.*.url': 'required|string|url',
      'sources.*.apiKey': 'string',
      'sources.*.isActive': 'required|boolean',
      'sources.*.updateInterval': 'required|number|min:5|max:1440', // minutes
      'sources.*.reliability': 'required|number|min:0|max:100',
    },
  }),
  marketController.updateMarketDataSources
);

// Bulk price operations
router.post('/prices/bulk', marketController.bulkImportPrices);
router.put('/prices/bulk', marketController.bulkUpdatePrices);
router.delete('/prices/bulk', marketController.bulkDeletePrices);

// Market data validation and cleanup
router.post('/validate', marketController.validateMarketData);
router.delete('/cleanup', marketController.cleanupOldMarketData);

// Market service health
router.get('/health', marketController.getMarketServiceHealth);

export default router;