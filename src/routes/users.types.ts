import { Router } from 'express';

export interface UserRoutesConfig {
  enableProfileImageUpload?: boolean;
  enableUserSearch?: boolean;
  enableSocialFeatures?: boolean;
  enableUserStats?: boolean;
  enableDataExport?: boolean;
  enableAccountDeletion?: boolean;
}

export interface UserRouteMiddleware {
  auth: any;
  upload: any;
  validation: any;
  rateLimit: any;
}

export type UserRouter = Router;