import axios from 'axios';
import { logger } from '@/utils/logger';
import { WeatherServiceError } from '@/utils/errors';
import { redisClient } from '@/config/redis';
import type {
  WeatherData,
  WeatherForecast,
  WeatherAlert,
  WeatherHistory,
  WeatherStats,
  AgriculturalAdvice,
  IrrigationRecommendation,
  PestRiskAssessment,
  PlantingCalendar,
  WeatherSubscription,
  WeatherProvider,
  WeatherConfig,
} from '@/types/weather.types';

class WeatherService {
  private providers: Map<string, WeatherProvider> = new Map();
  private cacheExpiry = 30 * 60; // 30 minutes in seconds
  private config: WeatherConfig;

  constructor() {
    this.config = {
      primaryProvider: process.env.WEATHER_PRIMARY_PROVIDER || 'openweather',
      backupProviders: (process.env.WEATHER_BACKUP_PROVIDERS || 'weatherapi').split(','),
      updateInterval: parseInt(process.env.WEATHER_UPDATE_INTERVAL || '15'), // minutes
      cacheExpiry: parseInt(process.env.WEATHER_CACHE_EXPIRY || '30'), // minutes
    };

    this.initializeProviders();
  }

  /**
   * Initialize weather data providers
   */
  private initializeProviders(): void {
    // OpenWeatherMap provider
    if (process.env.OPENWEATHER_API_KEY) {
      this.providers.set('openweather', {
        name: 'OpenWeatherMap',
        baseUrl: 'https://api.openweathermap.org/data/2.5',
        apiKey: process.env.OPENWEATHER_API_KEY,
        rateLimit: 1000, // requests per day
        isActive: true,
      });
    }

    // WeatherAPI provider
    if (process.env.WEATHERAPI_KEY) {
      this.providers.set('weatherapi', {
        name: 'WeatherAPI',
        baseUrl: 'https://api.weatherapi.com/v1',
        apiKey: process.env.WEATHERAPI_KEY,
        rateLimit: 1000000, // requests per month
        isActive: true,
      });
    }

    // AccuWeather provider
    if (process.env.ACCUWEATHER_API_KEY) {
      this.providers.set('accuweather', {
        name: 'AccuWeather',
        baseUrl: 'http://dataservice.accuweather.com',
        apiKey: process.env.ACCUWEATHER_API_KEY,
        rateLimit: 50, // requests per day for free tier
        isActive: true,
      });
    }

    logger.info('Weather providers initialized', {
      providers: Array.from(this.providers.keys()),
      primary: this.config.primaryProvider,
    });
  }

  /**
   * Get current weather for location
   */
  async getCurrentWeather(lat: number, lng: number): Promise<WeatherData> {
    const cacheKey = `weather:current:${lat}:${lng}`;
    
    try {
      // Try to get from cache first
      const cached = await this.getFromCache<WeatherData>(cacheKey);
      if (cached) return cached;

      // Fetch from primary provider
      const weatherData = await this.fetchCurrentWeather(lat, lng, this.config.primaryProvider);
      
      // Cache the result
      await this.setCache(cacheKey, weatherData, this.cacheExpiry);
      
      return weatherData;
    } catch (error) {
      logger.warn('Primary weather provider failed, trying backup', { error });
      
      // Try backup providers
      for (const provider of this.config.backupProviders) {
        try {
          const weatherData = await this.fetchCurrentWeather(lat, lng, provider);
          await this.setCache(cacheKey, weatherData, this.cacheExpiry);
          return weatherData;
        } catch (backupError) {
          logger.warn(`Backup weather provider ${provider} failed`, { error: backupError });
        }
      }
      
      throw new WeatherServiceError('All weather providers failed', { originalError: error });
    }
  }

  /**
   * Fetch current weather from specific provider
   */
  private async fetchCurrentWeather(lat: number, lng: number, providerKey: string): Promise<WeatherData> {
    const provider = this.providers.get(providerKey);
    if (!provider) {
      throw new WeatherServiceError(`Weather provider ${providerKey} not found`);
    }

    switch (providerKey) {
      case 'openweather':
        return this.fetchOpenWeatherCurrent(lat, lng, provider);
      case 'weatherapi':
        return this.fetchWeatherAPICurrent(lat, lng, provider);
      case 'accuweather':
        return this.fetchAccuWeatherCurrent(lat, lng, provider);
      default:
        throw new WeatherServiceError(`Unsupported weather provider: ${providerKey}`);
    }
  }

  /**
   * Fetch current weather from OpenWeatherMap
   */
  private async fetchOpenWeatherCurrent(lat: number, lng: number, provider: WeatherProvider): Promise<WeatherData> {
    const response = await axios.get(`${provider.baseUrl}/weather`, {
      params: {
        lat,
        lon: lng,
        appid: provider.apiKey,
        units: 'metric',
      },
      timeout: 10000,
    });

    const data = response.data;
    
    return {
      location: {
        latitude: lat,
        longitude: lng,
        name: data.name,
        country: data.sys.country,
      },
      current: {
        temperature: data.main.temp,
        feelsLike: data.main.feels_like,
        humidity: data.main.humidity,
        pressure: data.main.pressure,
        windSpeed: data.wind.speed,
        windDirection: data.wind.deg,
        visibility: data.visibility / 1000, // convert to km
        uvIndex: 0, // Not available in current weather endpoint
        cloudCover: data.clouds.all,
        precipitation: data.rain?.['1h'] || data.snow?.['1h'] || 0,
        condition: data.weather[0].main,
        description: data.weather[0].description,
        icon: data.weather[0].icon,
      },
      sun: {
        sunrise: new Date(data.sys.sunrise * 1000),
        sunset: new Date(data.sys.sunset * 1000),
      },
      timestamp: new Date(),
      provider: 'openweather',
    };
  }

  /**
   * Fetch current weather from WeatherAPI
   */
  private async fetchWeatherAPICurrent(lat: number, lng: number, provider: WeatherProvider): Promise<WeatherData> {
    const response = await axios.get(`${provider.baseUrl}/current.json`, {
      params: {
        key: provider.apiKey,
        q: `${lat},${lng}`,
        aqi: 'yes',
      },
      timeout: 10000,
    });

    const data = response.data;
    
    return {
      location: {
        latitude: lat,
        longitude: lng,
        name: data.location.name,
        country: data.location.country,
      },
      current: {
        temperature: data.current.temp_c,
        feelsLike: data.current.feelslike_c,
        humidity: data.current.humidity,
        pressure: data.current.pressure_mb,
        windSpeed: data.current.wind_kph / 3.6, // convert to m/s
        windDirection: data.current.wind_degree,
        visibility: data.current.vis_km,
        uvIndex: data.current.uv,
        cloudCover: data.current.cloud,
        precipitation: data.current.precip_mm,
        condition: data.current.condition.text,
        description: data.current.condition.text,
        icon: data.current.condition.icon,
      },
      sun: {
        sunrise: new Date(`${data.forecast.forecastday[0].astro.sunrise}`),
        sunset: new Date(`${data.forecast.forecastday[0].astro.sunset}`),
      },
      timestamp: new Date(),
      provider: 'weatherapi',
    };
  }

  /**
   * Fetch current weather from AccuWeather
   */
  private async fetchAccuWeatherCurrent(lat: number, lng: number, provider: WeatherProvider): Promise<WeatherData> {
    // First get location key
    const locationResponse = await axios.get(`${provider.baseUrl}/locations/v1/cities/geoposition/search`, {
      params: {
        apikey: provider.apiKey,
        q: `${lat},${lng}`,
      },
      timeout: 10000,
    });

    const locationKey = locationResponse.data.Key;

    // Then get current conditions
    const weatherResponse = await axios.get(`${provider.baseUrl}/currentconditions/v1/${locationKey}`, {
      params: {
        apikey: provider.apiKey,
        details: 'true',
      },
      timeout: 10000,
    });

    const data = weatherResponse.data[0];
    
    return {
      location: {
        latitude: lat,
        longitude: lng,
        name: locationResponse.data.LocalizedName,
        country: locationResponse.data.Country.LocalizedName,
      },
      current: {
        temperature: data.Temperature.Metric.Value,
        feelsLike: data.RealFeelTemperature.Metric.Value,
        humidity: data.RelativeHumidity,
        pressure: data.Pressure.Metric.Value,
        windSpeed: data.Wind.Speed.Metric.Value / 3.6, // convert to m/s
        windDirection: data.Wind.Direction.Degrees,
        visibility: data.Visibility.Metric.Value,
        uvIndex: data.UVIndex,
        cloudCover: data.CloudCover,
        precipitation: data.PrecipitationSummary?.Past24Hours?.Metric?.Value || 0,
        condition: data.WeatherText,
        description: data.WeatherText,
        icon: data.WeatherIcon.toString(),
      },
      sun: {
        sunrise: new Date(), // Would need additional API call
        sunset: new Date(), // Would need additional API call
      },
      timestamp: new Date(),
      provider: 'accuweather',
    };
  }

  /**
   * Get weather forecast
   */
  async getForecast(lat: number, lng: number, days: number = 7): Promise<WeatherForecast> {
    const cacheKey = `weather:forecast:${lat}:${lng}:${days}`;
    
    try {
      const cached = await this.getFromCache<WeatherForecast>(cacheKey);
      if (cached) return cached;

      const forecast = await this.fetchForecast(lat, lng, days, this.config.primaryProvider);
      await this.setCache(cacheKey, forecast, this.cacheExpiry);
      
      return forecast;
    } catch (error) {
      logger.warn('Primary weather forecast provider failed, trying backup', { error });
      
      for (const provider of this.config.backupProviders) {
        try {
          const forecast = await this.fetchForecast(lat, lng, days, provider);
          await this.setCache(cacheKey, forecast, this.cacheExpiry);
          return forecast;
        } catch (backupError) {
          logger.warn(`Backup forecast provider ${provider} failed`, { error: backupError });
        }
      }
      
      throw new WeatherServiceError('All weather forecast providers failed', { originalError: error });
    }
  }

  /**
   * Fetch forecast from specific provider
   */
  private async fetchForecast(lat: number, lng: number, days: number, providerKey: string): Promise<WeatherForecast> {
    const provider = this.providers.get(providerKey);
    if (!provider) {
      throw new WeatherServiceError(`Weather provider ${providerKey} not found`);
    }

    switch (providerKey) {
      case 'openweather':
        return this.fetchOpenWeatherForecast(lat, lng, days, provider);
      case 'weatherapi':
        return this.fetchWeatherAPIForecast(lat, lng, days, provider);
      default:
        throw new WeatherServiceError(`Forecast not supported for provider: ${providerKey}`);
    }
  }

  /**
   * Fetch forecast from OpenWeatherMap
   */
  private async fetchOpenWeatherForecast(lat: number, lng: number, days: number, provider: WeatherProvider): Promise<WeatherForecast> {
    const response = await axios.get(`${provider.baseUrl}/forecast`, {
      params: {
        lat,
        lon: lng,
        appid: provider.apiKey,
        units: 'metric',
        cnt: days * 8, // 8 forecasts per day (3-hour intervals)
      },
      timeout: 10000,
    });

    const data = response.data;
    
    // Group forecasts by day
    const dailyForecasts = this.groupForecastsByDay(data.list);

    return {
      location: {
        latitude: lat,
        longitude: lng,
        name: data.city.name,
        country: data.city.country,
      },
      daily: dailyForecasts,
      timestamp: new Date(),
      provider: 'openweather',
    };
  }

  /**
   * Fetch forecast from WeatherAPI
   */
  private async fetchWeatherAPIForecast(lat: number, lng: number, days: number, provider: WeatherProvider): Promise<WeatherForecast> {
    const response = await axios.get(`${provider.baseUrl}/forecast.json`, {
      params: {
        key: provider.apiKey,
        q: `${lat},${lng}`,
        days: Math.min(days, 10), // WeatherAPI free tier supports up to 10 days
        aqi: 'no',
        alerts: 'no',
      },
      timeout: 10000,
    });

    const data = response.data;
    
    const dailyForecasts = data.forecast.forecastday.map((day: any) => ({
      date: new Date(day.date),
      temperature: {
        min: day.day.mintemp_c,
        max: day.day.maxtemp_c,
        avg: day.day.avgtemp_c,
      },
      humidity: day.day.avghumidity,
      precipitation: day.day.totalprecip_mm,
      precipitationChance: day.day.daily_chance_of_rain,
      windSpeed: day.day.maxwind_kph / 3.6, // convert to m/s
      condition: day.day.condition.text,
      description: day.day.condition.text,
      icon: day.day.condition.icon,
      uvIndex: day.day.uv,
    }));

    return {
      location: {
        latitude: lat,
        longitude: lng,
        name: data.location.name,
        country: data.location.country,
      },
      daily: dailyForecasts,
      timestamp: new Date(),
      provider: 'weatherapi',
    };
  }

  /**
   * Group 3-hourly forecasts into daily forecasts
   */
  private groupForecastsByDay(forecasts: any[]): any[] {
    const dailyMap = new Map();

    forecasts.forEach(forecast => {
      const date = new Date(forecast.dt * 1000).toDateString();
      
      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date: new Date(date),
          temperatures: [],
          humidity: [],
          precipitation: 0,
          windSpeeds: [],
          conditions: [],
        });
      }

      const day = dailyMap.get(date);
      day.temperatures.push(forecast.main.temp);
      day.humidity.push(forecast.main.humidity);
      day.precipitation += forecast.rain?.['3h'] || forecast.snow?.['3h'] || 0;
      day.windSpeeds.push(forecast.wind.speed);
      day.conditions.push(forecast.weather[0].main);
    });

    return Array.from(dailyMap.values()).map(day => ({
      date: day.date,
      temperature: {
        min: Math.min(...day.temperatures),
        max: Math.max(...day.temperatures),
        avg: day.temperatures.reduce((sum: number, temp: number) => sum + temp, 0) / day.temperatures.length,
      },
      humidity: day.humidity.reduce((sum: number, h: number) => sum + h, 0) / day.humidity.length,
      precipitation: day.precipitation,
      precipitationChance: day.precipitation > 0 ? 70 : 20, // Rough estimate
      windSpeed: Math.max(...day.windSpeeds),
      condition: this.getMostCommonCondition(day.conditions),
      description: this.getMostCommonCondition(day.conditions),
      icon: '01d', // Default icon
      uvIndex: 5, // Default UV index
    }));
  }

  /**
   * Get most common weather condition
   */
  private getMostCommonCondition(conditions: string[]): string {
    const counts = conditions.reduce((acc, condition) => {
      acc[condition] = (acc[condition] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
  }

  /**
   * Get agricultural advice based on weather
   */
  async getAgriculturalAdvice(
    lat: number,
    lng: number,
    cropIds: string[],
    farmSize?: number,
    season?: string
  ): Promise<AgriculturalAdvice> {
    try {
      const [currentWeather, forecast] = await Promise.all([
        this.getCurrentWeather(lat, lng),
        this.getForecast(lat, lng, 7),
      ]);

      const advice: AgriculturalAdvice = {
        location: currentWeather.location,
        timestamp: new Date(),
        recommendations: [],
        warnings: [],
        opportunities: [],
        irrigation: await this.getBasicIrrigationAdvice(currentWeather, forecast),
        pestRisk: await this.getBasicPestRisk(currentWeather, forecast),
      };

      // Analyze weather patterns for advice
      const avgTemp = forecast.daily.reduce((sum, day) => sum + day.temperature.avg, 0) / forecast.daily.length;
      const totalPrecipitation = forecast.daily.reduce((sum, day) => sum + day.precipitation, 0);
      const highHumidityDays = forecast.daily.filter(day => day.humidity > 80).length;

      // General recommendations
      if (avgTemp > 30) {
        advice.recommendations.push({
          category: 'temperature',
          priority: 'high',
          title: 'Heat Stress Prevention',
          description: 'High temperatures expected. Ensure adequate irrigation and consider shade protection.',
          actions: ['Increase watering frequency', 'Apply mulch', 'Monitor for heat stress symptoms'],
        });
      }

      if (totalPrecipitation < 10) {
        advice.warnings.push({
          category: 'water',
          severity: 'medium',
          title: 'Low Rainfall Expected',
          description: 'Below-normal rainfall in the forecast. Prepare irrigation systems.',
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
      }

      if (highHumidityDays >= 4) {
        advice.warnings.push({
          category: 'disease',
          severity: 'high',
          title: 'Disease Risk',
          description: 'High humidity levels increase fungal disease risk.',
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
      }

      return advice;
    } catch (error) {
      throw new WeatherServiceError('Failed to generate agricultural advice', { error });
    }
  }

  /**
   * Get basic irrigation advice
   */
  private async getBasicIrrigationAdvice(
    currentWeather: WeatherData,
    forecast: WeatherForecast
  ): Promise<IrrigationRecommendation> {
    const totalRainfall = forecast.daily.reduce((sum, day) => sum + day.precipitation, 0);
    const avgTemp = forecast.daily.reduce((sum, day) => sum + day.temperature.avg, 0) / forecast.daily.length;
    
    let frequency = 'normal';
    let amount = 'normal';
    
    if (totalRainfall < 10 && avgTemp > 25) {
      frequency = 'increase';
      amount = 'increase';
    } else if (totalRainfall > 50) {
      frequency = 'reduce';
      amount = 'reduce';
    }

    return {
      frequency,
      amount,
      bestTimeOfDay: avgTemp > 30 ? 'early_morning' : 'morning',
      soilMoisture: 'monitor',
      notes: [`Total expected rainfall: ${totalRainfall.toFixed(1)}mm`, `Average temperature: ${avgTemp.toFixed(1)}°C`],
    };
  }

  /**
   * Get basic pest risk assessment
   */
  private async getBasicPestRisk(
    currentWeather: WeatherData,
    forecast: WeatherForecast
  ): Promise<PestRiskAssessment> {
    const avgHumidity = forecast.daily.reduce((sum, day) => sum + day.humidity, 0) / forecast.daily.length;
    const avgTemp = forecast.daily.reduce((sum, day) => sum + day.temperature.avg, 0) / forecast.daily.length;
    
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    const riskFactors: string[] = [];
    
    if (avgHumidity > 80) {
      riskLevel = 'high';
      riskFactors.push('High humidity favors fungal diseases');
    }
    
    if (avgTemp > 25 && avgTemp < 35) {
      if (riskLevel === 'low') riskLevel = 'medium';
      riskFactors.push('Optimal temperature range for many pests');
    }
    
    return {
      level: riskLevel,
      factors: riskFactors,
      recommendations: riskLevel === 'high' ? 
        ['Monitor crops closely', 'Consider preventive treatments'] : 
        ['Regular monitoring', 'Maintain good field hygiene'],
    };
  }

  /**
   * Cache helper methods
   */
  private async getFromCache<T>(key: string): Promise<T | null> {
    try {
      if (!redisClient) return null;
      
      const cached = await redisClient.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.warn('Failed to get from cache', { key, error });
      return null;
    }
  }

  private async setCache(key: string, data: any, expiry: number): Promise<void> {
    try {
      if (!redisClient) return;
      
      await redisClient.setex(key, expiry, JSON.stringify(data));
    } catch (error) {
      logger.warn('Failed to set cache', { key, error });
    }
  }

  /**
   * Update weather service configuration
   */
  updateConfig(newConfig: Partial<WeatherConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.cacheExpiry = this.config.cacheExpiry * 60; // convert to seconds
    logger.info('Weather service configuration updated', { config: this.config });
  }

  /**
   * Get service health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    providers: Record<string, { status: string; lastCheck: Date }>;
    cacheStatus: 'connected' | 'disconnected';
  }> {
    const providerHealth: Record<string, { status: string; lastCheck: Date }> = {};
    
    // Test each provider
    for (const [key, provider] of this.providers) {
      try {
        // Simple test request
        await axios.get(`${provider.baseUrl}/weather`, {
          params: key === 'openweather' ? { appid: provider.apiKey } : { key: provider.apiKey },
          timeout: 5000,
        });
        
        providerHealth[key] = { status: 'healthy', lastCheck: new Date() };
      } catch (error) {
        providerHealth[key] = { status: 'unhealthy', lastCheck: new Date() };
      }
    }
    
    const healthyProviders = Object.values(providerHealth).filter(p => p.status === 'healthy').length;
    const totalProviders = Object.keys(providerHealth).length;
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (healthyProviders === 0) {
      overallStatus = 'unhealthy';
    } else if (healthyProviders < totalProviders) {
      overallStatus = 'degraded';
    }
    
    return {
      status: overallStatus,
      providers: providerHealth,
      cacheStatus: redisClient ? 'connected' : 'disconnected',
    };
  }
}

export const weatherService = new WeatherService();
export { WeatherService };