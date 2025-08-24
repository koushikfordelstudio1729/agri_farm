import express from 'express';
import expertController from '@/controllers/expertController';
import { authenticate, authorize } from '@/middleware/auth';
import { validateRequest } from '@/middleware/validation';
import { uploadMiddleware } from '@/middleware/upload';
import { rateLimit } from '@/middleware/rateLimit';

const router = express.Router();

// Rate limiting for expert operations
const consultationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 consultation requests per hour per user
  message: {
    error: 'Too many consultation requests. Please wait before booking another consultation.',
    retryAfter: 60 * 60,
  },
});

// Public routes (no authentication required)
router.get('/public', 
  validateRequest({
    query: {
      specialization: 'string',
      location: 'string',
      rating: 'number|between:1,5',
      page: 'number|min:1',
      limit: 'number|min:1|max:20',
    },
  }),
  expertController.getPublicExperts
);

router.get('/public/:expertId', 
  validateRequest({
    params: { expertId: 'required|string|mongoId' },
  }),
  expertController.getPublicExpert
);

router.get('/public/specializations', expertController.getPublicSpecializations);

// Protected routes (authentication required)
router.use(authenticate);

// Get all experts with filtering
router.get('/', 
  validateRequest({
    query: {
      specialization: 'string',
      location: 'string', // "lat,lng" format or location name
      rating: 'number|between:1,5',
      availability: 'string|in:now,today,week',
      priceRange: 'string', // "min,max" format
      experience: 'number|min:0',
      language: 'string',
      page: 'number|min:1',
      limit: 'number|min:1|max:20',
      sortBy: 'string|in:rating,experience,price,distance,availability',
      sortOrder: 'string|in:asc,desc',
    },
  }),
  expertController.getExperts
);

// Get specific expert by ID
router.get('/:expertId', 
  validateRequest({
    params: { expertId: 'required|string|mongoId' },
  }),
  expertController.getExpert
);

// Search experts
router.get('/search/query', 
  validateRequest({
    query: {
      q: 'required|string|min:2|max:100',
      specialization: 'string',
      location: 'string',
      page: 'number|min:1',
      limit: 'number|min:1|max:20',
    },
  }),
  expertController.searchExperts
);

// Get expert reviews
router.get('/:expertId/reviews', 
  validateRequest({
    params: { expertId: 'required|string|mongoId' },
    query: {
      page: 'number|min:1',
      limit: 'number|min:1|max:50',
      rating: 'number|between:1,5',
    },
  }),
  expertController.getExpertReviews
);

// Get expert availability
router.get('/:expertId/availability', 
  validateRequest({
    params: { expertId: 'required|string|mongoId' },
    query: {
      date: 'date',
      timezone: 'string',
    },
  }),
  expertController.getExpertAvailability
);

// Book consultation with expert
router.post('/:expertId/consultations', 
  consultationRateLimit,
  validateRequest({
    params: { expertId: 'required|string|mongoId' },
    body: {
      type: 'required|string|in:instant,scheduled',
      scheduledDate: 'string', // required if type is 'scheduled'
      timeSlot: 'string', // required if type is 'scheduled'
      problem: 'required|string|min:20|max:2000',
      urgency: 'string|in:low,medium,high',
      attachments: 'array|max:5',
      'attachments.*': 'object',
      'attachments.*.url': 'required|string|url',
      'attachments.*.type': 'required|string|in:image,document',
      'attachments.*.name': 'required|string',
      consultationFee: 'number|min:0', // Optional override
      preferredLanguage: 'string',
    },
  }),
  expertController.bookConsultation
);

// Get user's consultations
router.get('/consultations/my', 
  validateRequest({
    query: {
      status: 'string|in:scheduled,active,completed,cancelled',
      type: 'string|in:instant,scheduled',
      startDate: 'date',
      endDate: 'date',
      page: 'number|min:1',
      limit: 'number|min:1|max:50',
      sortBy: 'string|in:date,status,expert',
      sortOrder: 'string|in:asc,desc',
    },
  }),
  expertController.getUserConsultations
);

// Get specific consultation
router.get('/consultations/:consultationId', 
  validateRequest({
    params: { consultationId: 'required|string|mongoId' },
  }),
  expertController.getConsultation
);

// Update consultation (user can update notes, cancel)
router.put('/consultations/:consultationId', 
  validateRequest({
    params: { consultationId: 'required|string|mongoId' },
    body: {
      notes: 'string|max:1000',
      status: 'string|in:cancelled', // Users can only cancel
      rating: 'number|between:1,5', // After completion
      review: 'string|max:1000', // After completion
    },
  }),
  expertController.updateConsultation
);

// Cancel consultation
router.post('/consultations/:consultationId/cancel', 
  validateRequest({
    params: { consultationId: 'required|string|mongoId' },
    body: {
      reason: 'required|string|min:10|max:500',
    },
  }),
  expertController.cancelConsultation
);

// Add review for expert
router.post('/:expertId/reviews', 
  validateRequest({
    params: { expertId: 'required|string|mongoId' },
    body: {
      rating: 'required|number|between:1,5',
      review: 'string|max:1000',
      consultationId: 'required|string|mongoId',
      anonymous: 'boolean',
    },
  }),
  expertController.addExpertReview
);

// Get recommended experts based on user profile
router.get('/recommendations/personalized', 
  validateRequest({
    query: {
      limit: 'number|min:1|max:10',
      includeCrops: 'boolean',
      includeLocation: 'boolean',
    },
  }),
  expertController.getRecommendedExperts
);

// Expert-specific routes (for users who are experts)
router.use('/profile', authorize(['expert']));

// Create expert profile
router.post('/profile', 
  uploadMiddleware.array('documents', 10),
  validateRequest({
    body: {
      specializations: 'required|array|min:1|max:10',
      'specializations.*': 'required|string',
      credentials: 'required|array|min:1',
      'credentials.*': 'required|object',
      'credentials.*.title': 'required|string',
      'credentials.*.institution': 'required|string',
      'credentials.*.year': 'required|number|min:1900|max:2030',
      'credentials.*.verified': 'boolean',
      experience: 'required|number|min:0|max:50',
      education: 'array',
      'education.*': 'object',
      'education.*.degree': 'required|string',
      'education.*.field': 'required|string',
      'education.*.institution': 'required|string',
      'education.*.year': 'required|number|min:1900|max:2030',
      certifications: 'array',
      consultationFee: 'required|number|min:0',
      languages: 'required|array|min:1',
      'languages.*': 'required|string',
      bio: 'required|string|min:50|max:2000',
      location: 'object',
      'location.latitude': 'number|between:-90,90',
      'location.longitude': 'number|between:-180,180',
      'location.address': 'string',
    },
  }),
  expertController.createExpertProfile
);

// Update expert profile
router.put('/profile', 
  uploadMiddleware.array('documents', 10),
  expertController.updateExpertProfile
);

// Get own expert profile
router.get('/profile', expertController.getOwnExpertProfile);

// Set availability
router.put('/profile/availability', 
  validateRequest({
    body: {
      availability: 'required|object',
      timezone: 'required|string',
    },
  }),
  expertController.setExpertAvailability
);

// Get expert's consultations
router.get('/profile/consultations', 
  validateRequest({
    query: {
      status: 'string|in:scheduled,active,completed,cancelled',
      startDate: 'date',
      endDate: 'date',
      page: 'number|min:1',
      limit: 'number|min:1|max:50',
    },
  }),
  expertController.getExpertConsultations
);

// Update consultation as expert
router.put('/profile/consultations/:consultationId', 
  validateRequest({
    params: { consultationId: 'required|string|mongoId' },
    body: {
      status: 'string|in:active,completed',
      notes: 'string|max:2000',
      diagnosis: 'object', // Expert's diagnosis
      recommendations: 'array',
      'recommendations.*': 'string',
      followUpRequired: 'boolean',
      followUpDate: 'date',
    },
  }),
  expertController.updateConsultationAsExpert
);

// Get expert statistics
router.get('/profile/statistics', 
  validateRequest({
    query: {
      period: 'string|in:7d,30d,90d,1y',
    },
  }),
  expertController.getExpertStats
);

// Get consultation history for expert
router.get('/profile/history', 
  validateRequest({
    query: {
      page: 'number|min:1',
      limit: 'number|min:1|max:50',
    },
  }),
  expertController.getConsultationHistory
);

// Expert earnings and payouts
router.get('/profile/earnings', 
  validateRequest({
    query: {
      period: 'string|in:week,month,quarter,year',
      year: 'number|min:2020|max:2030',
      month: 'number|min:1|max:12',
    },
  }),
  expertController.getExpertEarnings
);

// Request payout
router.post('/profile/payout', 
  validateRequest({
    body: {
      amount: 'required|number|min:10',
      paymentMethod: 'required|string|in:bank_transfer,paypal,mobile_money',
      accountDetails: 'required|object',
    },
  }),
  expertController.requestPayout
);

// Admin routes for expert management
router.use('/admin', authorize(['admin', 'super_admin']));

// Get pending expert applications
router.get('/admin/pending', 
  validateRequest({
    query: {
      page: 'number|min:1',
      limit: 'number|min:1|max:50',
      specialization: 'string',
    },
  }),
  expertController.getPendingExpertApplications
);

// Approve expert application
router.post('/admin/:expertId/approve', 
  validateRequest({
    params: { expertId: 'required|string|mongoId' },
    body: {
      notes: 'string|max:1000',
      verifiedCredentials: 'array',
      'verifiedCredentials.*': 'string',
    },
  }),
  expertController.approveExpert
);

// Reject expert application
router.post('/admin/:expertId/reject', 
  validateRequest({
    params: { expertId: 'required|string|mongoId' },
    body: {
      reason: 'required|string|min:20|max:1000',
      feedback: 'string|max:2000',
    },
  }),
  expertController.rejectExpert
);

// Suspend expert
router.post('/admin/:expertId/suspend', 
  validateRequest({
    params: { expertId: 'required|string|mongoId' },
    body: {
      reason: 'required|string|min:10|max:1000',
      duration: 'number|min:1|max:365', // days
    },
  }),
  expertController.suspendExpert
);

// Get expert analytics
router.get('/admin/analytics', 
  validateRequest({
    query: {
      period: 'string|in:week,month,quarter,year',
      specialization: 'string',
    },
  }),
  expertController.getExpertAnalytics
);

// Manage expert specializations
router.get('/admin/specializations', expertController.getSpecializations);
router.post('/admin/specializations', 
  validateRequest({
    body: {
      name: 'required|string|min:2|max:100',
      description: 'string|max:500',
      category: 'required|string',
      isActive: 'boolean',
    },
  }),
  expertController.addSpecialization
);

router.put('/admin/specializations/:specializationId', expertController.updateSpecialization);
router.delete('/admin/specializations/:specializationId', expertController.deleteSpecialization);

// Bulk expert operations
router.post('/admin/bulk/approve', expertController.bulkApproveExperts);
router.post('/admin/bulk/notify', expertController.bulkNotifyExperts);

export default router;