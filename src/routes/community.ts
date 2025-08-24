import express from 'express';
import communityController from '@/controllers/communityController';
import { authenticate, authorize } from '@/middleware/auth';
import { validateRequest } from '@/middleware/validation';
import { uploadMiddleware } from '@/middleware/upload';
import { rateLimit } from '@/middleware/rateLimit';

const router = express.Router();

// Rate limiting for community actions
const postRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 posts per window per user
  message: {
    error: 'Too many posts created. Please wait before creating another post.',
    retryAfter: 15 * 60,
  },
});

const commentRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 comments per window per user
  message: {
    error: 'Too many comments. Please wait before commenting again.',
    retryAfter: 5 * 60,
  },
});

// Public routes (no authentication required)
router.get('/public/posts', 
  validateRequest({
    query: {
      page: 'number|min:1',
      limit: 'number|min:1|max:50',
      category: 'string',
      tag: 'string',
      sortBy: 'string|in:recent,popular,trending',
    },
  }),
  communityController.getPublicPosts
);

router.get('/public/posts/:postId', 
  validateRequest({
    params: { postId: 'required|string|mongoId' },
  }),
  communityController.getPublicPost
);

router.get('/public/trending', communityController.getTrendingPostsPublic);

// Protected routes (authentication required)
router.use(authenticate);

// Get all posts with filtering and pagination
router.get('/posts', 
  validateRequest({
    query: {
      page: 'number|min:1',
      limit: 'number|min:1|max:50',
      type: 'string|in:question,tip,success_story,news,discussion',
      category: 'string',
      tag: 'string',
      author: 'string|mongoId',
      sortBy: 'string|in:recent,popular,trending,relevant',
      location: 'string',
      radius: 'number|min:1|max:1000', // km
    },
  }),
  communityController.getPosts
);

// Create new post
router.post('/posts', 
  postRateLimit,
  uploadMiddleware.array('images', 5),
  validateRequest({
    body: {
      title: 'required|string|min:5|max:200',
      content: 'required|string|min:10|max:5000',
      type: 'required|string|in:question,tip,success_story,news,discussion',
      category: 'string|max:50',
      tags: 'array|max:10',
      'tags.*': 'string|max:30',
      location: 'object',
      'location.latitude': 'number|between:-90,90',
      'location.longitude': 'number|between:-180,180',
      'location.address': 'string|max:200',
      cropRelated: 'string|mongoId',
      diseaseRelated: 'string|mongoId',
      visibility: 'string|in:public,followers,private',
    },
  }),
  communityController.createPost
);

// Get specific post by ID
router.get('/posts/:postId', 
  validateRequest({
    params: { postId: 'required|string|mongoId' },
  }),
  communityController.getPostById
);

// Update post (only by author or admin)
router.put('/posts/:postId', 
  uploadMiddleware.array('images', 5),
  validateRequest({
    params: { postId: 'required|string|mongoId' },
    body: {
      title: 'string|min:5|max:200',
      content: 'string|min:10|max:5000',
      category: 'string|max:50',
      tags: 'array|max:10',
      'tags.*': 'string|max:30',
      visibility: 'string|in:public,followers,private',
    },
  }),
  communityController.updatePost
);

// Delete post (only by author or admin)
router.delete('/posts/:postId', 
  validateRequest({
    params: { postId: 'required|string|mongoId' },
  }),
  communityController.deletePost
);

// Like/Unlike post
router.post('/posts/:postId/like', 
  validateRequest({
    params: { postId: 'required|string|mongoId' },
  }),
  communityController.likePost
);

router.delete('/posts/:postId/like', 
  validateRequest({
    params: { postId: 'required|string|mongoId' },
  }),
  communityController.unlikePost
);

// Share post
router.post('/posts/:postId/share', 
  validateRequest({
    params: { postId: 'required|string|mongoId' },
    body: {
      platform: 'string|in:facebook,twitter,whatsapp,email,link',
      message: 'string|max:500',
    },
  }),
  communityController.sharePost
);

// Report post
router.post('/posts/:postId/report', 
  validateRequest({
    params: { postId: 'required|string|mongoId' },
    body: {
      reason: 'required|string|in:spam,inappropriate,harassment,misinformation,other',
      description: 'string|max:500',
    },
  }),
  communityController.reportPost
);

// Get post comments
router.get('/posts/:postId/comments', 
  validateRequest({
    params: { postId: 'required|string|mongoId' },
    query: {
      page: 'number|min:1',
      limit: 'number|min:1|max:50',
      sortBy: 'string|in:newest,oldest,popular',
    },
  }),
  communityController.getPostComments
);

// Add comment to post
router.post('/posts/:postId/comments', 
  commentRateLimit,
  validateRequest({
    params: { postId: 'required|string|mongoId' },
    body: {
      content: 'required|string|min:1|max:1000',
      parentCommentId: 'string|mongoId', // for replies
    },
  }),
  communityController.addComment
);

// Update comment (only by author or admin)
router.put('/comments/:commentId', 
  validateRequest({
    params: { commentId: 'required|string|mongoId' },
    body: {
      content: 'required|string|min:1|max:1000',
    },
  }),
  communityController.updateComment
);

// Delete comment (only by author or admin)
router.delete('/comments/:commentId', 
  validateRequest({
    params: { commentId: 'required|string|mongoId' },
  }),
  communityController.deleteComment
);

// Like/Unlike comment
router.post('/comments/:commentId/like', 
  validateRequest({
    params: { commentId: 'required|string|mongoId' },
  }),
  communityController.likeComment
);

router.delete('/comments/:commentId/like', 
  validateRequest({
    params: { commentId: 'required|string|mongoId' },
  }),
  communityController.unlikeComment
);

// Get user's posts
router.get('/users/:userId/posts', 
  validateRequest({
    params: { userId: 'required|string|mongoId' },
    query: {
      page: 'number|min:1',
      limit: 'number|min:1|max:50',
      type: 'string|in:question,tip,success_story,news,discussion',
    },
  }),
  communityController.getUserPosts
);

// Follow/Unfollow user
router.post('/users/:userId/follow', 
  validateRequest({
    params: { userId: 'required|string|mongoId' },
  }),
  communityController.followUser
);

router.delete('/users/:userId/follow', 
  validateRequest({
    params: { userId: 'required|string|mongoId' },
  }),
  communityController.unfollowUser
);

// Get user's followers
router.get('/users/:userId/followers', 
  validateRequest({
    params: { userId: 'required|string|mongoId' },
    query: {
      page: 'number|min:1',
      limit: 'number|min:1|max:50',
    },
  }),
  communityController.getUserFollowers
);

// Get user's following
router.get('/users/:userId/following', 
  validateRequest({
    params: { userId: 'required|string|mongoId' },
    query: {
      page: 'number|min:1',
      limit: 'number|min:1|max:50',
    },
  }),
  communityController.getUserFollowing
);

// Get trending posts
router.get('/trending', 
  validateRequest({
    query: {
      period: 'string|in:today,week,month',
      category: 'string',
      limit: 'number|min:1|max:20',
    },
  }),
  communityController.getTrendingPosts
);

// Search posts and users
router.get('/search', 
  validateRequest({
    query: {
      q: 'required|string|min:2|max:100',
      type: 'string|in:posts,users,all',
      category: 'string',
      location: 'string',
      radius: 'number|min:1|max:1000',
      page: 'number|min:1',
      limit: 'number|min:1|max:50',
    },
  }),
  communityController.searchCommunity
);

// Get recommended posts for user
router.get('/recommendations', 
  validateRequest({
    query: {
      limit: 'number|min:1|max:20',
    },
  }),
  communityController.getRecommendedPosts
);

// Get user's feed
router.get('/feed', 
  validateRequest({
    query: {
      page: 'number|min:1',
      limit: 'number|min:1|max:50',
      includeFollowing: 'boolean',
      includeRecommended: 'boolean',
    },
  }),
  communityController.getUserFeed
);

// Get community statistics
router.get('/statistics', communityController.getCommunityStatistics);

// Expert and Moderator routes
router.use(authorize(['expert', 'moderator', 'admin', 'super_admin']));

// Get flagged content for moderation
router.get('/moderation/flagged', 
  validateRequest({
    query: {
      type: 'string|in:posts,comments',
      page: 'number|min:1',
      limit: 'number|min:1|max:50',
      sortBy: 'string|in:newest,oldest,most_reported',
    },
  }),
  communityController.getFlaggedContent
);

// Moderate content (approve/reject/remove)
router.post('/moderation/:contentType/:contentId', 
  validateRequest({
    params: {
      contentType: 'required|string|in:post,comment',
      contentId: 'required|string|mongoId',
    },
    body: {
      action: 'required|string|in:approve,reject,remove,warn',
      reason: 'string|max:500',
      moderatorNotes: 'string|max:1000',
    },
  }),
  communityController.moderateContent
);

// Admin only routes
router.use(authorize(['admin', 'super_admin']));

// Get community analytics
router.get('/analytics', 
  validateRequest({
    query: {
      period: 'string|in:day,week,month,year',
      startDate: 'date',
      endDate: 'date',
    },
  }),
  communityController.getCommunityAnalytics
);

// Manage community settings
router.put('/settings', 
  validateRequest({
    body: {
      allowAnonymousPosts: 'boolean',
      requirePostApproval: 'boolean',
      maxPostsPerDay: 'number|min:1|max:100',
      maxCommentsPerPost: 'number|min:10|max:1000',
      autoModerationEnabled: 'boolean',
      bannedWords: 'array',
      'bannedWords.*': 'string',
    },
  }),
  communityController.updateCommunitySettings
);

// Bulk operations
router.post('/bulk/moderate', communityController.bulkModerateContent);
router.delete('/bulk/cleanup', communityController.bulkCleanupContent);

export default router;