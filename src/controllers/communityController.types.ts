import type { Request, Response } from 'express';
import type {
  CommunityPostData,
  CommentData,
  PostStats,
  DatabaseId,
  ApiResponse,
  TypedResponse,
  PaginationResponse,
  AuthenticatedUser,
} from '@/types';

// Request interfaces
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

export interface CreatePostRequest extends AuthenticatedRequest {
  body: {
    title: string;
    content: string;
    type: 'question' | 'tip' | 'success_story' | 'discussion' | 'help';
    category: string;
    tags?: string[];
    cropId?: string;
    diseaseId?: string;
    location?: {
      latitude: number;
      longitude: number;
      address?: string;
      city?: string;
      state?: string;
      country?: string;
    };
    isAnonymous?: boolean;
    allowComments?: boolean;
  };
  files?: Express.Multer.File[];
}

export interface GetPostRequest extends AuthenticatedRequest {
  params: {
    postId: string;
  };
}

export interface UpdatePostRequest extends AuthenticatedRequest {
  params: {
    postId: string;
  };
  body: {
    title?: string;
    content?: string;
    category?: string;
    tags?: string[];
    allowComments?: boolean;
    isAnonymous?: boolean;
  };
}

export interface DeletePostRequest extends AuthenticatedRequest {
  params: {
    postId: string;
  };
}

export interface GetPostsRequest extends AuthenticatedRequest {
  query: {
    page?: string;
    limit?: string;
    type?: string;
    category?: string;
    tags?: string | string[];
    cropId?: string;
    diseaseId?: string;
    location?: string; // "lat,lng" format
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };
}

export interface LikePostRequest extends AuthenticatedRequest {
  params: {
    postId: string;
  };
}

export interface UnlikePostRequest extends AuthenticatedRequest {
  params: {
    postId: string;
  };
}

export interface CommentOnPostRequest extends AuthenticatedRequest {
  params: {
    postId: string;
  };
  body: {
    content: string;
    parentCommentId?: string;
  };
}

export interface UpdateCommentRequest extends AuthenticatedRequest {
  params: {
    postId: string;
    commentId: string;
  };
  body: {
    content: string;
  };
}

export interface DeleteCommentRequest extends AuthenticatedRequest {
  params: {
    postId: string;
    commentId: string;
  };
}

export interface ReportPostRequest extends AuthenticatedRequest {
  params: {
    postId: string;
  };
  body: {
    reason: 'spam' | 'inappropriate' | 'harassment' | 'fake_information' | 'copyright' | 'other';
    description?: string;
  };
}

export interface SearchPostsRequest extends AuthenticatedRequest {
  query: {
    q?: string;
    type?: string;
    category?: string;
    tags?: string | string[];
    author?: string;
    cropId?: string;
    diseaseId?: string;
    startDate?: string;
    endDate?: string;
    page?: string;
    limit?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };
}

export interface GetTrendingPostsRequest extends AuthenticatedRequest {
  query: {
    limit?: string;
    period?: '24h' | '7d' | '30d';
  };
}

export interface GetUserPostsRequest extends AuthenticatedRequest {
  params: {
    userId: string;
  };
  query: {
    page?: string;
    limit?: string;
    type?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };
}

export interface GetPostStatsRequest extends AuthenticatedRequest {
  query: {
    period?: '7d' | '30d' | '90d' | '1y';
  };
}

// Response interfaces
export interface PostResponse {
  _id: DatabaseId;
  author: {
    _id: DatabaseId;
    firstName: string;
    lastName: string;
    profileImage?: string;
    reputation: number;
  };
  title: string;
  content: string;
  type: 'question' | 'tip' | 'success_story' | 'discussion' | 'help';
  category: string;
  tags: string[];
  crop?: {
    _id: DatabaseId;
    name: string;
    scientificName: string;
    category: string;
    image?: string;
  };
  disease?: {
    _id: DatabaseId;
    name: string;
    severity: string;
    type: string;
    description: string;
  };
  location?: {
    type: 'Point';
    coordinates: [number, number];
    address?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  images: Array<{
    url: string;
    thumbnailUrl?: string;
    caption?: string;
    metadata: {
      size: number;
      width: number;
      height: number;
      format: string;
    };
  }>;
  isAnonymous: boolean;
  allowComments: boolean;
  status: 'draft' | 'published' | 'hidden' | 'deleted';
  likes: DatabaseId[];
  comments: CommentResponse[];
  reports: Array<{
    reportedBy: DatabaseId;
    reason: string;
    description?: string;
    reportedAt: Date;
  }>;
  stats: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
  };
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  // Additional computed fields
  isLiked?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

export interface CommentResponse {
  _id: DatabaseId;
  author: {
    _id: DatabaseId;
    firstName: string;
    lastName: string;
    profileImage?: string;
    reputation: number;
  };
  content: string;
  parentComment?: DatabaseId;
  replies?: CommentResponse[];
  likes: DatabaseId[];
  isEdited?: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface PostStatsResponse {
  period: string;
  overview: {
    totalPosts: number;
    totalLikes: number;
    totalComments: number;
    totalViews: number;
    totalShares: number;
    avgLikes: number;
    avgComments: number;
    avgViews: number;
  };
  byType: Array<{
    _id: string;
    count: number;
    avgLikes: number;
    avgComments: number;
  }>;
  byCategory: Array<{
    _id: string;
    count: number;
    avgLikes: number;
    avgComments: number;
  }>;
  isPersonal: boolean;
}

// Controller method types
export type CreatePostController = (
  req: CreatePostRequest,
  res: TypedResponse<PostResponse>
) => Promise<void>;

export type GetPostController = (
  req: GetPostRequest,
  res: TypedResponse<PostResponse>
) => Promise<void>;

export type UpdatePostController = (
  req: UpdatePostRequest,
  res: TypedResponse<PostResponse>
) => Promise<void>;

export type DeletePostController = (
  req: DeletePostRequest,
  res: TypedResponse<{}>
) => Promise<void>;

export type GetPostsController = (
  req: GetPostsRequest,
  res: TypedResponse<PostResponse[]>
) => Promise<void>;

export type LikePostController = (
  req: LikePostRequest,
  res: TypedResponse<{ likesCount: number; isLiked: boolean }>
) => Promise<void>;

export type UnlikePostController = (
  req: UnlikePostRequest,
  res: TypedResponse<{ likesCount: number; isLiked: boolean }>
) => Promise<void>;

export type CommentOnPostController = (
  req: CommentOnPostRequest,
  res: TypedResponse<CommentResponse>
) => Promise<void>;

export type UpdateCommentController = (
  req: UpdateCommentRequest,
  res: TypedResponse<{}>
) => Promise<void>;

export type DeleteCommentController = (
  req: DeleteCommentRequest,
  res: TypedResponse<{}>
) => Promise<void>;

export type ReportPostController = (
  req: ReportPostRequest,
  res: TypedResponse<{}>
) => Promise<void>;

export type SearchPostsController = (
  req: SearchPostsRequest,
  res: TypedResponse<PostResponse[]>
) => Promise<void>;

export type GetTrendingPostsController = (
  req: GetTrendingPostsRequest,
  res: TypedResponse<PostResponse[]>
) => Promise<void>;

export type GetUserPostsController = (
  req: GetUserPostsRequest,
  res: TypedResponse<PostResponse[]>
) => Promise<void>;

export type GetPostStatsController = (
  req: GetPostStatsRequest,
  res: TypedResponse<PostStatsResponse>
) => Promise<void>;

// Service response types
export interface PostServiceResult {
  success: boolean;
  post?: PostResponse;
  message?: string;
  error?: string;
}

export interface CommentServiceResult {
  success: boolean;
  comment?: CommentResponse;
  message?: string;
  error?: string;
}

export interface PostSearchResult {
  success: boolean;
  posts: PostResponse[];
  pagination: PaginationResponse;
  message?: string;
  error?: string;
}

// Validation types
export interface PostValidationErrors {
  title?: string[];
  content?: string[];
  type?: string[];
  category?: string[];
  tags?: string[];
  location?: string[];
  images?: string[];
}

export interface CommentValidationErrors {
  content?: string[];
  parentCommentId?: string[];
}