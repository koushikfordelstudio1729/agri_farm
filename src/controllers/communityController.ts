import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { CommunityPost } from '@/models/CommunityPost';
import { User } from '@/models/User';
import { ImageService } from '@/services/imageService';
import { logger } from '@/utils/logger';
import {
  NotFoundError,
  ValidationError,
  AuthorizationError,
  createErrorContext,
} from '@/utils/errors';
import { ApiResponse, PaginationResponse } from '@/types/common.types';
import {
  AuthenticatedRequest,
  CreatePostRequest,
  GetPostRequest,
  UpdatePostRequest,
  DeletePostRequest,
  GetPostsRequest,
  LikePostRequest,
  UnlikePostRequest,
  CommentOnPostRequest,
  UpdateCommentRequest,
  DeleteCommentRequest,
  ReportPostRequest,
  SearchPostsRequest,
  GetTrendingPostsRequest,
  GetUserPostsRequest,
  GetPostStatsRequest,
  PostResponse,
  CommentResponse,
  PostStatsResponse,
  CreatePostController,
  GetPostController,
  UpdatePostController,
  DeletePostController,
  GetPostsController,
  LikePostController,
  UnlikePostController,
  CommentOnPostController,
  UpdateCommentController,
  DeleteCommentController,
  ReportPostController,
  SearchPostsController,
  GetTrendingPostsController,
  GetUserPostsController,
  GetPostStatsController,
} from './communityController.types';

export class CommunityController {
  public createPost: CreatePostController = async (req, res, next) => {
    try {
      const {
        title,
        content,
        type,
        category,
        tags = [],
        cropId,
        diseaseId,
        location,
        isAnonymous = false,
        allowComments = true,
      } = req.body;

      const userId = req.user.id;
      const images = req.files as Express.Multer.File[];

      // Process uploaded images if any
      let processedImages: any[] = [];
      if (images && images.length > 0) {
        const uploadResults = await ImageService.processUploadedImages(images, {
          generateThumbnails: true,
          uploadToCloud: true,
          processOptions: {
            width: 1200,
            height: 800,
            quality: 85,
            fit: 'inside',
          },
        });

        processedImages = uploadResults.map(result => ({
          url: result.url,
          thumbnailUrl: result.thumbnailUrl,
          caption: '',
          metadata: {
            size: result.size,
            width: result.width,
            height: result.height,
            format: result.format,
          },
        }));
      }

      const post = new CommunityPost({
        author: userId,
        title,
        content,
        type,
        category,
        tags,
        crop: cropId,
        disease: diseaseId,
        location: location ? {
          type: 'Point',
          coordinates: [location.longitude, location.latitude],
          address: location.address,
          city: location.city,
          state: location.state,
          country: location.country,
        } : undefined,
        images: processedImages,
        isAnonymous,
        allowComments,
        status: 'published',
        createdAt: new Date(),
      });

      await post.save();

      // Populate for response
      const populatedPost = await CommunityPost.findById(post._id)
        .populate('author', 'firstName lastName profileImage reputation')
        .populate('crop', 'name scientificName category')
        .populate('disease', 'name severity type');

      logger.info('Community post created', {
        postId: post._id.toString(),
        userId,
        type,
        category,
        hasImages: processedImages.length > 0,
        requestId: (req as any).id,
      });

      const response: ApiResponse<PostResponse> = {
        success: true,
        message: 'Post created successfully',
        data: populatedPost?.toObject() as PostResponse,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  public getPost: GetPostController = async (req, res, next) => {
    try {
      const { postId } = req.params;
      const userId = req.user?.id;

      if (!mongoose.Types.ObjectId.isValid(postId)) {
        throw new ValidationError('Invalid post ID', {
          postId: ['Post ID must be a valid MongoDB ObjectId'],
        }, createErrorContext(req));
      }

      const post = await CommunityPost.findById(postId)
        .populate('author', 'firstName lastName profileImage reputation')
        .populate('crop', 'name scientificName category image')
        .populate('disease', 'name severity type description')
        .populate({
          path: 'comments',
          populate: {
            path: 'author',
            select: 'firstName lastName profileImage reputation',
          },
          options: {
            sort: { createdAt: -1 },
            limit: 20, // Limit initial comments load
          },
        });

      if (!post) {
        throw new NotFoundError('Post not found', createErrorContext(req));
      }

      // Check if post is accessible (not blocked, not from blocked user, etc.)
      if (post.status === 'hidden' && post.author._id.toString() !== userId) {
        throw new NotFoundError('Post not found', createErrorContext(req));
      }

      // Increment view count
      post.stats.views += 1;
      await post.save();

      // Check if current user has liked this post
      const isLiked = userId ? post.likes.includes(new mongoose.Types.ObjectId(userId)) : false;

      const postResponse: PostResponse = {
        ...post.toObject(),
        isLiked,
        canEdit: userId === post.author._id.toString(),
        canDelete: userId === post.author._id.toString() || req.user?.role === 'admin',
      };

      logger.info('Community post retrieved', {
        postId,
        userId: userId || 'anonymous',
        postType: post.type,
        viewCount: post.stats.views,
        requestId: (req as any).id,
      });

      const response: ApiResponse<PostResponse> = {
        success: true,
        message: 'Post retrieved successfully',
        data: postResponse,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public updatePost: UpdatePostController = async (req, res, next) => {
    try {
      const { postId } = req.params;
      const userId = req.user.id;
      const {
        title,
        content,
        category,
        tags,
        allowComments,
        isAnonymous,
      } = req.body;

      if (!mongoose.Types.ObjectId.isValid(postId)) {
        throw new ValidationError('Invalid post ID');
      }

      const post = await CommunityPost.findById(postId);
      if (!post) {
        throw new NotFoundError('Post not found', createErrorContext(req));
      }

      // Check ownership
      if (post.author.toString() !== userId) {
        throw new AuthorizationError('You can only edit your own posts', createErrorContext(req));
      }

      // Update allowed fields
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (title !== undefined) updateData.title = title;
      if (content !== undefined) updateData.content = content;
      if (category !== undefined) updateData.category = category;
      if (tags !== undefined) updateData.tags = tags;
      if (allowComments !== undefined) updateData.allowComments = allowComments;
      if (isAnonymous !== undefined) updateData.isAnonymous = isAnonymous;

      const updatedPost = await CommunityPost.findByIdAndUpdate(
        postId,
        updateData,
        { new: true, runValidators: true }
      )
        .populate('author', 'firstName lastName profileImage reputation')
        .populate('crop', 'name scientificName category')
        .populate('disease', 'name severity type');

      logger.info('Community post updated', {
        postId,
        userId,
        updatedFields: Object.keys(updateData).filter(key => key !== 'updatedAt'),
        requestId: (req as any).id,
      });

      const response: ApiResponse<PostResponse> = {
        success: true,
        message: 'Post updated successfully',
        data: updatedPost?.toObject() as PostResponse,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public deletePost: DeletePostController = async (req, res, next) => {
    try {
      const { postId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      if (!mongoose.Types.ObjectId.isValid(postId)) {
        throw new ValidationError('Invalid post ID');
      }

      const post = await CommunityPost.findById(postId);
      if (!post) {
        throw new NotFoundError('Post not found', createErrorContext(req));
      }

      // Check permissions
      if (post.author.toString() !== userId && userRole !== 'admin') {
        throw new AuthorizationError('You can only delete your own posts', createErrorContext(req));
      }

      // Soft delete
      post.status = 'deleted';
      post.deletedAt = new Date();
      await post.save();

      logger.info('Community post deleted', {
        postId,
        userId,
        postAuthor: post.author.toString(),
        deletedBy: userRole === 'admin' ? 'admin' : 'author',
        requestId: (req as any).id,
      });

      const response: ApiResponse<{}> = {
        success: true,
        message: 'Post deleted successfully',
        data: {},
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public getPosts: GetPostsController = async (req, res, next) => {
    try {
      const {
        page = '1',
        limit = '10',
        type,
        category,
        tags,
        cropId,
        diseaseId,
        location,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      // Build filter query
      const filterQuery: any = {
        status: 'published',
      };

      if (type) filterQuery.type = type;
      if (category) filterQuery.category = category;
      if (tags) {
        const tagArray = typeof tags === 'string' ? tags.split(',') : tags;
        filterQuery.tags = { $in: tagArray };
      }
      if (cropId) filterQuery.crop = cropId;
      if (diseaseId) filterQuery.disease = diseaseId;
      
      if (location) {
        const [lat, lng] = (location as string).split(',').map(Number);
        if (!isNaN(lat) && !isNaN(lng)) {
          filterQuery.location = {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [lng, lat],
              },
              $maxDistance: 50000, // 50km radius
            },
          };
        }
      }

      // Build sort object
      const sortObj: any = {};
      if (sortBy === 'trending') {
        // Trending sort: combination of likes, comments, and recency
        sortObj['stats.likes'] = -1;
        sortObj['stats.comments'] = -1;
        sortObj.createdAt = -1;
      } else if (sortBy === 'popular') {
        sortObj['stats.likes'] = -1;
      } else {
        sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;
      }

      // Execute query
      const [posts, total] = await Promise.all([
        CommunityPost.find(filterQuery)
          .populate('author', 'firstName lastName profileImage reputation')
          .populate('crop', 'name scientificName category')
          .populate('disease', 'name severity type')
          .select('-comments') // Don't load comments in list view
          .sort(sortObj)
          .skip(skip)
          .limit(limitNum),
        CommunityPost.countDocuments(filterQuery),
      ]);

      const pagination: PaginationResponse = {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPreviousPage: pageNum > 1,
      };

      logger.info('Community posts retrieved', {
        userId: req.user?.id || 'anonymous',
        filters: { type, category, tags, cropId, diseaseId },
        resultCount: posts.length,
        requestId: (req as any).id,
      });

      const response: ApiResponse<PostResponse[]> = {
        success: true,
        message: 'Posts retrieved successfully',
        data: posts.map(post => post.toObject()) as PostResponse[],
      };

      res.json({ ...response, pagination });
    } catch (error) {
      next(error);
    }
  };

  public likePost: LikePostController = async (req, res, next) => {
    try {
      const { postId } = req.params;
      const userId = req.user.id;

      if (!mongoose.Types.ObjectId.isValid(postId)) {
        throw new ValidationError('Invalid post ID');
      }

      const post = await CommunityPost.findById(postId);
      if (!post) {
        throw new NotFoundError('Post not found', createErrorContext(req));
      }

      const userObjectId = new mongoose.Types.ObjectId(userId);

      // Check if already liked
      if (post.likes.includes(userObjectId)) {
        throw new ValidationError('Post already liked', {
          like: ['You have already liked this post'],
        }, createErrorContext(req));
      }

      // Add like
      post.likes.push(userObjectId);
      post.stats.likes = post.likes.length;
      await post.save();

      // TODO: Create notification for post author

      logger.info('Post liked', {
        postId,
        userId,
        postAuthor: post.author.toString(),
        totalLikes: post.stats.likes,
        requestId: (req as any).id,
      });

      const response: ApiResponse<{ likesCount: number; isLiked: boolean }> = {
        success: true,
        message: 'Post liked successfully',
        data: {
          likesCount: post.stats.likes,
          isLiked: true,
        },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public unlikePost: UnlikePostController = async (req, res, next) => {
    try {
      const { postId } = req.params;
      const userId = req.user.id;

      if (!mongoose.Types.ObjectId.isValid(postId)) {
        throw new ValidationError('Invalid post ID');
      }

      const post = await CommunityPost.findById(postId);
      if (!post) {
        throw new NotFoundError('Post not found', createErrorContext(req));
      }

      const userObjectId = new mongoose.Types.ObjectId(userId);

      // Check if not liked
      const likeIndex = post.likes.findIndex(like => like.toString() === userId);
      if (likeIndex === -1) {
        throw new ValidationError('Post not liked', {
          unlike: ['You have not liked this post'],
        }, createErrorContext(req));
      }

      // Remove like
      post.likes.splice(likeIndex, 1);
      post.stats.likes = post.likes.length;
      await post.save();

      logger.info('Post unliked', {
        postId,
        userId,
        postAuthor: post.author.toString(),
        totalLikes: post.stats.likes,
        requestId: (req as any).id,
      });

      const response: ApiResponse<{ likesCount: number; isLiked: boolean }> = {
        success: true,
        message: 'Post unliked successfully',
        data: {
          likesCount: post.stats.likes,
          isLiked: false,
        },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public commentOnPost: CommentOnPostController = async (req, res, next) => {
    try {
      const { postId } = req.params;
      const userId = req.user.id;
      const { content, parentCommentId } = req.body;

      if (!mongoose.Types.ObjectId.isValid(postId)) {
        throw new ValidationError('Invalid post ID');
      }

      const post = await CommunityPost.findById(postId);
      if (!post) {
        throw new NotFoundError('Post not found', createErrorContext(req));
      }

      if (!post.allowComments) {
        throw new ValidationError('Comments are not allowed on this post', {
          comments: ['Comments are disabled for this post'],
        }, createErrorContext(req));
      }

      const comment = {
        _id: new mongoose.Types.ObjectId(),
        author: new mongoose.Types.ObjectId(userId),
        content,
        parentComment: parentCommentId ? new mongoose.Types.ObjectId(parentCommentId) : undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        likes: [],
        isDeleted: false,
      };

      post.comments.push(comment as any);
      post.stats.comments = post.comments.filter(c => !c.isDeleted).length;
      await post.save();

      // Populate the new comment for response
      const populatedPost = await CommunityPost.findById(postId)
        .populate({
          path: 'comments',
          populate: {
            path: 'author',
            select: 'firstName lastName profileImage reputation',
          },
          match: { _id: comment._id },
        });

      const newComment = populatedPost?.comments.find(c => c._id.toString() === comment._id.toString());

      logger.info('Comment added to post', {
        postId,
        commentId: comment._id.toString(),
        userId,
        isReply: !!parentCommentId,
        requestId: (req as any).id,
      });

      const response: ApiResponse<CommentResponse> = {
        success: true,
        message: 'Comment added successfully',
        data: newComment?.toObject() as CommentResponse,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  public updateComment: UpdateCommentController = async (req, res, next) => {
    try {
      const { postId, commentId } = req.params;
      const userId = req.user.id;
      const { content } = req.body;

      if (!mongoose.Types.ObjectId.isValid(postId) || !mongoose.Types.ObjectId.isValid(commentId)) {
        throw new ValidationError('Invalid post ID or comment ID');
      }

      const post = await CommunityPost.findById(postId);
      if (!post) {
        throw new NotFoundError('Post not found', createErrorContext(req));
      }

      const comment = post.comments.id(commentId);
      if (!comment) {
        throw new NotFoundError('Comment not found', createErrorContext(req));
      }

      // Check ownership
      if (comment.author.toString() !== userId) {
        throw new AuthorizationError('You can only edit your own comments', createErrorContext(req));
      }

      comment.content = content;
      comment.updatedAt = new Date();
      comment.isEdited = true;
      await post.save();

      logger.info('Comment updated', {
        postId,
        commentId,
        userId,
        requestId: (req as any).id,
      });

      const response: ApiResponse<{}> = {
        success: true,
        message: 'Comment updated successfully',
        data: {},
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public deleteComment: DeleteCommentController = async (req, res, next) => {
    try {
      const { postId, commentId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      if (!mongoose.Types.ObjectId.isValid(postId) || !mongoose.Types.ObjectId.isValid(commentId)) {
        throw new ValidationError('Invalid post ID or comment ID');
      }

      const post = await CommunityPost.findById(postId);
      if (!post) {
        throw new NotFoundError('Post not found', createErrorContext(req));
      }

      const comment = post.comments.id(commentId);
      if (!comment) {
        throw new NotFoundError('Comment not found', createErrorContext(req));
      }

      // Check permissions
      if (comment.author.toString() !== userId && userRole !== 'admin') {
        throw new AuthorizationError('You can only delete your own comments', createErrorContext(req));
      }

      // Soft delete
      comment.isDeleted = true;
      comment.deletedAt = new Date();
      post.stats.comments = post.comments.filter(c => !c.isDeleted).length;
      await post.save();

      logger.info('Comment deleted', {
        postId,
        commentId,
        userId,
        deletedBy: userRole === 'admin' ? 'admin' : 'author',
        requestId: (req as any).id,
      });

      const response: ApiResponse<{}> = {
        success: true,
        message: 'Comment deleted successfully',
        data: {},
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public reportPost: ReportPostController = async (req, res, next) => {
    try {
      const { postId } = req.params;
      const userId = req.user.id;
      const { reason, description } = req.body;

      if (!mongoose.Types.ObjectId.isValid(postId)) {
        throw new ValidationError('Invalid post ID');
      }

      const post = await CommunityPost.findById(postId);
      if (!post) {
        throw new NotFoundError('Post not found', createErrorContext(req));
      }

      // Check if user already reported this post
      const existingReport = post.reports.find(report => 
        report.reportedBy.toString() === userId
      );

      if (existingReport) {
        throw new ValidationError('Post already reported', {
          report: ['You have already reported this post'],
        }, createErrorContext(req));
      }

      // Add report
      post.reports.push({
        reportedBy: new mongoose.Types.ObjectId(userId),
        reason,
        description,
        reportedAt: new Date(),
      } as any);

      await post.save();

      logger.info('Post reported', {
        postId,
        userId,
        reason,
        totalReports: post.reports.length,
        requestId: (req as any).id,
      });

      const response: ApiResponse<{}> = {
        success: true,
        message: 'Post reported successfully',
        data: {},
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public searchPosts: SearchPostsController = async (req, res, next) => {
    try {
      const {
        q,
        type,
        category,
        tags,
        author,
        cropId,
        diseaseId,
        startDate,
        endDate,
        page = '1',
        limit = '10',
        sortBy = 'relevance',
        sortOrder = 'desc',
      } = req.query;

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      // Build search query
      const searchQuery: any = {
        status: 'published',
      };

      if (q) {
        searchQuery.$or = [
          { title: new RegExp(q as string, 'i') },
          { content: new RegExp(q as string, 'i') },
          { tags: { $in: [new RegExp(q as string, 'i')] } },
        ];
      }

      if (type) searchQuery.type = type;
      if (category) searchQuery.category = category;
      if (tags) {
        const tagArray = typeof tags === 'string' ? tags.split(',') : tags;
        searchQuery.tags = { $in: tagArray };
      }
      if (author) searchQuery.author = author;
      if (cropId) searchQuery.crop = cropId;
      if (diseaseId) searchQuery.disease = diseaseId;

      if (startDate || endDate) {
        searchQuery.createdAt = {};
        if (startDate) searchQuery.createdAt.$gte = new Date(startDate as string);
        if (endDate) searchQuery.createdAt.$lte = new Date(endDate as string);
      }

      // Build sort object
      const sortObj: any = {};
      if (sortBy === 'relevance' && q) {
        // MongoDB text search score would be used here
        sortObj.score = { $meta: 'textScore' };
      } else {
        sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;
      }

      // Execute search
      const [posts, total] = await Promise.all([
        CommunityPost.find(searchQuery)
          .populate('author', 'firstName lastName profileImage reputation')
          .populate('crop', 'name scientificName category')
          .populate('disease', 'name severity type')
          .select('-comments')
          .sort(sortObj)
          .skip(skip)
          .limit(limitNum),
        CommunityPost.countDocuments(searchQuery),
      ]);

      const pagination: PaginationResponse = {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPreviousPage: pageNum > 1,
      };

      logger.info('Posts searched', {
        query: q,
        filters: { type, category, tags, author, cropId, diseaseId },
        resultCount: posts.length,
        requestId: (req as any).id,
      });

      const response: ApiResponse<PostResponse[]> = {
        success: true,
        message: 'Search completed successfully',
        data: posts.map(post => post.toObject()) as PostResponse[],
      };

      res.json({ ...response, pagination });
    } catch (error) {
      next(error);
    }
  };

  public getTrendingPosts: GetTrendingPostsController = async (req, res, next) => {
    try {
      const { limit = '10', period = '7d' } = req.query;
      const limitNum = parseInt(limit, 10);

      // Calculate date range
      let startDate: Date;
      switch (period) {
        case '24h':
          startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      }

      // Get trending posts based on engagement
      const trendingPosts = await CommunityPost.aggregate([
        {
          $match: {
            status: 'published',
            createdAt: { $gte: startDate },
          }
        },
        {
          $addFields: {
            engagementScore: {
              $add: [
                { $multiply: ['$stats.likes', 2] }, // Likes worth 2 points
                { $multiply: ['$stats.comments', 3] }, // Comments worth 3 points
                { $multiply: ['$stats.shares', 4] }, // Shares worth 4 points
                { $divide: ['$stats.views', 10] }, // Views worth 0.1 points
              ]
            }
          }
        },
        {
          $sort: {
            engagementScore: -1,
            createdAt: -1,
          }
        },
        { $limit: limitNum }
      ]);

      // Populate the aggregated results
      const populatedPosts = await CommunityPost.populate(trendingPosts, [
        { path: 'author', select: 'firstName lastName profileImage reputation' },
        { path: 'crop', select: 'name scientificName category' },
        { path: 'disease', select: 'name severity type' },
      ]);

      logger.info('Trending posts retrieved', {
        userId: req.user?.id || 'anonymous',
        period,
        count: populatedPosts.length,
        requestId: (req as any).id,
      });

      const response: ApiResponse<PostResponse[]> = {
        success: true,
        message: 'Trending posts retrieved successfully',
        data: populatedPosts as PostResponse[],
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public getUserPosts: GetUserPostsController = async (req, res, next) => {
    try {
      const { userId } = req.params;
      const {
        page = '1',
        limit = '10',
        type,
        status = 'published',
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const requestingUserId = req.user?.id;
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      // Build filter query
      const filterQuery: any = {
        author: userId,
      };

      // Only show published posts unless user is viewing their own posts
      if (userId !== requestingUserId) {
        filterQuery.status = 'published';
      } else if (status) {
        filterQuery.status = status;
      }

      if (type) filterQuery.type = type;

      // Build sort object
      const sortObj: any = {};
      sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Execute query
      const [posts, total] = await Promise.all([
        CommunityPost.find(filterQuery)
          .populate('author', 'firstName lastName profileImage reputation')
          .populate('crop', 'name scientificName category')
          .populate('disease', 'name severity type')
          .select('-comments')
          .sort(sortObj)
          .skip(skip)
          .limit(limitNum),
        CommunityPost.countDocuments(filterQuery),
      ]);

      const pagination: PaginationResponse = {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPreviousPage: pageNum > 1,
      };

      logger.info('User posts retrieved', {
        targetUserId: userId,
        requestingUserId: requestingUserId || 'anonymous',
        count: posts.length,
        requestId: (req as any).id,
      });

      const response: ApiResponse<PostResponse[]> = {
        success: true,
        message: 'User posts retrieved successfully',
        data: posts.map(post => post.toObject()) as PostResponse[],
      };

      res.json({ ...response, pagination });
    } catch (error) {
      next(error);
    }
  };

  public getPostStats: GetPostStatsController = async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const { period = '30d' } = req.query;

      // Calculate date range
      let startDate: Date;
      switch (period) {
        case '7d':
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '1y':
          startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      }

      const baseMatch = userId ? { createdAt: { $gte: startDate } } : { 
        status: 'published',
        createdAt: { $gte: startDate }
      };

      if (userId) {
        baseMatch['author'] = new mongoose.Types.ObjectId(userId);
      }

      // Get general stats
      const generalStats = await CommunityPost.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: null,
            totalPosts: { $sum: 1 },
            totalLikes: { $sum: '$stats.likes' },
            totalComments: { $sum: '$stats.comments' },
            totalViews: { $sum: '$stats.views' },
            totalShares: { $sum: '$stats.shares' },
            avgLikes: { $avg: '$stats.likes' },
            avgComments: { $avg: '$stats.comments' },
            avgViews: { $avg: '$stats.views' },
          }
        }
      ]);

      // Get stats by type
      const typeStats = await CommunityPost.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            avgLikes: { $avg: '$stats.likes' },
            avgComments: { $avg: '$stats.comments' },
          }
        },
        { $sort: { count: -1 } }
      ]);

      // Get stats by category
      const categoryStats = await CommunityPost.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            avgLikes: { $avg: '$stats.likes' },
            avgComments: { $avg: '$stats.comments' },
          }
        },
        { $sort: { count: -1 } }
      ]);

      const stats: PostStatsResponse = {
        period: period as string,
        overview: generalStats[0] || {
          totalPosts: 0,
          totalLikes: 0,
          totalComments: 0,
          totalViews: 0,
          totalShares: 0,
          avgLikes: 0,
          avgComments: 0,
          avgViews: 0,
        },
        byType: typeStats,
        byCategory: categoryStats,
        isPersonal: !!userId,
      };

      logger.info('Post statistics retrieved', {
        userId: userId || 'global',
        period,
        totalPosts: stats.overview.totalPosts,
        requestId: (req as any).id,
      });

      const response: ApiResponse<PostStatsResponse> = {
        success: true,
        message: 'Post statistics retrieved successfully',
        data: stats,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };
}

export default new CommunityController();