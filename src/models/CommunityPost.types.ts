import { Document } from 'mongoose';
import { DatabaseId } from '@/types/common.types';

export interface ICommunityPost extends Document {
  _id: DatabaseId;
  author: DatabaseId;
  type: 'question' | 'discussion' | 'showcase' | 'news' | 'advice' | 'tip' | 'experience';
  category: 'crop_management' | 'disease_control' | 'pest_management' | 'soil_health' | 'weather' | 'market' | 'technology' | 'general';
  
  // Content
  title: string;
  content: string;
  summary?: string;
  
  // Media attachments
  images: {
    url: string;
    thumbnailUrl?: string;
    caption?: string;
    metadata?: {
      size: number;
      format: string;
      width: number;
      height: number;
    };
  }[];
  
  videos: {
    url: string;
    thumbnailUrl?: string;
    title?: string;
    duration?: number;
    metadata?: {
      size: number;
      format: string;
      width: number;
      height: number;
    };
  }[];
  
  documents: {
    url: string;
    filename: string;
    type: string;
    size: number;
  }[];
  
  // Categorization and tagging
  tags: string[];
  crops?: DatabaseId[];
  diseases?: DatabaseId[];
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
    region?: string;
  };
  
  // Engagement metrics
  engagement: {
    views: number;
    likes: number;
    dislikes: number;
    shares: number;
    bookmarks: number;
    comments: number;
    lastEngagementAt?: Date;
  };
  
  // User interactions
  likedBy: DatabaseId[];
  dislikedBy: DatabaseId[];
  sharedBy: {
    userId: DatabaseId;
    sharedAt: Date;
    platform?: string;
  }[];
  bookmarkedBy: DatabaseId[];
  
  // Comments and replies
  comments: {
    _id: DatabaseId;
    author: DatabaseId;
    content: string;
    parentId?: DatabaseId; // for nested replies
    images?: string[];
    likes: number;
    dislikes: number;
    likedBy: DatabaseId[];
    dislikedBy: DatabaseId[];
    isEdited: boolean;
    editHistory?: {
      content: string;
      editedAt: Date;
    }[];
    reports: {
      reportedBy: DatabaseId;
      reason: string;
      reportedAt: Date;
    }[];
    status: 'active' | 'hidden' | 'deleted';
    createdAt: Date;
    updatedAt: Date;
  }[];
  
  // Question-specific fields (for type: 'question')
  questionData?: {
    isResolved: boolean;
    resolvedAt?: Date;
    bestAnswerId?: DatabaseId;
    bounty?: {
      amount: number;
      currency: string;
      offeredBy: DatabaseId;
      claimedBy?: DatabaseId;
      claimedAt?: Date;
    };
    urgency: 'low' | 'medium' | 'high' | 'urgent';
    difficultyLevel?: 'beginner' | 'intermediate' | 'expert';
  };
  
  // Expert verification
  expertVerification?: {
    isVerified: boolean;
    verifiedBy: DatabaseId;
    verifiedAt: Date;
    verificationNote?: string;
    accuracy: number; // 1-10 scale
  };
  
  // Content moderation
  moderation: {
    status: 'pending' | 'approved' | 'rejected' | 'flagged';
    reviewedBy?: DatabaseId;
    reviewedAt?: Date;
    reason?: string;
    autoModerated: boolean;
    confidenceScore?: number;
    flags: {
      type: 'spam' | 'inappropriate' | 'misleading' | 'off_topic' | 'duplicate';
      reportedBy: DatabaseId;
      reportedAt: Date;
      reason?: string;
    }[];
  };
  
  // SEO and discoverability
  seo: {
    slug: string;
    metaDescription?: string;
    keywords: string[];
    readingTime?: number; // minutes
  };
  
  // Scheduling and publishing
  publishing: {
    status: 'draft' | 'scheduled' | 'published' | 'archived';
    publishedAt?: Date;
    scheduledFor?: Date;
    archivedAt?: Date;
    featuredUntil?: Date;
    isFeatured: boolean;
    isPinned: boolean;
  };
  
  // Analytics
  analytics: {
    clickThroughRate?: number;
    engagementRate?: number;
    averageReadTime?: number;
    bounceRate?: number;
    conversionEvents?: {
      type: string;
      count: number;
      lastOccurred: Date;
    }[];
  };
  
  // Related content
  relatedPosts?: DatabaseId[];
  followUpPosts?: DatabaseId[];
  
  // Language and localization
  language: string;
  translations?: {
    language: string;
    title: string;
    content: string;
    summary?: string;
    translatedBy: 'auto' | 'human';
    translatedAt: Date;
  }[];
  
  // Edit history
  editHistory: {
    editedBy: DatabaseId;
    editedAt: Date;
    changes: {
      field: string;
      oldValue: string;
      newValue: string;
    }[];
    reason?: string;
  }[];
  
  // Visibility and permissions
  visibility: 'public' | 'private' | 'followers' | 'friends';
  permissions: {
    canComment: 'everyone' | 'followers' | 'friends' | 'no_one';
    canShare: 'everyone' | 'followers' | 'friends' | 'no_one';
    canBookmark: 'everyone' | 'followers' | 'friends' | 'no_one';
  };
  
  // Metadata
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICommunityPostMethods {
  addLike(userId: DatabaseId): Promise<void>;
  removeLike(userId: DatabaseId): Promise<void>;
  addDislike(userId: DatabaseId): Promise<void>;
  removeDislike(userId: DatabaseId): Promise<void>;
  addComment(comment: Partial<ICommunityPost['comments'][0]>): Promise<DatabaseId>;
  removeComment(commentId: DatabaseId): Promise<void>;
  addBookmark(userId: DatabaseId): Promise<void>;
  removeBookmark(userId: DatabaseId): Promise<void>;
  incrementViews(): Promise<void>;
  addShare(userId: DatabaseId, platform?: string): Promise<void>;
  markAsResolved(bestAnswerId?: DatabaseId): Promise<void>;
  addExpertVerification(expertId: DatabaseId, accuracy: number, note?: string): Promise<void>;
  flagContent(reportedBy: DatabaseId, type: ICommunityPost['moderation']['flags'][0]['type'], reason?: string): Promise<void>;
  moderate(status: ICommunityPost['moderation']['status'], reviewerId: DatabaseId, reason?: string): Promise<void>;
  feature(until?: Date): Promise<void>;
  pin(): Promise<void>;
  unpin(): Promise<void>;
  archive(): Promise<void>;
  calculateEngagementRate(): number;
  getReadingTime(): number;
  generateSlug(): string;
}

export interface ICommunityPostStatics {
  findByAuthor(authorId: DatabaseId, options?: PostQueryOptions): Promise<ICommunityPost[]>;
  findByType(type: ICommunityPost['type'], options?: PostQueryOptions): Promise<ICommunityPost[]>;
  findByCategory(category: ICommunityPost['category'], options?: PostQueryOptions): Promise<ICommunityPost[]>;
  findByTags(tags: string[], options?: PostQueryOptions): Promise<ICommunityPost[]>;
  findTrending(timeframe?: 'day' | 'week' | 'month'): Promise<ICommunityPost[]>;
  findFeatured(limit?: number): Promise<ICommunityPost[]>;
  findByLocation(latitude: number, longitude: number, radiusKm?: number): Promise<ICommunityPost[]>;
  search(query: string, options?: PostSearchOptions): Promise<ICommunityPost[]>;
  getPopularTags(limit?: number): Promise<{ tag: string; count: number }[]>;
  getCommunityStats(): Promise<{
    totalPosts: number;
    activePosts: number;
    totalComments: number;
    totalLikes: number;
    postsByType: Record<string, number>;
    postsByCategory: Record<string, number>;
    engagementRate: number;
  }>;
  findUnansweredQuestions(options?: PostQueryOptions): Promise<ICommunityPost[]>;
  findExpertVerified(options?: PostQueryOptions): Promise<ICommunityPost[]>;
  cleanup(inactiveDays: number): Promise<number>;
}

export interface PostQueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'views' | 'likes' | 'comments';
  sortOrder?: 'asc' | 'desc';
  dateRange?: { from: Date; to: Date };
  includeArchived?: boolean;
  status?: ICommunityPost['publishing']['status'];
}

export interface PostSearchOptions extends PostQueryOptions {
  type?: ICommunityPost['type'];
  category?: ICommunityPost['category'];
  tags?: string[];
  hasImages?: boolean;
  hasVideos?: boolean;
  isResolved?: boolean;
  isExpertVerified?: boolean;
  minEngagement?: number;
}

export interface CreateCommunityPostData {
  author: DatabaseId;
  type: ICommunityPost['type'];
  category: ICommunityPost['category'];
  title: string;
  content: string;
  summary?: string;
  images?: ICommunityPost['images'];
  videos?: ICommunityPost['videos'];
  documents?: ICommunityPost['documents'];
  tags?: string[];
  crops?: DatabaseId[];
  diseases?: DatabaseId[];
  location?: ICommunityPost['location'];
  questionData?: ICommunityPost['questionData'];
  visibility?: ICommunityPost['visibility'];
  permissions?: ICommunityPost['permissions'];
  language?: string;
}

export interface UpdateCommunityPostData {
  title?: string;
  content?: string;
  summary?: string;
  tags?: string[];
  category?: ICommunityPost['category'];
  visibility?: ICommunityPost['visibility'];
  permissions?: ICommunityPost['permissions'];
}