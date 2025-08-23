export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface CommonPaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: PaginationResponse;
}

export interface FilterQuery {
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
}

export type LanguageCode = 
  | 'en' 
  | 'es' 
  | 'fr' 
  | 'pt' 
  | 'hi' 
  | 'bn' 
  | 'id' 
  | 'vi';

export interface BaseDocument {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
}

export type DatabaseId = string;

export interface SoftDeleteDocument extends BaseDocument {
  isDeleted: boolean;
  deletedAt?: Date;
}

export interface AuditableDocument extends BaseDocument {
  createdBy?: DatabaseId;
  updatedBy?: DatabaseId;
}

export type UserRole = 'user' | 'expert' | 'admin' | 'moderator';

export type NotificationType = 
  | 'diagnosis_complete'
  | 'expert_response'
  | 'weather_alert'
  | 'price_alert'
  | 'community_like'
  | 'community_comment'
  | 'system_update';

export type DiagnosisStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type ConsultationStatus = 'requested' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';

export type FileType = 'image' | 'video' | 'document' | 'audio';

export interface FileUpload {
  originalName: string;
  filename: string;
  mimetype: string;
  size: number;
  url: string;
  publicId?: string;
  thumbnailUrl?: string;
}

export interface BasicWeatherCondition {
  temperature: number;
  humidity: number;
  windSpeed: number;
  rainfall: number;
  condition: string;
  description: string;
  icon: string;
}

export interface CropGrowthStage {
  stage: string;
  description: string;
  daysFromPlanting: number;
  imageUrl?: string;
}

export interface TreatmentStep {
  step: number;
  title: string;
  description: string;
  imageUrl?: string;
  duration?: string;
}

export interface PriceData {
  price: number;
  unit: string;
  currency: string;
  market: string;
  date: Date;
}

export interface ContactInfo {
  phone?: string;
  email?: string;
  whatsapp?: string;
  telegram?: string;
}

export interface SocialLinks {
  facebook?: string;
  twitter?: string;
  instagram?: string;
  youtube?: string;
  linkedin?: string;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  country: string;
  zipCode?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface Rating {
  average: number;
  count: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export interface ErrorContext {
  userId?: string;
  ip?: string;
  userAgent?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  timestamp: Date;
}

export interface AppError {
  name: string;
  message: string;
  statusCode: number;
  isOperational: boolean;
  context?: ErrorContext;
}