import type { Document, Model } from 'mongoose';
import type { 
  CommunityPost,
  Comment,
  DatabaseId,
  LanguageCode,
  LocationData,
  FileUpload 
} from '@/types';

export interface ICommunityPost extends Document {
  authorId: DatabaseId;
  title: string;
  content: string;
  type: 'question' | 'tip' | 'success_story' | 'discussion' | 'alert' | 'resource';
  category: 'general' | 'pest_control' | 'disease_management' | 'crop_care' | 'harvesting' | 'marketing' | 'tools' | 'weather' | 'seeds' | 'fertilizers';
  tags: string[];
  language: LanguageCode;
  images?: FileUpload[];
  videos?: FileUpload[];
  location?: LocationData;
  crops?: DatabaseId[];
  isAnonymous: boolean;
  isPinned: boolean;
  isFeatured: boolean;
  visibility: 'public' | 'followers' | 'experts_only';
  status: 'draft' | 'published' | 'under_review' | 'rejected' | 'archived';
  engagement: {
    views: number;
    likes: number;
    dislikes: number;
    shares: number;
    comments: number;
    saves: number;
  };
  isDeleted: boolean;
  publishedAt?: Date;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  addLike(userId: DatabaseId): Promise<void>;
  removeLike(userId: DatabaseId): Promise<void>;
  addView(userId?: DatabaseId, ipAddress?: string): Promise<void>;
  addComment(comment: Partial<Comment>): Promise<void>;
  updateEngagement(): Promise<void>;
  pin(): Promise<void>;
  unpin(): Promise<void>;
  feature(): Promise<void>;
  unfeature(): Promise<void>;
}

export interface ICommunityPostModel extends Model<ICommunityPost> {
  findByAuthor(authorId: DatabaseId): Promise<ICommunityPost[]>;
  findByCategory(category: ICommunityPost['category']): Promise<ICommunityPost[]>;
  findByTag(tag: string): Promise<ICommunityPost[]>;
  findTrending(timeframe: '24h' | '7d' | '30d'): Promise<ICommunityPost[]>;
  findFeatured(): Promise<ICommunityPost[]>;
  searchContent(query: string, language?: LanguageCode): Promise<ICommunityPost[]>;
  findNearby(location: LocationData, radius: number): Promise<ICommunityPost[]>;
}