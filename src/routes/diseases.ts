import express from 'express';
import diseaseController from '@/controllers/diseaseController';
import { authenticate, authorize } from '@/middleware/auth';
import { validateRequest } from '@/middleware/validation';
import { uploadMiddleware } from '@/middleware/upload';

const router = express.Router();

// Public routes (no authentication required)
router.get('/public', diseaseController.getPublicDiseases);
router.get('/public/:diseaseId', diseaseController.getPublicDisease);
router.get('/public/search', diseaseController.searchPublicDiseases);
router.get('/public/symptoms', diseaseController.getPublicSymptoms);

// Protected routes (authentication required)
router.use(authenticate);

// Get all diseases with filtering and pagination
router.get('/', diseaseController.getDiseases);

// Get specific disease by ID
router.get('/:diseaseId', diseaseController.getDiseaseById);

// Search diseases
router.get('/search/query', diseaseController.searchDiseases);

// Get disease symptoms
router.get('/:diseaseId/symptoms', diseaseController.getDiseaseSymptoms);

// Get disease treatments
router.get('/:diseaseId/treatments', diseaseController.getDiseaseTreatments);

// Get diseases by crop
router.get('/crop/:cropId', diseaseController.getDiseasesByCrop);

// Get disease prevention measures
router.get('/:diseaseId/prevention', diseaseController.getDiseasePrevention);

// Get disease prevalence data
router.get('/:diseaseId/prevalence', diseaseController.getDiseasePrevalence);

// Report disease occurrence
router.post('/:diseaseId/report', 
  validateRequest({
    params: { diseaseId: 'required|string|mongoId' },
    body: {
      location: 'required|object',
      'location.latitude': 'required|number',
      'location.longitude': 'required|number',
      severity: 'required|string|in:low,medium,high,severe',
      affectedArea: 'number|min:0',
      notes: 'string|max:500',
    },
  }),
  diseaseController.reportDiseaseOccurrence
);

// Get nearby disease reports
router.get('/reports/nearby', diseaseController.getNearbyDiseaseReports);

// Expert and Admin routes
router.use(authorize(['expert', 'admin', 'super_admin']));

// Add disease treatment
router.post('/:diseaseId/treatments', 
  validateRequest({
    params: { diseaseId: 'required|string|mongoId' },
    body: {
      name: 'required|string|min:2|max:200',
      type: 'required|string|in:chemical,organic,biological,cultural',
      description: 'required|string|min:10|max:1000',
      instructions: 'required|array|min:1',
      'instructions.*': 'required|string',
    },
  }),
  diseaseController.addDiseaseTreatment
);

// Update disease treatment
router.put('/treatments/:treatmentId', diseaseController.updateDiseaseTreatment);

// Admin only routes
router.use(authorize(['admin', 'super_admin']));

// Create new disease
router.post('/', 
  uploadMiddleware.array('images', 5),
  validateRequest({
    body: {
      name: 'required|string|min:2|max:200',
      scientificName: 'string|min:5|max:300',
      type: 'required|string|in:fungal,bacterial,viral,pest,nutrient,environmental',
      affectedCrops: 'required|array|min:1',
      'affectedCrops.*': 'required|string|mongoId',
      severity: 'required|string|in:low,medium,high,critical',
      description: 'required|string|min:20|max:2000',
    },
  }),
  diseaseController.createDisease
);

// Update disease
router.put('/:diseaseId', 
  uploadMiddleware.array('images', 5),
  validateRequest({
    params: { diseaseId: 'required|string|mongoId' },
  }),
  diseaseController.updateDisease
);

// Delete disease (soft delete)
router.delete('/:diseaseId', 
  validateRequest({
    params: { diseaseId: 'required|string|mongoId' },
  }),
  diseaseController.deleteDisease
);

// Bulk operations
router.post('/bulk/create', diseaseController.bulkCreateDiseases);
router.put('/bulk/update', diseaseController.bulkUpdateDiseases);

// Import disease data from external sources
router.post('/import', diseaseController.importDiseaseData);

export default router;