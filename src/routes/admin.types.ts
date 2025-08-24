import { Request, Response } from 'express';
import { 
  DashboardOverviewResponse,
  UserAnalyticsRequest,
  DiagnosisAnalyticsRequest,
  RevenueAnalyticsRequest,
  EngagementAnalyticsRequest,
  UpdateUserRequest,
  SuspendUserRequest,
  DeleteUserRequest,
  ModerationRequest,
  SystemConfigRequest,
  FeatureFlagRequest,
  CreateApiKeyRequest,
  UpdateApiKeyRequest,
  DatabaseBackupRequest,
  DatabaseRestoreRequest,
  CleanupDataRequest,
  SendBulkNotificationRequest,
  SecurityAttemptRequest,
  BlockIpRequest,
  ExportRequest,
  GenerateReportRequest,
  CreateAdminUserRequest,
  UpdateAdminUserRequest,
  GlobalSettingsRequest,
  MaintenanceModeRequest,
  ClearCacheRequest,
  RestartServicesRequest
} from '@/controllers/adminController.types';

// Route parameter types
export interface UserParamsWithId {
  userId: string;
}

export interface ReportParamsWithId {
  reportId: string;
}

export interface FeatureParams {
  featureName: string;
}

export interface ApiKeyParams {
  keyId: string;
}

export interface BackupParams {
  backupId: string;
}

export interface AdminParams {
  adminId: string;
}

export interface IpParams {
  ip: string;
}

// Query parameter types
export interface GetDashboardQuery {
  period?: 'today' | 'week' | 'month' | 'quarter' | 'year';
  timezone?: string;
}

export interface GetUserAnalyticsQuery {
  startDate?: string;
  endDate?: string;
  userType?: 'farmer' | 'buyer' | 'expert';
  location?: string;
  groupBy?: 'day' | 'week' | 'month';
}

export interface GetDiagnosisAnalyticsQuery {
  startDate?: string;
  endDate?: string;
  accuracy?: 'high' | 'medium' | 'low';
  crop?: string;
  disease?: string;
}

export interface GetRevenueAnalyticsQuery {
  startDate?: string;
  endDate?: string;
  source?: 'consultations' | 'premium' | 'marketplace';
  groupBy?: 'day' | 'week' | 'month';
}

export interface GetEngagementAnalyticsQuery {
  startDate?: string;
  endDate?: string;
  feature?: 'community' | 'market' | 'weather' | 'experts';
}

export interface GetUsersQuery {
  page?: string;
  limit?: string;
  search?: string;
  userType?: 'farmer' | 'buyer' | 'expert' | 'admin';
  status?: 'active' | 'inactive' | 'suspended' | 'pending';
  registrationDate?: 'today' | 'week' | 'month' | 'year';
  sortBy?: 'date' | 'name' | 'email' | 'lastActive';
  sortOrder?: 'asc' | 'desc';
}

export interface GetContentReportsQuery {
  type?: 'post' | 'comment' | 'user' | 'diagnosis';
  status?: 'pending' | 'reviewed' | 'resolved';
  priority?: 'low' | 'medium' | 'high';
  page?: string;
  limit?: string;
}

export interface GetFlaggedContentQuery {
  type?: 'post' | 'comment' | 'image';
  autoFlagged?: string;
  page?: string;
  limit?: string;
}

export interface GetApiKeysQuery {
  active?: string;
  page?: string;
  limit?: string;
}

export interface GetApiUsageQuery {
  keyId?: string;
  startDate?: string;
  endDate?: string;
  endpoint?: string;
}

export interface GetBackupsQuery {
  page?: string;
  limit?: string;
}

export interface GetSystemLogsQuery {
  level?: 'error' | 'warn' | 'info' | 'debug';
  service?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: string;
  limit?: string;
}

export interface GetPerformanceQuery {
  metric?: 'response_time' | 'memory' | 'cpu' | 'database';
  period?: 'hour' | 'day' | 'week' | 'month';
}

export interface GetNotificationTemplatesQuery {
  type?: 'email' | 'sms' | 'push';
  active?: string;
}

export interface GetNotificationHistoryQuery {
  type?: 'email' | 'sms' | 'push' | 'inApp';
  status?: 'sent' | 'failed' | 'pending';
  startDate?: string;
  endDate?: string;
  page?: string;
  limit?: string;
}

export interface GetSecurityAttemptsQuery {
  type?: 'login' | 'password_reset' | 'email_change';
  status?: 'success' | 'failed' | 'blocked';
  startDate?: string;
  endDate?: string;
  ip?: string;
  userId?: string;
  page?: string;
  limit?: string;
}

export interface GetBlockedIpsQuery {
  active?: string;
  page?: string;
  limit?: string;
}

export interface GetReportHistoryQuery {
  type?: 'user_activity' | 'system_performance' | 'revenue' | 'engagement';
  page?: string;
  limit?: string;
}

export interface GetAdminUsersQuery {
  active?: string;
  page?: string;
  limit?: string;
}

export interface GetBillingQuery {
  startDate?: string;
  endDate?: string;
}

export interface GetPredictiveAnalyticsQuery {
  metric: 'user_growth' | 'revenue' | 'usage';
  period?: 'week' | 'month' | 'quarter' | 'year';
}

// Express request types
export interface GetDashboardOverviewRequestHandler extends Request<{}, DashboardOverviewResponse, {}, GetDashboardQuery> {}
export interface GetUserAnalyticsRequestHandler extends Request<{}, any, {}, GetUserAnalyticsQuery> {}
export interface GetDiagnosisAnalyticsRequestHandler extends Request<{}, any, {}, GetDiagnosisAnalyticsQuery> {}
export interface GetRevenueAnalyticsRequestHandler extends Request<{}, any, {}, GetRevenueAnalyticsQuery> {}
export interface GetEngagementAnalyticsRequestHandler extends Request<{}, any, {}, GetEngagementAnalyticsQuery> {}

export interface GetUsersRequestHandler extends Request<{}, any[], {}, GetUsersQuery> {}
export interface GetUserDetailsRequestHandler extends Request<UserParamsWithId, any> {}
export interface UpdateUserRequestHandler extends Request<UserParamsWithId, any, UpdateUserRequest> {}
export interface SuspendUserRequestHandler extends Request<UserParamsWithId, any, SuspendUserRequest> {}
export interface ActivateUserRequestHandler extends Request<UserParamsWithId, any, { notes?: string }> {}
export interface DeleteUserRequestHandler extends Request<UserParamsWithId, any, DeleteUserRequest> {}

export interface GetContentReportsRequestHandler extends Request<{}, any[], {}, GetContentReportsQuery> {}
export interface ModerateContentRequestHandler extends Request<ReportParamsWithId, any, ModerationRequest> {}
export interface GetFlaggedContentRequestHandler extends Request<{}, any[], {}, GetFlaggedContentQuery> {}

export interface GetSystemConfigRequestHandler extends Request<{}, any> {}
export interface UpdateSystemConfigRequestHandler extends Request<{}, any, SystemConfigRequest> {}

export interface GetFeatureFlagsRequestHandler extends Request<{}, any[]> {}
export interface UpdateFeatureFlagRequestHandler extends Request<FeatureParams, any, FeatureFlagRequest> {}

export interface GetApiKeysRequestHandler extends Request<{}, any[], {}, GetApiKeysQuery> {}
export interface CreateApiKeyRequestHandler extends Request<{}, any, CreateApiKeyRequest> {}
export interface UpdateApiKeyRequestHandler extends Request<ApiKeyParams, any, UpdateApiKeyRequest> {}
export interface DeleteApiKeyRequestHandler extends Request<ApiKeyParams, any> {}
export interface GetApiUsageRequestHandler extends Request<{}, any, {}, GetApiUsageQuery> {}

export interface GetDatabaseStatsRequestHandler extends Request<{}, any> {}
export interface CreateDatabaseBackupRequestHandler extends Request<{}, any, DatabaseBackupRequest> {}
export interface GetBackupHistoryRequestHandler extends Request<{}, any[], {}, GetBackupsQuery> {}
export interface RestoreDatabaseRequestHandler extends Request<BackupParams, any> {}
export interface CleanupOldDataRequestHandler extends Request<{}, any, CleanupDataRequest> {}

export interface GetSystemHealthRequestHandler extends Request<{}, any> {}
export interface GetSystemLogsRequestHandler extends Request<{}, any[], {}, GetSystemLogsQuery> {}
export interface GetPerformanceMetricsRequestHandler extends Request<{}, any, {}, GetPerformanceQuery> {}

export interface GetNotificationTemplatesRequestHandler extends Request<{}, any[], {}, GetNotificationTemplatesQuery> {}
export interface SendBulkNotificationRequestHandler extends Request<{}, any, SendBulkNotificationRequest> {}
export interface GetNotificationHistoryRequestHandler extends Request<{}, any[], {}, GetNotificationHistoryQuery> {}

export interface GetSecurityAttemptsRequestHandler extends Request<{}, any[], {}, GetSecurityAttemptsQuery> {}
export interface BlockIpAddressRequestHandler extends Request<{}, any, BlockIpRequest> {}
export interface UnblockIpAddressRequestHandler extends Request<IpParams, any> {}
export interface GetBlockedIpsRequestHandler extends Request<{}, any[], {}, GetBlockedIpsQuery> {}

export interface ExportUsersRequestHandler extends Request<{}, any, ExportRequest> {}
export interface ExportDiagnosesRequestHandler extends Request<{}, any, ExportRequest> {}
export interface GenerateReportRequestHandler extends Request<{}, any, GenerateReportRequest> {}
export interface GetReportHistoryRequestHandler extends Request<{}, any[], {}, GetReportHistoryQuery> {}

export interface GetAdminUsersRequestHandler extends Request<{}, any[], {}, GetAdminUsersQuery> {}
export interface CreateAdminUserRequestHandler extends Request<{}, any, CreateAdminUserRequest> {}
export interface UpdateAdminUserRequestHandler extends Request<AdminParams, any, UpdateAdminUserRequest> {}
export interface DeleteAdminUserRequestHandler extends Request<AdminParams, any> {}

export interface GetGlobalSettingsRequestHandler extends Request<{}, any> {}
export interface UpdateGlobalSettingsRequestHandler extends Request<{}, any, GlobalSettingsRequest> {}

export interface GetLicenseInfoRequestHandler extends Request<{}, any> {}
export interface GetBillingInfoRequestHandler extends Request<{}, any, {}, GetBillingQuery> {}

export interface StartMaintenanceModeRequestHandler extends Request<{}, any, MaintenanceModeRequest> {}
export interface EndMaintenanceModeRequestHandler extends Request<{}, any> {}
export interface ClearSystemCacheRequestHandler extends Request<{}, any, ClearCacheRequest> {}
export interface RestartServicesRequestHandler extends Request<{}, any, RestartServicesRequest> {}

export interface GetSuperAdminAnalyticsRequestHandler extends Request<{}, any> {}
export interface GetPredictiveAnalyticsRequestHandler extends Request<{}, any, {}, GetPredictiveAnalyticsQuery> {}

// Response types with Express
export interface AdminResponseHandler extends Response<any> {}
export interface AdminListResponseHandler extends Response<any[]> {}
export interface DashboardResponseHandler extends Response<DashboardOverviewResponse> {}