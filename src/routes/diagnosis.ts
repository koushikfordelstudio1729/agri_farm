import express from 'express';
import diagnosisController from '@/controllers/diagnosisController';
import { authenticate } from '@/middleware/auth';
import { validateRequest } from '@/middleware/validation';
import { uploadMiddleware } from '@/middleware/upload';
import { rateLimit } from '@/middleware/rateLimit';
import {
  createDiagnosisSchema,
  getDiagnosisSchema,
  batchDiagnosisSchema,
  updateDiagnosisSchema,
} from '@/utils/validators';
import {
  DiagnosisRoutes,
  DiagnosisRouteHandlers,
} from './diagnosis.types';

const router = express.Router();

// Apply authentication to all diagnosis routes
router.use(authenticate);

// Rate limiting for diagnosis creation (more restrictive)
const diagnosisRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 diagnoses per 15 minutes
  message: {
    error: 'Too many diagnosis requests. Please wait before submitting another.',
    retryAfter: 15 * 60,
  },
});

// Routes
const routes: DiagnosisRoutes = {
  // Create new diagnosis
  createDiagnosis: {
    method: 'POST',
    path: '/',
    middleware: [
      diagnosisRateLimit,
      uploadMiddleware.array('images', 5), // Max 5 images
      validateRequest(createDiagnosisSchema),
    ],
    handler: diagnosisController.createDiagnosis,
  },

  // Get user's diagnoses with pagination
  getUserDiagnoses: {
    method: 'GET',
    path: '/',
    middleware: [validateRequest(getDiagnosisSchema, 'query')],
    handler: diagnosisController.getUserDiagnoses,
  },

  // Get specific diagnosis by ID
  getDiagnosisById: {
    method: 'GET',
    path: '/:diagnosisId',
    middleware: [validateRequest({ params: { diagnosisId: 'required|string|mongoId' } })],
    handler: diagnosisController.getDiagnosisById,
  },

  // Update diagnosis (add notes, mark as reviewed, etc.)
  updateDiagnosis: {
    method: 'PUT',
    path: '/:diagnosisId',
    middleware: [validateRequest(updateDiagnosisSchema)],
    handler: diagnosisController.updateDiagnosis,
  },

  // Delete diagnosis
  deleteDiagnosis: {
    method: 'DELETE',
    path: '/:diagnosisId',
    middleware: [validateRequest({ params: { diagnosisId: 'required|string|mongoId' } })],
    handler: diagnosisController.deleteDiagnosis,
  },

  // Get diagnosis statistics
  getDiagnosisStats: {
    method: 'GET',
    path: '/stats/overview',
    middleware: [],
    handler: diagnosisController.getDiagnosisStats,
  },

  // Batch process multiple images
  batchDiagnosis: {
    method: 'POST',
    path: '/batch',
    middleware: [
      diagnosisRateLimit,
      uploadMiddleware.array('images', 20), // Max 20 images for batch
      validateRequest(batchDiagnosisSchema),
    ],
    handler: diagnosisController.batchDiagnosis,
  },

  // Get diagnosis by image hash (avoid duplicates)
  getDiagnosisByImageHash: {
    method: 'GET',
    path: '/hash/:imageHash',
    middleware: [validateRequest({ params: { imageHash: 'required|string' } })],
    handler: diagnosisController.getDiagnosisByImageHash,
  },

  // Request expert review
  requestExpertReview: {
    method: 'POST',
    path: '/:diagnosisId/expert-review',
    middleware: [
      validateRequest({
        params: { diagnosisId: 'required|string|mongoId' },
        body: { message: 'string', urgency: 'string|in:low,medium,high' },
      }),
    ],
    handler: diagnosisController.requestExpertReview,
  },

  // Get similar diagnoses
  getSimilarDiagnoses: {
    method: 'GET',
    path: '/:diagnosisId/similar',
    middleware: [
      validateRequest({
        params: { diagnosisId: 'required|string|mongoId' },
        query: { limit: 'number|min:1|max:10' },
      }),
    ],
    handler: diagnosisController.getSimilarDiagnoses,
  },

  // Export diagnosis report
  exportDiagnosisReport: {
    method: 'GET',
    path: '/:diagnosisId/export',
    middleware: [
      validateRequest({
        params: { diagnosisId: 'required|string|mongoId' },
        query: { format: 'string|in:pdf,json,csv' },
      }),
    ],
    handler: diagnosisController.exportDiagnosisReport,
  },

  // Get diagnosis trends
  getDiagnosisTrends: {
    method: 'GET',
    path: '/trends/analysis',
    middleware: [
      validateRequest({
        query: {
          period: 'string|in:7d,30d,90d,1y',
          crop: 'string',
          location: 'string',
          disease: 'string',
        },
      }),
    ],
    handler: diagnosisController.getDiagnosisTrends,
  },

  // Share diagnosis
  shareDiagnosis: {
    method: 'POST',
    path: '/:diagnosisId/share',
    middleware: [
      validateRequest({
        params: { diagnosisId: 'required|string|mongoId' },
        body: {
          shareWith: 'required|array',
          'shareWith.*': 'string|email',
          message: 'string',
          includeImages: 'boolean',
        },
      }),
    ],
    handler: diagnosisController.shareDiagnosis,
  },
};

// Apply routes to router
Object.entries(routes).forEach(([routeName, route]) => {
  const { method, path, middleware, handler } = route;
  
  switch (method) {
    case 'GET':
      router.get(path, ...middleware, handler as any);
      break;
    case 'POST':
      router.post(path, ...middleware, handler as any);
      break;
    case 'PUT':
      router.put(path, ...middleware, handler as any);
      break;
    case 'DELETE':
      router.delete(path, ...middleware, handler as any);
      break;
    default:
      throw new Error(`Unsupported HTTP method: ${method}`);
  }
});

// Expert-specific routes (additional authorization required)
router.use('/expert', authenticate, (req, res, next) => {
  // Check if user is an expert
  if (req.user?.userType !== 'expert' && req.user?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Expert privileges required.',
      error: 'INSUFFICIENT_PRIVILEGES',
    });
  }
  next();
});

// Expert routes
router.get('/expert/pending', diagnosisController.getPendingExpertReviews);
router.put('/expert/:diagnosisId/review', 
  validateRequest({
    params: { diagnosisId: 'required|string|mongoId' },
    body: {
      status: 'required|string|in:approved,rejected,needs_revision',
      comments: 'required|string|min:10',
      confidence: 'number|min:0|max:100',
      modifiedResults: 'array',
    },
  }),
  diagnosisController.submitExpertReview
);
router.get('/expert/stats', diagnosisController.getExpertReviewStats);

// Public routes (no authentication required)
const publicRouter = express.Router();

// Get public diagnosis statistics (anonymized)
publicRouter.get('/stats/public', diagnosisController.getPublicDiagnosisStats);

// Get disease prevalence by region
publicRouter.get('/prevalence/:region', 
  validateRequest({ params: { region: 'required|string' } }),
  diagnosisController.getDiseasePrevalence
);

// Health check for diagnosis service
publicRouter.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Diagnosis service is healthy',
    timestamp: new Date(),
    service: 'diagnosis',
    version: process.env.API_VERSION || '1.0.0',
  });
});

// Mount public routes
router.use('/public', publicRouter);

export default router;