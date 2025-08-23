import type { 
  DatabaseId, 
  BaseDocument, 
  SoftDeleteDocument,
  LanguageCode,
  FileUpload,
  LocationData,
  Rating 
} from './common.types';

export interface CommunityPost extends SoftDeleteDocument {
  id: DatabaseId;
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
  moderationFlags: {
    flaggedBy: DatabaseId;
    reason: 'spam' | 'inappropriate' | 'misinformation' | 'harassment' | 'copyright' | 'other';
    description?: string;
    flaggedAt: Date;
    reviewed: boolean;
    reviewedBy?: DatabaseId;
    reviewedAt?: Date;
    action?: 'approved' | 'removed' | 'edited';
  }[];
  engagement: {
    views: number;
    likes: number;
    dislikes: number;
    shares: number;
    comments: number;
    saves: number;
  };
  seoData?: {
    slug: string;
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
  };
  scheduledAt?: Date;
  publishedAt?: Date;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Comment extends SoftDeleteDocument {
  id: DatabaseId;
  postId: DatabaseId;
  parentId?: DatabaseId;
  authorId: DatabaseId;
  content: string;
  images?: FileUpload[];
  isAnonymous: boolean;
  isExpertAnswer: boolean;
  isAcceptedAnswer: boolean;
  isModerator: boolean;
  engagement: {
    likes: number;
    dislikes: number;
    replies: number;
  };
  moderationFlags: {
    flaggedBy: DatabaseId;
    reason: 'spam' | 'inappropriate' | 'misinformation' | 'harassment' | 'other';
    description?: string;
    flaggedAt: Date;
  }[];
  mentions: {
    userId: DatabaseId;
    username: string;
  }[];
  editHistory: {
    content: string;
    editedAt: Date;
    reason?: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PostLike {
  id: DatabaseId;
  postId?: DatabaseId;
  commentId?: DatabaseId;
  userId: DatabaseId;
  type: 'like' | 'dislike';
  createdAt: Date;
}

export interface PostSave {
  id: DatabaseId;
  postId: DatabaseId;
  userId: DatabaseId;
  collection?: string;
  createdAt: Date;
}

export interface PostShare {
  id: DatabaseId;
  postId: DatabaseId;
  userId: DatabaseId;
  platform: 'facebook' | 'twitter' | 'whatsapp' | 'telegram' | 'email' | 'link';
  sharedAt: Date;
}

export interface PostView {
  id: DatabaseId;
  postId: DatabaseId;
  userId?: DatabaseId;
  ipAddress: string;
  userAgent: string;
  duration?: number;
  source: 'feed' | 'search' | 'profile' | 'direct' | 'notification';
  viewedAt: Date;
}

export interface Follow {
  id: DatabaseId;
  followerId: DatabaseId;
  followingId: DatabaseId;
  type: 'user' | 'expert' | 'topic' | 'crop';
  notifications: {
    posts: boolean;
    comments: boolean;
    mentions: boolean;
  };
  createdAt: Date;
}

export interface CommunityGroup {
  id: DatabaseId;
  name: string;
  description: string;
  type: 'public' | 'private' | 'invite_only';
  category: string;
  tags: string[];
  coverImage?: string;
  icon?: string;
  location?: LocationData;
  crops?: DatabaseId[];
  languages: LanguageCode[];
  rules: string[];
  guidelines: string[];
  moderators: DatabaseId[];
  adminId: DatabaseId;
  stats: {
    members: number;
    posts: number;
    activeMembers: number;
    growth: number;
  };
  settings: {
    requireApproval: boolean;
    allowGuestView: boolean;
    allowLinks: boolean;
    allowImages: boolean;
    allowPolls: boolean;
    autoModeration: boolean;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupMembership {
  id: DatabaseId;
  groupId: DatabaseId;
  userId: DatabaseId;
  role: 'member' | 'moderator' | 'admin';
  status: 'active' | 'banned' | 'left' | 'pending';
  permissions: {
    post: boolean;
    comment: boolean;
    moderate: boolean;
    invite: boolean;
  };
  joinedAt: Date;
  lastActiveAt?: Date;
}

export interface Poll {
  id: DatabaseId;
  postId: DatabaseId;
  question: string;
  options: {
    id: string;
    text: string;
    votes: number;
    percentage: number;
  }[];
  settings: {
    multipleChoice: boolean;
    anonymous: boolean;
    showResults: 'always' | 'after_vote' | 'after_end';
  };
  expiresAt?: Date;
  isActive: boolean;
  totalVotes: number;
  createdAt: Date;
}

export interface PollVote {
  id: DatabaseId;
  pollId: DatabaseId;
  userId: DatabaseId;
  optionIds: string[];
  votedAt: Date;
}

export interface Mention {
  id: DatabaseId;
  postId?: DatabaseId;
  commentId?: DatabaseId;
  mentionedUserId: DatabaseId;
  mentionedByUserId: DatabaseId;
  type: 'user' | 'expert';
  isRead: boolean;
  createdAt: Date;
}

export interface CommunityNotification {
  id: DatabaseId;
  recipientId: DatabaseId;
  senderId?: DatabaseId;
  type: 'like' | 'comment' | 'mention' | 'follow' | 'post_approved' | 'post_featured' | 'expert_answer' | 'group_invite';
  title: string;
  message: string;
  data: {
    postId?: DatabaseId;
    commentId?: DatabaseId;
    groupId?: DatabaseId;
    userId?: DatabaseId;
    url?: string;
  };
  isRead: boolean;
  isArchived: boolean;
  readAt?: Date;
  createdAt: Date;
}

export interface TopicTrending {
  id: DatabaseId;
  topic: string;
  type: 'hashtag' | 'crop' | 'disease' | 'keyword';
  score: number;
  postCount: number;
  engagementCount: number;
  period: '1h' | '24h' | '7d' | '30d';
  region?: string;
  language?: LanguageCode;
  calculatedAt: Date;
}

export interface UserReputation {
  id: DatabaseId;
  userId: DatabaseId;
  category: 'general' | 'pest_control' | 'disease_management' | 'crop_care' | 'harvesting' | 'marketing';
  points: number;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'master';
  badges: {
    badgeId: string;
    name: string;
    description: string;
    iconUrl: string;
    earnedAt: Date;
  }[];
  statistics: {
    postsCreated: number;
    helpfulAnswers: number;
    likesReceived: number;
    bestAnswers: number;
    moderationActions: number;
  };
  updatedAt: Date;
}

export interface CommunityEvent {
  id: DatabaseId;
  title: string;
  description: string;
  type: 'webinar' | 'workshop' | 'field_day' | 'conference' | 'meetup' | 'training';
  organizer: {
    type: 'user' | 'organization' | 'expert' | 'admin';
    id: DatabaseId;
    name: string;
  };
  speakers?: {
    name: string;
    title: string;
    bio: string;
    image?: string;
  }[];
  location?: {
    type: 'online' | 'offline' | 'hybrid';
    address?: string;
    coordinates?: { latitude: number; longitude: number };
    meetingLink?: string;
    platform?: string;
  };
  schedule: {
    startDate: Date;
    endDate: Date;
    timezone: string;
    agenda?: {
      time: string;
      title: string;
      speaker?: string;
      duration: number;
    }[];
  };
  registration: {
    required: boolean;
    fee?: {
      amount: number;
      currency: string;
    };
    maxAttendees?: number;
    currentAttendees: number;
    registrationDeadline?: Date;
  };
  tags: string[];
  targetAudience: string[];
  languages: LanguageCode[];
  materials?: {
    presentations: FileUpload[];
    documents: FileUpload[];
    recordings: FileUpload[];
  };
  status: 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled';
  visibility: 'public' | 'members_only' | 'invite_only';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventRegistration {
  id: DatabaseId;
  eventId: DatabaseId;
  userId: DatabaseId;
  status: 'registered' | 'attended' | 'no_show' | 'cancelled';
  registeredAt: Date;
  attendedAt?: Date;
  feedback?: {
    rating: number;
    comment: string;
    submittedAt: Date;
  };
}

export interface CreatePostRequest {
  title: string;
  content: string;
  type: CommunityPost['type'];
  category: CommunityPost['category'];
  tags?: string[];
  crops?: DatabaseId[];
  images?: Express.Multer.File[];
  isAnonymous?: boolean;
  visibility?: CommunityPost['visibility'];
  location?: LocationData;
  scheduledAt?: Date;
}

export interface UpdatePostRequest {
  title?: string;
  content?: string;
  tags?: string[];
  crops?: DatabaseId[];
  visibility?: CommunityPost['visibility'];
}

export interface CreateCommentRequest {
  postId: DatabaseId;
  parentId?: DatabaseId;
  content: string;
  isAnonymous?: boolean;
  images?: Express.Multer.File[];
}

export interface CommunitySearchFilters {
  type?: CommunityPost['type'];
  category?: CommunityPost['category'];
  tags?: string[];
  crops?: DatabaseId[];
  authorId?: DatabaseId;
  language?: LanguageCode;
  location?: {
    country?: string;
    radius?: number;
    coordinates?: { latitude: number; longitude: number };
  };
  dateRange?: {
    start: Date;
    end: Date;
  };
  hasImages?: boolean;
  hasExpertAnswer?: boolean;
  minLikes?: number;
  sortBy?: 'recent' | 'popular' | 'trending' | 'most_liked' | 'most_commented';
}

export interface CommunityStats {
  totalPosts: number;
  totalComments: number;
  totalUsers: number;
  activeUsers: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  engagement: {
    avgLikesPerPost: number;
    avgCommentsPerPost: number;
    avgViewsPerPost: number;
  };
  topCategories: {
    category: string;
    postCount: number;
    percentage: number;
  }[];
  topCrops: {
    cropId: DatabaseId;
    cropName: string;
    postCount: number;
  }[];
  growth: {
    period: string;
    newPosts: number;
    newUsers: number;
    engagement: number;
  }[];
}

export interface ModerationQueue {
  id: DatabaseId;
  contentType: 'post' | 'comment' | 'user' | 'group';
  contentId: DatabaseId;
  reportedBy: DatabaseId[];
  reasons: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'reviewing' | 'resolved' | 'escalated';
  assignedTo?: DatabaseId;
  notes?: string;
  actions: {
    action: 'approved' | 'edited' | 'hidden' | 'removed' | 'banned';
    reason: string;
    performedBy: DatabaseId;
    performedAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}