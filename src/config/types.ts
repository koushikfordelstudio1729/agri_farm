export interface DatabaseConfig {
  url: string;
  maxPoolSize: number;
  minPoolSize: number;
  maxIdleTimeMS: number;
  serverSelectionTimeoutMS: number;
  socketTimeoutMS: number;
  family: 4 | 6;
  bufferMaxEntries: number;
  useNewUrlParser: boolean;
  useUnifiedTopology: boolean;
}

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  uploadPreset?: string;
  folder?: string;
  quality?: string;
  format?: string;
  maxFileSize?: number;
  allowedFormats?: string[];
}

export interface RedisConfig {
  url: string;
  host: string;
  port: number;
  password?: string;
  db: number;
  connectTimeout: number;
  lazyConnect: boolean;
  retryDelayOnFailover: number;
  enableReadyCheck: boolean;
  maxRetriesPerRequest: number;
}

export interface SMSConfig {
  provider: 'twilio' | 'aws' | 'firebase';
  twilio?: {
    accountSid: string;
    authToken: string;
    fromNumber: string;
  };
  aws?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
  };
  firebase?: {
    projectId: string;
    privateKey: string;
    clientEmail: string;
  };
}

export interface EmailConfig {
  provider: 'nodemailer' | 'sendgrid' | 'ses';
  nodemailer?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  sendgrid?: {
    apiKey: string;
    fromEmail: string;
    fromName: string;
  };
  ses?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    fromEmail: string;
  };
  templates: {
    welcome: string;
    passwordReset: string;
    emailVerification: string;
    diagnosisComplete: string;
    expertResponse: string;
  };
}

export interface WeatherServiceConfig {
  provider: 'openweathermap' | 'weatherapi' | 'accuweather';
  apiKey: string;
  baseUrl: string;
  cacheTTL: number;
  retryAttempts: number;
  timeout: number;
}

export interface MLServiceConfig {
  provider: 'tensorflow' | 'pytorch' | 'custom';
  endpoint: string;
  apiKey?: string;
  timeout: number;
  retryAttempts: number;
  modelVersion: string;
  confidenceThreshold: number;
}

export interface FirebaseConfig {
  projectId: string;
  privateKeyId: string;
  privateKey: string;
  clientEmail: string;
  clientId: string;
  authUri: string;
  tokenUri: string;
  authProviderX509CertUrl: string;
  clientX509CertUrl: string;
}

export interface NotificationConfig {
  fcm: FirebaseConfig;
  apns?: {
    keyId: string;
    teamId: string;
    bundleId: string;
    privateKey: string;
    production: boolean;
  };
  email: EmailConfig;
  sms: SMSConfig;
  inApp: {
    enabled: boolean;
    retentionDays: number;
  };
}

export interface CacheConfig {
  redis: RedisConfig;
  ttl: {
    default: number;
    user: number;
    diagnosis: number;
    weather: number;
    market: number;
    translations: number;
  };
  keyPrefix: string;
}

export interface SecurityConfig {
  cors: {
    origin: string[];
    credentials: boolean;
    methods: string[];
    allowedHeaders: string[];
    maxAge: number;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
    skipFailedRequests: boolean;
  };
  helmet: {
    contentSecurityPolicy: boolean;
    crossOriginEmbedderPolicy: boolean;
    dnsPrefetchControl: boolean;
    frameguard: boolean;
    hidePoweredBy: boolean;
    hsts: boolean;
    noSniff: boolean;
    xssFilter: boolean;
  };
  session: {
    secret: string;
    resave: boolean;
    saveUninitialized: boolean;
    cookie: {
      secure: boolean;
      httpOnly: boolean;
      maxAge: number;
      sameSite: 'strict' | 'lax' | 'none';
    };
  };
}

export interface MonitoringConfig {
  enabled: boolean;
  healthCheckInterval: number;
  metrics: {
    enabled: boolean;
    endpoint: string;
    port: number;
  };
  logging: {
    level: string;
    file: boolean;
    console: boolean;
    maxFiles: number;
    maxSize: string;
  };
  alerting: {
    enabled: boolean;
    thresholds: {
      errorRate: number;
      responseTime: number;
      memoryUsage: number;
      diskUsage: number;
    };
  };
}

export interface AppConfig {
  env: 'development' | 'production' | 'test';
  port: number;
  apiVersion: string;
  apiPrefix: string;
  baseUrl: string;
  timezone: string;
  locale: string;
  
  database: DatabaseConfig;
  redis: RedisConfig;
  cloudinary: CloudinaryConfig;
  notifications: NotificationConfig;
  cache: CacheConfig;
  security: SecurityConfig;
  monitoring: MonitoringConfig;
  
  // External services
  weather: WeatherServiceConfig;
  ml: MLServiceConfig;
  
  // Feature flags
  features: {
    diagnostics: boolean;
    expertConsultation: boolean;
    weatherAlerts: boolean;
    marketPrices: boolean;
    communityFeatures: boolean;
    multiLanguage: boolean;
    pushNotifications: boolean;
    socialLogin: boolean;
  };
  
  // Business rules
  limits: {
    maxFileSize: number;
    maxFilesPerUpload: number;
    maxDiagnosisPerDay: number;
    maxConsultationsPerDay: number;
    maxImageResolution: number;
  };
}