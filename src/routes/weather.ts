import express from 'express';
import weatherController from '@/controllers/weatherController';
import { authenticate, authorize } from '@/middleware/auth';
import { validateRequest } from '@/middleware/validation';
import { rateLimit } from '@/middleware/rateLimit';

const router = express.Router();

// Rate limiting for weather API calls
const weatherRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per window per IP
  message: {
    error: 'Too many weather requests. Please try again later.',
    retryAfter: 15 * 60,
  },
});

router.use(weatherRateLimit);

// Public routes (no authentication required)
router.get('/public/current', 
  validateRequest({
    query: {
      lat: 'required|number|between:-90,90',
      lng: 'required|number|between:-180,180',
    },
  }),
  weatherController.getCurrentWeatherPublic
);

router.get('/public/forecast', 
  validateRequest({
    query: {
      lat: 'required|number|between:-90,90',
      lng: 'required|number|between:-180,180',
      days: 'number|min:1|max:7',
    },
  }),
  weatherController.getForecastPublic
);

// Protected routes (authentication required)
router.use(authenticate);

// Get current weather for location
router.get('/current', 
  validateRequest({
    query: {
      lat: 'required|number|between:-90,90',
      lng: 'required|number|between:-180,180',
    },
  }),
  weatherController.getCurrentWeather
);

// Get weather forecast
router.get('/forecast', 
  validateRequest({
    query: {
      lat: 'required|number|between:-90,90',
      lng: 'required|number|between:-180,180',
      days: 'number|min:1|max:14',
    },
  }),
  weatherController.getForecast
);

// Get weather alerts for location
router.get('/alerts', 
  validateRequest({
    query: {
      lat: 'required|number|between:-90,90',
      lng: 'required|number|between:-180,180',
      radius: 'number|min:1|max:100', // km
    },
  }),
  weatherController.getWeatherAlerts
);

// Get agricultural advice based on weather
router.post('/advice', 
  validateRequest({
    body: {
      location: 'required|object',
      'location.latitude': 'required|number|between:-90,90',
      'location.longitude': 'required|number|between:-180,180',
      crops: 'array',
      'crops.*': 'string|mongoId',
      farmSize: 'number|min:0',
      season: 'string|in:spring,summer,autumn,winter',
    },
  }),
  weatherController.getAgriculturalAdvice
);

// Get historical weather data
router.get('/historical', 
  validateRequest({
    query: {
      lat: 'required|number|between:-90,90',
      lng: 'required|number|between:-180,180',
      startDate: 'required|date',
      endDate: 'required|date',
    },
  }),
  weatherController.getHistoricalWeather
);

// Get weather statistics for a period
router.get('/statistics', 
  validateRequest({
    query: {
      lat: 'required|number|between:-90,90',
      lng: 'required|number|between:-180,180',
      period: 'required|string|in:week,month,season,year',
      year: 'number|min:2000|max:2030',
    },
  }),
  weatherController.getWeatherStatistics
);

// Subscribe to weather alerts
router.post('/alerts/subscribe', 
  validateRequest({
    body: {
      location: 'required|object',
      'location.latitude': 'required|number|between:-90,90',
      'location.longitude': 'required|number|between:-180,180',
      alertTypes: 'required|array|min:1',
      'alertTypes.*': 'required|string|in:rain,drought,frost,heat,wind,storm',
      radius: 'number|min:1|max:50',
      notificationChannels: 'array',
      'notificationChannels.*': 'string|in:push,email,sms',
    },
  }),
  weatherController.subscribeToWeatherAlerts
);

// Unsubscribe from weather alerts
router.delete('/alerts/subscribe/:subscriptionId', 
  validateRequest({
    params: { subscriptionId: 'required|string|mongoId' },
  }),
  weatherController.unsubscribeFromWeatherAlerts
);

// Get user's weather alert subscriptions
router.get('/alerts/subscriptions', weatherController.getWeatherAlertSubscriptions);

// Get weather-based crop recommendations
router.post('/recommendations', 
  validateRequest({
    body: {
      location: 'required|object',
      'location.latitude': 'required|number|between:-90,90',
      'location.longitude': 'required|number|between:-180,180',
      soilType: 'string|in:clay,sand,silt,loam',
      farmSize: 'number|min:0',
      experience: 'string|in:beginner,intermediate,advanced',
      season: 'string|in:spring,summer,autumn,winter',
    },
  }),
  weatherController.getWeatherBasedCropRecommendations
);

// Get irrigation recommendations based on weather
router.post('/irrigation', 
  validateRequest({
    body: {
      location: 'required|object',
      'location.latitude': 'required|number|between:-90,90',
      'location.longitude': 'required|number|between:-180,180',
      crops: 'required|array|min:1',
      'crops.*': 'required|object',
      'crops.*.cropId': 'required|string|mongoId',
      'crops.*.plantingDate': 'required|date',
      'crops.*.stage': 'required|string',
      soilMoisture: 'number|between:0,100',
    },
  }),
  weatherController.getIrrigationRecommendations
);

// Get pest and disease risk based on weather
router.post('/risk-assessment', 
  validateRequest({
    body: {
      location: 'required|object',
      'location.latitude': 'required|number|between:-90,90',
      'location.longitude': 'required|number|between:-180,180',
      crops: 'required|array|min:1',
      'crops.*': 'required|string|mongoId',
      season: 'string|in:spring,summer,autumn,winter',
    },
  }),
  weatherController.getPestDiseaseRiskAssessment
);

// Get optimal planting times based on weather patterns
router.post('/planting-calendar', 
  validateRequest({
    body: {
      location: 'required|object',
      'location.latitude': 'required|number|between:-90,90',
      'location.longitude': 'required|number|between:-180,180',
      crops: 'required|array|min:1',
      'crops.*': 'required|string|mongoId',
      year: 'number|min:2024|max:2030',
    },
  }),
  weatherController.getOptimalPlantingCalendar
);

// Admin only routes
router.use(authorize(['admin', 'super_admin']));

// Update weather data sources configuration
router.put('/config/sources', 
  validateRequest({
    body: {
      primarySource: 'required|string|in:openweather,weatherapi,accuweather',
      backupSources: 'array',
      'backupSources.*': 'string|in:openweather,weatherapi,accuweather',
      updateInterval: 'number|min:5|max:60', // minutes
      cacheExpiry: 'number|min:1|max:24', // hours
    },
  }),
  weatherController.updateWeatherSourcesConfig
);

// Manually trigger weather data refresh
router.post('/refresh', weatherController.refreshWeatherData);

// Get weather service health and statistics
router.get('/health', weatherController.getWeatherServiceHealth);

export default router;