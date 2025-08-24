import { Response, NextFunction } from 'express';
import { Weather } from '@/models/Weather';
import { logger } from '@/utils/logger';
import axios from 'axios';
import {
  NotFoundError,
  ValidationError,
  BadRequestError,
  createErrorContext,
} from '@/utils/errors';
import { ApiResponse, PaginationResponse } from '@/types/common.types';
import {
  AuthenticatedRequest,
  GetCurrentWeatherRequest,
  GetWeatherForecastRequest,
  GetHistoricalWeatherRequest,
  GetWeatherAlertsRequest,
  GetAgriculturalAdviceRequest,
  SaveLocationRequest,
  GetSavedLocationsRequest,
  DeleteLocationRequest,
  GetWeatherStatsRequest,
  WeatherResponse,
  WeatherForecastResponse,
  HistoricalWeatherResponse,
  WeatherAlertResponse,
  AgriculturalAdviceResponse,
  LocationResponse,
  WeatherStatsResponse,
  GetCurrentWeatherController,
  GetWeatherForecastController,
  GetHistoricalWeatherController,
  GetWeatherAlertsController,
  GetAgriculturalAdviceController,
  SaveLocationController,
  GetSavedLocationsController,
  DeleteLocationController,
  GetWeatherStatsController,
} from './weatherController.types';

// Weather API configuration
const WEATHER_API_KEY = process.env.WEATHER_API_KEY || '';
const WEATHER_API_URL = process.env.WEATHER_API_URL || 'https://api.openweathermap.org/data/2.5';

export class WeatherController {
  public getCurrentWeather: GetCurrentWeatherController = async (req, res, next) => {
    try {
      const { latitude, longitude, locationName } = req.query;

      if (!latitude || !longitude) {
        throw new ValidationError('Latitude and longitude are required', {
          latitude: !latitude ? ['Latitude is required'] : [],
          longitude: !longitude ? ['Longitude is required'] : [],
        }, createErrorContext(req));
      }

      // Fetch current weather from external API
      const response = await axios.get(`${WEATHER_API_URL}/weather`, {
        params: {
          lat: latitude,
          lon: longitude,
          appid: WEATHER_API_KEY,
          units: 'metric',
        },
        timeout: 10000,
      });

      const weatherData = response.data;

      // Transform API response to our format
      const currentWeather: WeatherResponse = {
        location: {
          name: locationName || weatherData.name,
          latitude: parseFloat(latitude as string),
          longitude: parseFloat(longitude as string),
          country: weatherData.sys.country,
          region: weatherData.sys.country,
        },
        current: {
          temperature: weatherData.main.temp,
          feelsLike: weatherData.main.feels_like,
          humidity: weatherData.main.humidity,
          pressure: weatherData.main.pressure,
          windSpeed: weatherData.wind.speed,
          windDirection: weatherData.wind.deg,
          visibility: weatherData.visibility / 1000, // Convert to km
          uvIndex: 0, // Not available in current weather API
          cloudCover: weatherData.clouds.all,
          condition: weatherData.weather[0].main,
          description: weatherData.weather[0].description,
          icon: weatherData.weather[0].icon,
        },
        agriculturalFactors: {
          soilMoisture: this.calculateSoilMoisture(weatherData),
          growingDegreeDays: this.calculateGDD(weatherData.main.temp),
          evapotranspiration: this.calculateET(weatherData),
          diseaseRisk: this.assessDiseaseRisk(weatherData),
          pestRisk: this.assessPestRisk(weatherData),
        },
        timestamp: new Date(),
        source: 'OpenWeatherMap',
      };

      // Save to database for historical tracking
      const weatherRecord = new Weather({
        location: currentWeather.location,
        data: currentWeather.current,
        agriculturalFactors: currentWeather.agriculturalFactors,
        timestamp: currentWeather.timestamp,
        source: currentWeather.source,
        type: 'current',
      });

      await weatherRecord.save();

      logger.info('Current weather retrieved', {
        userId: req.user?.id,
        location: `${latitude},${longitude}`,
        locationName,
        temperature: currentWeather.current.temperature,
        requestId: (req as any).id,
      });

      const response_data: ApiResponse<WeatherResponse> = {
        success: true,
        message: 'Current weather retrieved successfully',
        data: currentWeather,
      };

      res.json(response_data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('Weather API error', {
          status: error.response?.status,
          message: error.message,
          requestId: (req as any).id,
        });
        throw new BadRequestError('Weather data temporarily unavailable');
      }
      next(error);
    }
  };

  public getWeatherForecast: GetWeatherForecastController = async (req, res, next) => {
    try {
      const { latitude, longitude, days = '5', locationName } = req.query;

      if (!latitude || !longitude) {
        throw new ValidationError('Latitude and longitude are required', {
          latitude: !latitude ? ['Latitude is required'] : [],
          longitude: !longitude ? ['Longitude is required'] : [],
        }, createErrorContext(req));
      }

      const forecastDays = Math.min(parseInt(days as string, 10), 16); // API limit

      // Fetch forecast from external API
      const response = await axios.get(`${WEATHER_API_URL}/forecast`, {
        params: {
          lat: latitude,
          lon: longitude,
          appid: WEATHER_API_KEY,
          units: 'metric',
          cnt: forecastDays * 8, // 8 forecasts per day (3-hour intervals)
        },
        timeout: 10000,
      });

      const forecastData = response.data;

      // Group forecasts by day
      const dailyForecasts: WeatherForecastResponse['forecast'] = [];
      const groupedByDay: { [key: string]: any[] } = {};

      forecastData.list.forEach((item: any) => {
        const date = new Date(item.dt * 1000).toISOString().split('T')[0];
        if (!groupedByDay[date]) {
          groupedByDay[date] = [];
        }
        groupedByDay[date].push(item);
      });

      // Process each day
      Object.entries(groupedByDay).forEach(([date, dayData]) => {
        const temperatures = dayData.map(item => item.main.temp);
        const humidity = dayData.map(item => item.main.humidity);
        const conditions = dayData.map(item => item.weather[0]);

        dailyForecasts.push({
          date: new Date(date),
          temperature: {
            min: Math.min(...temperatures),
            max: Math.max(...temperatures),
            average: temperatures.reduce((a, b) => a + b, 0) / temperatures.length,
          },
          humidity: {
            min: Math.min(...humidity),
            max: Math.max(...humidity),
            average: humidity.reduce((a, b) => a + b, 0) / humidity.length,
          },
          precipitation: {
            probability: Math.max(...dayData.map(item => (item.pop || 0) * 100)),
            amount: dayData.reduce((sum, item) => sum + (item.rain?.['3h'] || 0), 0),
          },
          wind: {
            speed: Math.max(...dayData.map(item => item.wind.speed)),
            direction: dayData[0].wind.deg,
          },
          condition: this.getMostCommonCondition(conditions),
          description: this.getMostCommonCondition(conditions).description,
          icon: this.getMostCommonCondition(conditions).icon,
          agriculturalFactors: {
            soilMoisture: this.calculateSoilMoistureFromForecast(dayData),
            growingDegreeDays: this.calculateGDDRange(Math.min(...temperatures), Math.max(...temperatures)),
            diseaseRisk: this.assessDiseaseRiskFromForecast(dayData),
            pestRisk: this.assessPestRiskFromForecast(dayData),
          },
        });
      });

      const forecast: WeatherForecastResponse = {
        location: {
          name: locationName || forecastData.city.name,
          latitude: parseFloat(latitude as string),
          longitude: parseFloat(longitude as string),
          country: forecastData.city.country,
          region: forecastData.city.country,
        },
        forecast: dailyForecasts,
        timestamp: new Date(),
        source: 'OpenWeatherMap',
      };

      logger.info('Weather forecast retrieved', {
        userId: req.user?.id,
        location: `${latitude},${longitude}`,
        days: forecastDays,
        requestId: (req as any).id,
      });

      const response_data: ApiResponse<WeatherForecastResponse> = {
        success: true,
        message: 'Weather forecast retrieved successfully',
        data: forecast,
      };

      res.json(response_data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('Weather forecast API error', {
          status: error.response?.status,
          message: error.message,
          requestId: (req as any).id,
        });
        throw new BadRequestError('Weather forecast data temporarily unavailable');
      }
      next(error);
    }
  };

  public getHistoricalWeather: GetHistoricalWeatherController = async (req, res, next) => {
    try {
      const { latitude, longitude, startDate, endDate } = req.query;

      if (!latitude || !longitude || !startDate || !endDate) {
        throw new ValidationError('Latitude, longitude, startDate, and endDate are required');
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      if (start >= end) {
        throw new ValidationError('Start date must be before end date');
      }

      // Check if data exists in our database first
      const historicalWeather = await Weather.find({
        'location.latitude': { $gte: parseFloat(latitude as string) - 0.01, $lte: parseFloat(latitude as string) + 0.01 },
        'location.longitude': { $gte: parseFloat(longitude as string) - 0.01, $lte: parseFloat(longitude as string) + 0.01 },
        timestamp: { $gte: start, $lte: end },
        type: { $in: ['current', 'historical'] },
      }).sort({ timestamp: 1 });

      const response_data: ApiResponse<HistoricalWeatherResponse> = {
        success: true,
        message: 'Historical weather data retrieved successfully',
        data: {
          location: {
            latitude: parseFloat(latitude as string),
            longitude: parseFloat(longitude as string),
            name: 'Unknown',
            country: 'Unknown',
            region: 'Unknown',
          },
          period: {
            startDate: start,
            endDate: end,
          },
          data: historicalWeather.map(record => ({
            timestamp: record.timestamp,
            temperature: record.data.temperature,
            humidity: record.data.humidity,
            precipitation: record.data.precipitation || 0,
            windSpeed: record.data.windSpeed,
            pressure: record.data.pressure,
            condition: record.data.condition,
            description: record.data.description,
            agriculturalFactors: record.agriculturalFactors,
          })),
          statistics: this.calculateHistoricalStatistics(historicalWeather),
          source: 'Database',
        },
      };

      logger.info('Historical weather retrieved', {
        userId: req.user?.id,
        location: `${latitude},${longitude}`,
        recordCount: historicalWeather.length,
        period: `${startDate} to ${endDate}`,
        requestId: (req as any).id,
      });

      res.json(response_data);
    } catch (error) {
      next(error);
    }
  };

  public getWeatherAlerts: GetWeatherAlertsController = async (req, res, next) => {
    try {
      const { latitude, longitude, severity } = req.query;

      if (!latitude || !longitude) {
        throw new ValidationError('Latitude and longitude are required');
      }

      // Mock weather alerts - in production, this would integrate with weather alert services
      const alerts: WeatherAlertResponse['alerts'] = [
        {
          id: 'alert_1',
          type: 'temperature',
          severity: 'high',
          title: 'Heat Wave Warning',
          description: 'Extreme temperatures expected. Increase watering frequency for crops.',
          startTime: new Date(),
          endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
          affectedAreas: ['Local Region'],
          recommendations: [
            'Increase irrigation frequency',
            'Provide shade for sensitive crops',
            'Monitor soil moisture levels',
          ],
          agriculturalImpact: {
            crops: ['tomatoes', 'lettuce', 'spinach'],
            riskLevel: 'high',
            actions: ['Emergency watering', 'Shade installation'],
          },
        },
      ];

      const filteredAlerts = severity ? alerts.filter(alert => alert.severity === severity) : alerts;

      const response_data: ApiResponse<WeatherAlertResponse> = {
        success: true,
        message: 'Weather alerts retrieved successfully',
        data: {
          location: {
            latitude: parseFloat(latitude as string),
            longitude: parseFloat(longitude as string),
            name: 'Current Location',
            country: 'Unknown',
            region: 'Unknown',
          },
          alerts: filteredAlerts,
          alertsCount: filteredAlerts.length,
          timestamp: new Date(),
        },
      };

      logger.info('Weather alerts retrieved', {
        userId: req.user?.id,
        location: `${latitude},${longitude}`,
        alertsCount: filteredAlerts.length,
        severity,
        requestId: (req as any).id,
      });

      res.json(response_data);
    } catch (error) {
      next(error);
    }
  };

  public getAgriculturalAdvice: GetAgriculturalAdviceController = async (req, res, next) => {
    try {
      const { latitude, longitude, cropType, growthStage } = req.query;

      if (!latitude || !longitude) {
        throw new ValidationError('Latitude and longitude are required');
      }

      // Get current weather for advice generation
      const currentWeatherResponse = await axios.get(`${WEATHER_API_URL}/weather`, {
        params: {
          lat: latitude,
          lon: longitude,
          appid: WEATHER_API_KEY,
          units: 'metric',
        },
        timeout: 10000,
      });

      const weatherData = currentWeatherResponse.data;

      // Generate agricultural advice based on weather conditions
      const advice = this.generateAgriculturalAdvice(weatherData, cropType as string, growthStage as string);

      const response_data: ApiResponse<AgriculturalAdviceResponse> = {
        success: true,
        message: 'Agricultural advice generated successfully',
        data: advice,
      };

      logger.info('Agricultural advice generated', {
        userId: req.user?.id,
        location: `${latitude},${longitude}`,
        cropType,
        growthStage,
        adviceCount: advice.recommendations.length,
        requestId: (req as any).id,
      });

      res.json(response_data);
    } catch (error) {
      next(error);
    }
  };

  public saveLocation: SaveLocationController = async (req, res, next) => {
    try {
      const { name, latitude, longitude, country, region, isDefault = false } = req.body;
      const userId = req.user.id;

      // Check if location already exists for user
      const existingLocation = await Weather.findOne({
        userId,
        'location.name': name,
        type: 'saved_location',
      });

      if (existingLocation) {
        throw new ValidationError('Location with this name already exists', {
          name: ['A location with this name is already saved'],
        }, createErrorContext(req));
      }

      // If this is set as default, unset other defaults
      if (isDefault) {
        await Weather.updateMany(
          { userId, type: 'saved_location' },
          { $set: { isDefault: false } }
        );
      }

      const savedLocation = new Weather({
        userId,
        location: {
          name,
          latitude,
          longitude,
          country,
          region,
        },
        isDefault,
        type: 'saved_location',
        timestamp: new Date(),
      });

      await savedLocation.save();

      logger.info('Location saved', {
        userId,
        locationName: name,
        coordinates: `${latitude},${longitude}`,
        isDefault,
        requestId: (req as any).id,
      });

      const response_data: ApiResponse<LocationResponse> = {
        success: true,
        message: 'Location saved successfully',
        data: {
          id: savedLocation._id.toString(),
          name: savedLocation.location.name,
          latitude: savedLocation.location.latitude,
          longitude: savedLocation.location.longitude,
          country: savedLocation.location.country,
          region: savedLocation.location.region,
          isDefault: savedLocation.isDefault || false,
          createdAt: savedLocation.timestamp,
        },
      };

      res.status(201).json(response_data);
    } catch (error) {
      next(error);
    }
  };

  public getSavedLocations: GetSavedLocationsController = async (req, res, next) => {
    try {
      const userId = req.user.id;

      const savedLocations = await Weather.find({
        userId,
        type: 'saved_location',
      }).sort({ isDefault: -1, createdAt: -1 });

      const locations: LocationResponse[] = savedLocations.map(location => ({
        id: location._id.toString(),
        name: location.location.name,
        latitude: location.location.latitude,
        longitude: location.location.longitude,
        country: location.location.country || 'Unknown',
        region: location.location.region || 'Unknown',
        isDefault: location.isDefault || false,
        createdAt: location.timestamp,
      }));

      logger.info('Saved locations retrieved', {
        userId,
        count: locations.length,
        requestId: (req as any).id,
      });

      const response_data: ApiResponse<LocationResponse[]> = {
        success: true,
        message: 'Saved locations retrieved successfully',
        data: locations,
      };

      res.json(response_data);
    } catch (error) {
      next(error);
    }
  };

  public deleteLocation: DeleteLocationController = async (req, res, next) => {
    try {
      const { locationId } = req.params;
      const userId = req.user.id;

      const location = await Weather.findOne({
        _id: locationId,
        userId,
        type: 'saved_location',
      });

      if (!location) {
        throw new NotFoundError('Location not found', createErrorContext(req));
      }

      await Weather.findByIdAndDelete(locationId);

      logger.info('Location deleted', {
        userId,
        locationId,
        locationName: location.location.name,
        requestId: (req as any).id,
      });

      const response_data: ApiResponse<{}> = {
        success: true,
        message: 'Location deleted successfully',
        data: {},
      };

      res.json(response_data);
    } catch (error) {
      next(error);
    }
  };

  public getWeatherStats: GetWeatherStatsController = async (req, res, next) => {
    try {
      const { latitude, longitude, period = '30d' } = req.query;

      if (!latitude || !longitude) {
        throw new ValidationError('Latitude and longitude are required');
      }

      let startDate: Date;
      switch (period) {
        case '7d':
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '1y':
          startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      }

      const weatherRecords = await Weather.find({
        'location.latitude': { $gte: parseFloat(latitude as string) - 0.01, $lte: parseFloat(latitude as string) + 0.01 },
        'location.longitude': { $gte: parseFloat(longitude as string) - 0.01, $lte: parseFloat(longitude as string) + 0.01 },
        timestamp: { $gte: startDate },
        type: { $in: ['current', 'historical'] },
      });

      const stats = this.calculateWeatherStatistics(weatherRecords, period as string);

      logger.info('Weather statistics retrieved', {
        userId: req.user?.id,
        location: `${latitude},${longitude}`,
        period,
        recordCount: weatherRecords.length,
        requestId: (req as any).id,
      });

      const response_data: ApiResponse<WeatherStatsResponse> = {
        success: true,
        message: 'Weather statistics retrieved successfully',
        data: stats,
      };

      res.json(response_data);
    } catch (error) {
      next(error);
    }
  };

  // Helper methods
  private calculateSoilMoisture(weatherData: any): string {
    const humidity = weatherData.main.humidity;
    const precipitation = weatherData.rain?.['1h'] || 0;
    
    if (precipitation > 5) return 'high';
    if (humidity > 80) return 'moderate';
    if (humidity > 60) return 'low';
    return 'very_low';
  }

  private calculateGDD(temperature: number, baseTemp: number = 10): number {
    return Math.max(0, temperature - baseTemp);
  }

  private calculateET(weatherData: any): number {
    // Simplified ET calculation
    const temp = weatherData.main.temp;
    const humidity = weatherData.main.humidity;
    const windSpeed = weatherData.wind.speed;
    
    return Math.max(0, (temp - 5) * (100 - humidity) / 100 + windSpeed * 0.1);
  }

  private assessDiseaseRisk(weatherData: any): 'low' | 'moderate' | 'high' {
    const humidity = weatherData.main.humidity;
    const temp = weatherData.main.temp;
    
    if (humidity > 85 && temp > 15 && temp < 30) return 'high';
    if (humidity > 70 && temp > 10 && temp < 35) return 'moderate';
    return 'low';
  }

  private assessPestRisk(weatherData: any): 'low' | 'moderate' | 'high' {
    const temp = weatherData.main.temp;
    const windSpeed = weatherData.wind.speed;
    
    if (temp > 20 && temp < 30 && windSpeed < 3) return 'high';
    if (temp > 15 && temp < 35 && windSpeed < 5) return 'moderate';
    return 'low';
  }

  private getMostCommonCondition(conditions: any[]): any {
    const conditionCounts: { [key: string]: number } = {};
    conditions.forEach(condition => {
      const key = condition.main;
      conditionCounts[key] = (conditionCounts[key] || 0) + 1;
    });
    
    const mostCommon = Object.entries(conditionCounts).reduce((a, b) => a[1] > b[1] ? a : b);
    return conditions.find(c => c.main === mostCommon[0]);
  }

  private calculateSoilMoistureFromForecast(dayData: any[]): string {
    const avgHumidity = dayData.reduce((sum, item) => sum + item.main.humidity, 0) / dayData.length;
    const totalPrecipitation = dayData.reduce((sum, item) => sum + (item.rain?.['3h'] || 0), 0);
    
    if (totalPrecipitation > 10) return 'high';
    if (avgHumidity > 80) return 'moderate';
    if (avgHumidity > 60) return 'low';
    return 'very_low';
  }

  private calculateGDDRange(minTemp: number, maxTemp: number, baseTemp: number = 10): number {
    const avgTemp = (minTemp + maxTemp) / 2;
    return Math.max(0, avgTemp - baseTemp);
  }

  private assessDiseaseRiskFromForecast(dayData: any[]): 'low' | 'moderate' | 'high' {
    const avgHumidity = dayData.reduce((sum, item) => sum + item.main.humidity, 0) / dayData.length;
    const avgTemp = dayData.reduce((sum, item) => sum + item.main.temp, 0) / dayData.length;
    
    if (avgHumidity > 85 && avgTemp > 15 && avgTemp < 30) return 'high';
    if (avgHumidity > 70 && avgTemp > 10 && avgTemp < 35) return 'moderate';
    return 'low';
  }

  private assessPestRiskFromForecast(dayData: any[]): 'low' | 'moderate' | 'high' {
    const avgTemp = dayData.reduce((sum, item) => sum + item.main.temp, 0) / dayData.length;
    const avgWindSpeed = dayData.reduce((sum, item) => sum + item.wind.speed, 0) / dayData.length;
    
    if (avgTemp > 20 && avgTemp < 30 && avgWindSpeed < 3) return 'high';
    if (avgTemp > 15 && avgTemp < 35 && avgWindSpeed < 5) return 'moderate';
    return 'low';
  }

  private generateAgriculturalAdvice(weatherData: any, cropType?: string, growthStage?: string): AgriculturalAdviceResponse {
    const temp = weatherData.main.temp;
    const humidity = weatherData.main.humidity;
    const windSpeed = weatherData.wind.speed;
    const precipitation = weatherData.rain?.['1h'] || 0;

    const recommendations: string[] = [];
    const warnings: string[] = [];

    // Temperature-based advice
    if (temp > 35) {
      recommendations.push('Provide shade or shelter for sensitive crops');
      recommendations.push('Increase watering frequency');
      warnings.push('Extreme heat may cause plant stress');
    } else if (temp < 5) {
      recommendations.push('Protect crops from frost');
      recommendations.push('Consider covering sensitive plants');
      warnings.push('Frost risk for tender plants');
    }

    // Humidity-based advice
    if (humidity > 85) {
      recommendations.push('Ensure good air circulation');
      recommendations.push('Monitor for fungal diseases');
      warnings.push('High humidity increases disease risk');
    } else if (humidity < 30) {
      recommendations.push('Increase irrigation');
      warnings.push('Low humidity may cause dehydration stress');
    }

    // Precipitation-based advice
    if (precipitation > 10) {
      recommendations.push('Ensure good drainage');
      recommendations.push('Reduce watering schedule');
      warnings.push('Heavy rain may cause waterlogging');
    } else if (precipitation === 0 && humidity < 50) {
      recommendations.push('Increase irrigation frequency');
    }

    // Wind-based advice
    if (windSpeed > 10) {
      recommendations.push('Secure tall plants and structures');
      warnings.push('Strong winds may damage crops');
    }

    // Crop-specific advice
    if (cropType) {
      switch (cropType.toLowerCase()) {
        case 'tomato':
        case 'tomatoes':
          if (humidity > 80) {
            recommendations.push('Monitor for blight and other fungal diseases');
          }
          break;
        case 'lettuce':
          if (temp > 25) {
            recommendations.push('Provide afternoon shade to prevent bolting');
          }
          break;
        case 'wheat':
          if (growthStage === 'flowering' && precipitation > 5) {
            recommendations.push('Monitor for head blight during flowering');
          }
          break;
      }
    }

    return {
      location: {
        latitude: weatherData.coord.lat,
        longitude: weatherData.coord.lon,
        name: weatherData.name,
        country: weatherData.sys.country,
        region: weatherData.sys.country,
      },
      currentConditions: {
        temperature: temp,
        humidity,
        precipitation,
        windSpeed,
        condition: weatherData.weather[0].main,
        description: weatherData.weather[0].description,
      },
      cropType: cropType || 'general',
      growthStage: growthStage || 'general',
      recommendations,
      warnings,
      optimalConditions: {
        temperature: { min: 18, max: 28 },
        humidity: { min: 40, max: 70 },
        soilMoisture: 'moderate',
        sunlight: 'full_sun',
      },
      agriculturalFactors: {
        soilMoisture: this.calculateSoilMoisture(weatherData),
        growingDegreeDays: this.calculateGDD(temp),
        evapotranspiration: this.calculateET(weatherData),
        diseaseRisk: this.assessDiseaseRisk(weatherData),
        pestRisk: this.assessPestRisk(weatherData),
      },
      timestamp: new Date(),
    };
  }

  private calculateHistoricalStatistics(records: any[]): any {
    if (records.length === 0) {
      return {
        temperature: { min: 0, max: 0, average: 0 },
        humidity: { min: 0, max: 0, average: 0 },
        precipitation: { total: 0, average: 0, days: 0 },
        recordCount: 0,
      };
    }

    const temperatures = records.map(r => r.data.temperature);
    const humidities = records.map(r => r.data.humidity);
    const precipitations = records.map(r => r.data.precipitation || 0);

    return {
      temperature: {
        min: Math.min(...temperatures),
        max: Math.max(...temperatures),
        average: temperatures.reduce((a, b) => a + b, 0) / temperatures.length,
      },
      humidity: {
        min: Math.min(...humidities),
        max: Math.max(...humidities),
        average: humidities.reduce((a, b) => a + b, 0) / humidities.length,
      },
      precipitation: {
        total: precipitations.reduce((a, b) => a + b, 0),
        average: precipitations.reduce((a, b) => a + b, 0) / precipitations.length,
        days: precipitations.filter(p => p > 0).length,
      },
      recordCount: records.length,
    };
  }

  private calculateWeatherStatistics(records: any[], period: string): WeatherStatsResponse {
    const stats = this.calculateHistoricalStatistics(records);
    
    return {
      period,
      overview: {
        recordCount: stats.recordCount,
        dataQuality: stats.recordCount > 0 ? 'good' : 'insufficient',
        coverage: `${stats.recordCount} records`,
      },
      temperature: stats.temperature,
      humidity: stats.humidity,
      precipitation: stats.precipitation,
      trends: {
        temperatureTrend: 'stable', // Would calculate actual trend
        precipitationTrend: 'stable',
        humidityTrend: 'stable',
      },
      agriculturalSummary: {
        favorableDays: Math.floor(stats.recordCount * 0.7), // Mock calculation
        stressDays: Math.floor(stats.recordCount * 0.2),
        criticalDays: Math.floor(stats.recordCount * 0.1),
        avgGrowingDegreeDays: stats.temperature.average > 10 ? stats.temperature.average - 10 : 0,
      },
    };
  }
}

export default new WeatherController();