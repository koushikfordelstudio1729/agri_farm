import { Router } from 'express';
import {
  getMLServiceInfo,
  checkMLProvidersHealth,
  testMLService,
  updateConfidenceThreshold,
  getMLUsageStats,
  diagnoseWithProvider
} from '@/controllers/mlController';
import { auth, adminOnly } from '@/middleware/auth';
import { upload } from '@/middleware/upload';
import { validateRequest } from '@/middleware/validation';
import { body, param } from 'express-validator';

const router = Router();

/**
 * @swagger
 * /api/v1/ml/info:
 *   get:
 *     summary: Get ML service information and configuration
 *     tags: [ML Services]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ML service information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     enabledProviders:
 *                       type: array
 *                       items:
 *                         type: object
 *                     totalProviders:
 *                       type: number
 *                     primaryProvider:
 *                       type: string
 *                     ensembleEnabled:
 *                       type: boolean
 */
router.get('/info', auth, getMLServiceInfo);

/**
 * @swagger
 * /api/v1/ml/health:
 *   get:
 *     summary: Check health status of all ML providers
 *     tags: [ML Services]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ML providers health check completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     overall:
 *                       type: object
 *                       properties:
 *                         healthy:
 *                           type: number
 *                         unhealthy:
 *                           type: number
 *                         disabled:
 *                           type: number
 *                         total:
 *                           type: number
 *                     providers:
 *                       type: array
 *                       items:
 *                         type: object
 */
router.get('/health', auth, checkMLProvidersHealth);

/**
 * @swagger
 * /api/v1/ml/test/{provider}:
 *   post:
 *     summary: Test specific ML provider with sample images
 *     tags: [ML Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [plant_id, plantnet, tensorflow, google_vision, huggingface]
 *         description: ML provider to test
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 3
 *             required:
 *               - images
 *     responses:
 *       200:
 *         description: ML service test completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 */
router.post('/test/:provider',
  auth,
  param('provider').isIn(['plant_id', 'plantnet', 'tensorflow', 'google_vision', 'huggingface']),
  validateRequest,
  upload.array('images', 3),
  testMLService
);

/**
 * @swagger
 * /api/v1/ml/diagnose/{provider}:
 *   post:
 *     summary: Diagnose plant disease with specific provider
 *     tags: [ML Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [plant_id, plantnet, tensorflow, google_vision, huggingface, ensemble]
 *         description: ML provider to use for diagnosis
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 5
 *               cropId:
 *                 type: string
 *                 description: Optional crop ID for better accuracy
 *               useEnsemble:
 *                 type: boolean
 *                 default: false
 *                 description: Use ensemble of multiple providers
 *             required:
 *               - images
 *     responses:
 *       200:
 *         description: Plant diagnosis completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     diagnosis:
 *                       $ref: '#/components/schemas/DiagnosisResult'
 *                     metadata:
 *                       type: object
 */
router.post('/diagnose/:provider',
  auth,
  param('provider').isIn(['plant_id', 'plantnet', 'tensorflow', 'google_vision', 'huggingface', 'ensemble']),
  validateRequest,
  upload.array('images', 5),
  diagnoseWithProvider
);

/**
 * @swagger
 * /api/v1/ml/confidence:
 *   patch:
 *     summary: Update ML confidence threshold (Admin only)
 *     tags: [ML Services]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               threshold:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 1
 *                 description: New confidence threshold (0-1)
 *             required:
 *               - threshold
 *     responses:
 *       200:
 *         description: Confidence threshold updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     threshold:
 *                       type: number
 */
router.patch('/confidence',
  auth,
  adminOnly,
  body('threshold').isFloat({ min: 0, max: 1 }).withMessage('Threshold must be between 0 and 1'),
  validateRequest,
  updateConfidenceThreshold
);

/**
 * @swagger
 * /api/v1/ml/stats:
 *   get:
 *     summary: Get ML usage statistics (Admin only)
 *     tags: [ML Services]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ML usage statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalRequests:
 *                       type: number
 *                     successfulRequests:
 *                       type: number
 *                     failedRequests:
 *                       type: number
 *                     averageProcessingTime:
 *                       type: number
 *                     providersUsage:
 *                       type: object
 *                     topDiseases:
 *                       type: array
 *                     confidenceDistribution:
 *                       type: object
 */
router.get('/stats', auth, adminOnly, getMLUsageStats);

export default router;