import type { Request, Response } from 'express';
import type {
  UserData,
  DiagnosisData,
  CommunityPostData,
  ExpertData,
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

export interface GetDashboardStatsRequest extends AuthenticatedRequest {
  query: {
    period?: '7d' | '30d' | '90d' | '1y';
  };
}

export interface GetUsersRequest extends AuthenticatedRequest {
  query: {
    userType?: 'farmer' | 'expert' | 'buyer' | 'admin';
    status?: 'active' | 'inactive' | 'suspended' | 'pending';
    search?: string;
    country?: string;
    registrationDate?: string;
    lastActiveDate?: string;
    page?: string;
    limit?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };
}

export interface GetUserDetailsRequest extends AuthenticatedRequest {
  params: {
    userId: string;
  };
}

export interface UpdateUserStatusRequest extends AuthenticatedRequest {
  params: {
    userId: string;
  };
  body: {
    status: 'active' | 'inactive' | 'suspended';
    reason?: string;
    suspensionDuration?: number; // days
  };
}

export interface GetModerationsRequest extends AuthenticatedRequest {
  query: {
    contentType?: 'post' | 'comment' | 'diagnosis' | 'expert_profile';
    status?: 'pending' | 'approved' | 'rejected';
    reportType?: 'spam' | 'inappropriate' | 'harassment' | 'misinformation' | 'other';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    reportedDate?: string;
    page?: string;
    limit?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };
}

export interface HandleModerationRequest extends AuthenticatedRequest {
  params: {
    moderationId: string;
  };
  body: {
    action: 'approve' | 'reject' | 'remove' | 'warn_user' | 'suspend_user';
    reason: string;
    notes?: string;
    userSuspensionDays?: number;
  };
}

export interface GetSystemLogsRequest extends AuthenticatedRequest {
  query: {
    level?: 'error' | 'warn' | 'info' | 'debug';
    service?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    page?: string;
    limit?: string;
    sortOrder?: 'asc' | 'desc';
  };
}

export interface GetAuditLogsRequest extends AuthenticatedRequest {
  query: {
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: string;
    endDate?: string;
    page?: string;
    limit?: string;
  };
}

export interface ManageAdminUsersRequest extends AuthenticatedRequest {
  query: {
    role?: 'admin' | 'moderator' | 'super_admin';
    status?: 'active' | 'inactive';
    page?: string;
    limit?: string;
  };
}

export interface CreateAdminUserRequest extends AuthenticatedRequest {
  body: {
    email: string;
    firstName: string;
    lastName: string;
    role: 'admin' | 'moderator';
    permissions: string[];
    temporaryPassword?: string;
  };
}

export interface UpdateAdminUserRequest extends AuthenticatedRequest {
  params: {
    adminId: string;
  };
  body: {
    role?: 'admin' | 'moderator';
    permissions?: string[];
    status?: 'active' | 'inactive';
  };
}

export interface GetContentAnalyticsRequest extends AuthenticatedRequest {
  query: {
    contentType?: 'posts' | 'diagnoses' | 'consultations' | 'reviews';
    period?: '7d' | '30d' | '90d' | '1y';
    groupBy?: 'day' | 'week' | 'month';
  };
}

export interface ManageSystemSettingsRequest extends AuthenticatedRequest {
  body: {
    settings: {
      [category: string]: {
        [key: string]: any;
      };
    };
  };
}

export interface GetSystemSettingsRequest extends AuthenticatedRequest {
  query: {
    category?: string;
  };
}

export interface BulkUserActionsRequest extends AuthenticatedRequest {
  body: {
    userIds: string[];
    action: 'activate' | 'deactivate' | 'suspend' | 'delete';
    reason?: string;
    suspensionDays?: number;
  };
}

export interface ExportDataRequest extends AuthenticatedRequest {
  body: {
    dataType: 'users' | 'posts' | 'diagnoses' | 'consultations' | 'audit_logs';
    format: 'csv' | 'xlsx' | 'json';
    filters?: {
      startDate?: string;
      endDate?: string;
      userType?: string;
      status?: string;
    };
    includeDeleted?: boolean;
  };
}

export interface GetReportsRequest extends AuthenticatedRequest {
  query: {
    reportType?: 'user_growth' | 'content_metrics' | 'financial' | 'system_health';
    period?: '7d' | '30d' | '90d' | '1y' | 'custom';
    startDate?: string;
    endDate?: string;
    format?: 'json' | 'pdf';
  };
}

export interface SendSystemNotificationRequest extends AuthenticatedRequest {
  body: {
    recipients: 'all' | 'farmers' | 'experts' | 'buyers' | string[]; // user IDs
    title: string;
    message: string;
    type: 'info' | 'warning' | 'update' | 'maintenance';
    channels: ('push' | 'email' | 'sms' | 'inApp')[];
    scheduledFor?: string;
    actionUrl?: string;
  };
}

// Response interfaces
export interface DashboardStatsResponse {
  period: string;
  users: {
    total: number;
    new: number;
    active: number;
    growth: number;
    byType: Array<{
      type: string;
      count: number;
      percentage: number;
    }>;
  };
  content: {
    posts: number;
    diagnoses: number;
    consultations: number;
    reviews: number;
    newToday: number;
  };
  engagement: {
    dailyActiveUsers: number;
    averageSessionDuration: string;
    postsPerUser: number;
    diagnosesPerUser: number;
  };
  financial: {
    totalRevenue: number;
    consultationRevenue: number;
    subscriptionRevenue: number;
    growth: number;
  };
  systemHealth: {
    uptime: string;
    errorRate: number;
    averageResponseTime: string;
    apiCallsToday: number;
  };
  trends: {
    userGrowth: Array<{
      date: string;
      users: number;
      newUsers: number;
    }>;
    contentCreation: Array<{
      date: string;
      posts: number;
      diagnoses: number;
    }>;
  };
}

export interface UserManagementResponse {
  _id: DatabaseId;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  userType: 'farmer' | 'expert' | 'buyer' | 'admin';
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  profileImage?: string;
  location?: {
    country: string;
    city: string;
    coordinates: [number, number];
  };
  registrationDate: Date;
  lastActiveDate?: Date;
  statistics: {
    postsCount: number;
    diagnosesCount: number;
    consultationsCount: number;
    reviewsCount: number;
  };
  suspensionInfo?: {
    reason: string;
    suspendedBy: string;
    suspendedAt: Date;
    expiresAt?: Date;
  };
  verificationStatus: {
    email: boolean;
    phone: boolean;
    identity: boolean;
  };
}

export interface ModerationResponse {
  _id: DatabaseId;
  contentType: 'post' | 'comment' | 'diagnosis' | 'expert_profile';
  contentId: DatabaseId;
  reportedBy: {
    _id: DatabaseId;
    firstName: string;
    lastName: string;
    email: string;
  };
  reportType: 'spam' | 'inappropriate' | 'harassment' | 'misinformation' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'approved' | 'rejected' | 'resolved';
  description: string;
  evidence?: Array<{
    type: 'screenshot' | 'url' | 'text';
    content: string;
  }>;
  content: {
    title?: string;
    excerpt: string;
    author: {
      _id: DatabaseId;
      firstName: string;
      lastName: string;
    };
  };
  reportedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: {
    _id: DatabaseId;
    firstName: string;
    lastName: string;
  };
  resolution?: {
    action: string;
    reason: string;
    notes?: string;
  };
}

export interface SystemLogResponse {
  _id: DatabaseId;
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  service: string;
  userId?: DatabaseId;
  metadata?: {
    [key: string]: any;
  };
  timestamp: Date;
  requestId?: string;
  stackTrace?: string;
}

export interface AuditLogResponse {
  _id: DatabaseId;
  userId: DatabaseId;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  action: string;
  resource: string;
  resourceId?: DatabaseId;
  details?: {
    [key: string]: any;
  };
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  success: boolean;
  error?: string;
}

export interface AdminUserResponse {
  _id: DatabaseId;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'moderator' | 'super_admin';
  permissions: string[];
  status: 'active' | 'inactive';
  lastLoginAt?: Date;
  createdAt: Date;
  createdBy?: {
    _id: DatabaseId;
    firstName: string;
    lastName: string;
  };
}

export interface ContentAnalyticsResponse {
  period: string;
  contentType: string;
  overview: {
    totalCount: number;
    newCount: number;
    engagement: {
      likes: number;
      comments: number;
      shares: number;
      views: number;
    };
    topPerformers: Array<{
      _id: DatabaseId;
      title: string;
      author: string;
      metrics: {
        views: number;
        likes: number;
        comments: number;
      };
    }>;
  };
  trends: Array<{
    date: string;
    count: number;
    engagement: number;
  }>;
  demographics: {
    byUserType: Array<{
      type: string;
      count: number;
      percentage: number;
    }>;
    byLocation: Array<{
      country: string;
      count: number;
    }>;
  };
}

export interface SystemSettingsResponse {
  [category: string]: {
    [key: string]: {
      value: any;
      type: 'string' | 'number' | 'boolean' | 'array' | 'object';
      description: string;
      lastUpdated: Date;
      updatedBy: string;
    };
  };
}

export interface ReportResponse {
  reportType: string;
  period: string;
  generatedAt: Date;
  data: {
    [section: string]: any;
  };
  summary: {
    keyMetrics: Array<{
      label: string;
      value: string | number;
      change?: string;
      trend?: 'up' | 'down' | 'stable';
    }>;
    insights: string[];
    recommendations: string[];
  };
}

// Controller method types
export type GetDashboardStatsController = (
  req: GetDashboardStatsRequest,
  res: TypedResponse<DashboardStatsResponse>
) => Promise<void>;

export type GetUsersController = (
  req: GetUsersRequest,
  res: TypedResponse<UserManagementResponse[]>
) => Promise<void>;

export type GetUserDetailsController = (
  req: GetUserDetailsRequest,
  res: TypedResponse<UserManagementResponse>
) => Promise<void>;

export type UpdateUserStatusController = (
  req: UpdateUserStatusRequest,
  res: TypedResponse<{ status: string; updatedAt: Date }>
) => Promise<void>;

export type GetModerationsController = (
  req: GetModerationsRequest,
  res: TypedResponse<ModerationResponse[]>
) => Promise<void>;

export type HandleModerationController = (
  req: HandleModerationRequest,
  res: TypedResponse<{ action: string; resolvedAt: Date }>
) => Promise<void>;

export type GetSystemLogsController = (
  req: GetSystemLogsRequest,
  res: TypedResponse<SystemLogResponse[]>
) => Promise<void>;

export type GetAuditLogsController = (
  req: GetAuditLogsRequest,
  res: TypedResponse<AuditLogResponse[]>
) => Promise<void>;

export type ManageAdminUsersController = (
  req: ManageAdminUsersRequest,
  res: TypedResponse<AdminUserResponse[]>
) => Promise<void>;

export type CreateAdminUserController = (
  req: CreateAdminUserRequest,
  res: TypedResponse<AdminUserResponse>
) => Promise<void>;

export type UpdateAdminUserController = (
  req: UpdateAdminUserRequest,
  res: TypedResponse<AdminUserResponse>
) => Promise<void>;

export type GetContentAnalyticsController = (
  req: GetContentAnalyticsRequest,
  res: TypedResponse<ContentAnalyticsResponse>
) => Promise<void>;

export type ManageSystemSettingsController = (
  req: ManageSystemSettingsRequest,
  res: TypedResponse<{ updatedSettings: number }>
) => Promise<void>;

export type GetSystemSettingsController = (
  req: GetSystemSettingsRequest,
  res: TypedResponse<SystemSettingsResponse>
) => Promise<void>;

export type BulkUserActionsController = (
  req: BulkUserActionsRequest,
  res: TypedResponse<{ processedUsers: number; results: any[] }>
) => Promise<void>;

export type ExportDataController = (
  req: ExportDataRequest,
  res: Response
) => Promise<void>;

export type GetReportsController = (
  req: GetReportsRequest,
  res: TypedResponse<ReportResponse>
) => Promise<void>;

export type SendSystemNotificationController = (
  req: SendSystemNotificationRequest,
  res: TypedResponse<{ notificationId: string; recipientCount: number }>
) => Promise<void>;

// Service response types
export interface AdminServiceResult {
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
}

// Validation types
export interface AdminValidationErrors {
  email?: string[];
  role?: string[];
  permissions?: string[];
  userIds?: string[];
  action?: string[];
  settings?: string[];
}