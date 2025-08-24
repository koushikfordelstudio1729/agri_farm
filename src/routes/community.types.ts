import { Request, Response } from 'express';
import { 
  CreatePostRequest,
  UpdatePostRequest,
  PostResponse,
  CommentRequest,
  CommentResponse,
  PostReportRequest,
  ModerationRequest,
  CommunitySearchRequest,
  CommunitySettingsRequest
} from '@/controllers/communityController.types';

// Route parameter types
export interface PostParamsWithId {
  postId: string;
}

export interface CommentParamsWithId {
  commentId: string;
}

export interface UserParamsWithId {
  userId: string;
}

export interface ModerationParams {
  contentType: 'post' | 'comment';
  contentId: string;
}

// Query parameter types
export interface GetPostsQuery {
  page?: string;
  limit?: string;
  type?: 'question' | 'tip' | 'success_story' | 'news' | 'discussion';
  category?: string;
  tag?: string;
  author?: string;
  sortBy?: 'recent' | 'popular' | 'trending' | 'relevant';
  location?: string;
  radius?: string;
}

export interface GetCommentsQuery {
  page?: string;
  limit?: string;
  sortBy?: 'newest' | 'oldest' | 'popular';
}

export interface GetUserPostsQuery {
  page?: string;
  limit?: string;
  type?: 'question' | 'tip' | 'success_story' | 'news' | 'discussion';
}

export interface GetFollowersQuery {
  page?: string;
  limit?: string;
}

export interface GetTrendingQuery {
  period?: 'today' | 'week' | 'month';
  category?: string;
  limit?: string;
}

export interface CommunitySearchQuery {
  q: string;
  type?: 'posts' | 'users' | 'all';
  category?: string;
  location?: string;
  radius?: string;
  page?: string;
  limit?: string;
}

export interface GetRecommendationsQuery {
  limit?: string;
}

export interface GetFeedQuery {
  page?: string;
  limit?: string;
  includeFollowing?: string;
  includeRecommended?: string;
}

export interface GetFlaggedContentQuery {
  type?: 'posts' | 'comments';
  page?: string;
  limit?: string;
  sortBy?: 'newest' | 'oldest' | 'most_reported';
}

export interface GetAnalyticsQuery {
  period?: 'day' | 'week' | 'month' | 'year';
  startDate?: string;
  endDate?: string;
}

// Express request types
export interface CreatePostRequestHandler extends Request<{}, PostResponse, CreatePostRequest> {}
export interface UpdatePostRequestHandler extends Request<PostParamsWithId, PostResponse, UpdatePostRequest> {}
export interface GetPostRequestHandler extends Request<PostParamsWithId, PostResponse> {}
export interface GetPostsRequestHandler extends Request<{}, PostResponse[], {}, GetPostsQuery> {}

export interface AddCommentRequestHandler extends Request<PostParamsWithId, CommentResponse, CommentRequest> {}
export interface UpdateCommentRequestHandler extends Request<CommentParamsWithId, CommentResponse, Partial<CommentRequest>> {}
export interface GetCommentsRequestHandler extends Request<PostParamsWithId, CommentResponse[], {}, GetCommentsQuery> {}

export interface LikePostRequestHandler extends Request<PostParamsWithId, any> {}
export interface LikeCommentRequestHandler extends Request<CommentParamsWithId, any> {}

export interface SharePostRequestHandler extends Request<PostParamsWithId, any, { platform?: string; message?: string }> {}
export interface ReportPostRequestHandler extends Request<PostParamsWithId, any, PostReportRequest> {}

export interface FollowUserRequestHandler extends Request<UserParamsWithId, any> {}
export interface GetUserPostsRequestHandler extends Request<UserParamsWithId, PostResponse[], {}, GetUserPostsQuery> {}
export interface GetUserFollowersRequestHandler extends Request<UserParamsWithId, any[], {}, GetFollowersQuery> {}

export interface GetTrendingPostsRequestHandler extends Request<{}, PostResponse[], {}, GetTrendingQuery> {}
export interface SearchCommunityRequestHandler extends Request<{}, any, {}, CommunitySearchQuery> {}
export interface GetRecommendedPostsRequestHandler extends Request<{}, PostResponse[], {}, GetRecommendationsQuery> {}
export interface GetUserFeedRequestHandler extends Request<{}, PostResponse[], {}, GetFeedQuery> {}

export interface GetFlaggedContentRequestHandler extends Request<{}, any[], {}, GetFlaggedContentQuery> {}
export interface ModerateContentRequestHandler extends Request<ModerationParams, any, ModerationRequest> {}

export interface GetCommunityAnalyticsRequestHandler extends Request<{}, any, {}, GetAnalyticsQuery> {}
export interface UpdateCommunitySettingsRequestHandler extends Request<{}, any, CommunitySettingsRequest> {}

// Response types with Express
export interface PostResponseHandler extends Response<PostResponse> {}
export interface PostsListResponseHandler extends Response<PostResponse[]> {}
export interface CommentResponseHandler extends Response<CommentResponse> {}
export interface CommentsListResponseHandler extends Response<CommentResponse[]> {}
export interface CommunityActionResponseHandler extends Response<any> {}