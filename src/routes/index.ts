import { Router } from 'express';
import logger from '@/utils/logger';

// Import route modules
import authRoutes from './auth';
import userRoutes from './users';
import mlRoutes from './ml';
// Import other routes (temporarily disabled for testing)
// import diagnosisRoutes from './diagnosis';
// import cropRoutes from './crops';
// import diseaseRoutes from './diseases';
// import weatherRoutes from './weather';
// import communityRoutes from './community';
// import expertRoutes from './experts';
// import marketRoutes from './market';
// import notificationRoutes from './notifications';
// import i18nRoutes from './i18n';
// import adminRoutes from './admin';

const router = Router();

// API root endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Agri Farm API v1.0.0',
    data: {
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      docs: '/api/docs',
      endpoints: {
        auth: '/api/auth',
        users: '/api/users',
        diagnosis: '/api/diagnosis',
        crops: '/api/crops',
        diseases: '/api/diseases',
        weather: '/api/weather',
        community: '/api/community',
        experts: '/api/experts',
        market: '/api/market',
        notifications: '/api/notifications',
        i18n: '/api/i18n',
        admin: '/api/admin',
        ml: '/api/ml',
      },
      features: {
        authentication: 'JWT-based authentication',
        authorization: 'Role-based access control',
        fileUpload: 'Image processing with Cloudinary',
        rateLimit: 'Request rate limiting',
        validation: 'Input validation with Joi/Zod',
        i18n: 'Multi-language support',
        logging: 'Structured logging with Winston',
        monitoring: 'Health checks and metrics',
      },
    },
  });
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/ml', mlRoutes);

// Mount other routes (temporarily disabled for testing)
// router.use('/diagnosis', diagnosisRoutes);
// router.use('/crops', cropRoutes);
// router.use('/diseases', diseaseRoutes);
// router.use('/weather', weatherRoutes);
// router.use('/community', communityRoutes);
// router.use('/experts', expertRoutes);
// router.use('/market', marketRoutes);
// router.use('/notifications', notificationRoutes);
// router.use('/i18n', i18nRoutes);
// router.use('/admin', adminRoutes);

// Log route registration
logger.info('API routes registered', {
  routes: [
    '/auth',
    '/users',
    '/ml',
    // Additional routes temporarily disabled for testing
    // '/diagnosis',
    // '/crops',
    // '/diseases',
    // '/weather',
    // '/community',
    // '/experts',
    // '/market',
    // '/notifications',
    // '/i18n',
    // '/admin',
  ],
  totalRoutes: 3,
});

export default router;