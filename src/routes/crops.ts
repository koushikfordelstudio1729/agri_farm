import express from 'express';
import cropController from '@/controllers/cropController';
import { authenticate, authorize } from '@/middleware/auth';
import { validateRequest } from '@/middleware/validation';
import { rateLimit } from '@/middleware/rateLimit';

const router = express.Router();

// Public routes (no authentication required)
router.get('/public', cropController.getAllCrops);
router.get('/public/:cropId', cropController.getCrop);
router.get('/public/search', cropController.searchCrops);

// Protected routes (authentication required)
router.use(authenticate);

// Get all crops with filtering and pagination
router.get('/', cropController.getAllCrops);

// Get specific crop by ID
router.get('/:cropId', cropController.getCrop);

// Search crops
router.get('/search/query', cropController.searchCrops);

// Get crop diseases
router.get('/:cropId/diseases', cropController.getCropDiseases);

// Get crop treatments  
router.get('/:cropId/treatments', cropController.getCropTreatments);

// Get crop statistics
router.get('/statistics', cropController.getCropStats);

// Admin only routes
router.use(authorize(['admin', 'super_admin']));

// Create new crop
router.post('/', 
  validateRequest({
    body: {
      name: 'required|string|min:2|max:100',
      scientificName: 'required|string|min:5|max:200',
      category: 'required|string',
      family: 'string',
      description: 'string|max:1000',
    },
  }),
  cropController.createCrop
);

// Update crop
router.put('/:cropId', 
  validateRequest({
    params: { cropId: 'required|string|mongoId' },
    body: {
      name: 'string|min:2|max:100',
      scientificName: 'string|min:5|max:200',
      category: 'string',
      family: 'string',
      description: 'string|max:1000',
    },
  }),
  cropController.updateCrop
);

// Delete crop (soft delete)
router.delete('/:cropId', 
  validateRequest({
    params: { cropId: 'required|string|mongoId' },
  }),
  cropController.deleteCrop
);

// Add crop variety
router.post('/:cropId/varieties', 
  validateRequest({
    params: { cropId: 'required|string|mongoId' },
    body: {
      name: 'required|string|min:2|max:100',
      description: 'string|max:500',
      maturityDays: 'required|number|min:1|max:365',
      characteristics: 'array',
    },
  }),
  cropController.addCropVariety
);

// Update crop variety
router.put('/:cropId/varieties/:varietyId', cropController.updateCropVariety);

// Delete crop variety
router.delete('/:cropId/varieties/:varietyId', cropController.deleteCropVariety);

// Bulk operations
router.post('/bulk/create', cropController.bulkCreateCrops);
router.put('/bulk/update', cropController.bulkUpdateCrops);

export default router;