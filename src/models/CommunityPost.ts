import { Schema, model } from 'mongoose';
import { ICommunityPost, ICommunityPostMethods, ICommunityPostStatics } from './CommunityPost.types';

const communityPostSchema = new Schema<ICommunityPost, ICommunityPostStatics, ICommunityPostMethods>({
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['question', 'discussion', 'showcase', 'news', 'advice', 'tip', 'experience'],
    index: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['crop_management', 'disease_control', 'pest_management', 'soil_health', 'weather', 'market', 'technology', 'general'],
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
    index: true,
  },
  content: {
    type: String,
    required: true,
    maxlength: 10000,
  },
  summary: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  images: [{
    url: {
      type: String,
      required: true,
      trim: true,
    },
    thumbnailUrl: {
      type: String,
      trim: true,
    },
    caption: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    metadata: {
      size: { type: Number, min: 0 },
      format: { type: String, trim: true },
      width: { type: Number, min: 0 },
      height: { type: Number, min: 0 },
    },
  }],
  videos: [{
    url: {
      type: String,
      required: true,
      trim: true,
    },
    thumbnailUrl: {
      type: String,
      trim: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    duration: {
      type: Number,
      min: 0,
    },
    metadata: {
      size: { type: Number, min: 0 },
      format: { type: String, trim: true },
      width: { type: Number, min: 0 },
      height: { type: Number, min: 0 },
    },
  }],
  documents: [{
    url: {
      type: String,
      required: true,
      trim: true,
    },
    filename: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    size: {
      type: Number,
      required: true,
      min: 0,
    },
  }],
  tags: [{
    type: String,
    trim: true,
    maxlength: 50,
    index: true,
  }],
  crops: [{
    type: Schema.Types.ObjectId,
    ref: 'Crop',
  }],
  diseases: [{
    type: Schema.Types.ObjectId,
    ref: 'Disease',
  }],
  location: {
    latitude: {
      type: Number,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180,
    },
    address: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    region: {
      type: String,
      trim: true,
      maxlength: 100,
    },
  },
  engagement: {
    views: { type: Number, default: 0, min: 0 },
    likes: { type: Number, default: 0, min: 0 },
    dislikes: { type: Number, default: 0, min: 0 },
    shares: { type: Number, default: 0, min: 0 },
    bookmarks: { type: Number, default: 0, min: 0 },
    comments: { type: Number, default: 0, min: 0 },
    lastEngagementAt: { type: Date },
  },
  likedBy: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  dislikedBy: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  sharedBy: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sharedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    platform: {
      type: String,
      trim: true,
      maxlength: 50,
    },
  }],
  bookmarkedBy: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  comments: [{
    _id: {
      type: Schema.Types.ObjectId,
      auto: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    parentId: {
      type: Schema.Types.ObjectId,
    },
    images: [{
      type: String,
      trim: true,
    }],
    likes: { type: Number, default: 0, min: 0 },
    dislikes: { type: Number, default: 0, min: 0 },
    likedBy: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    dislikedBy: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    isEdited: { type: Boolean, default: false },
    editHistory: [{
      content: { type: String, required: true },
      editedAt: { type: Date, required: true, default: Date.now },
    }],
    reports: [{
      reportedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      reason: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500,
      },
      reportedAt: {
        type: Date,
        required: true,
        default: Date.now,
      },
    }],
    status: {
      type: String,
      enum: ['active', 'hidden', 'deleted'],
      default: 'active',
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  }],
  questionData: {
    isResolved: { type: Boolean, default: false, index: true },
    resolvedAt: { type: Date },
    bestAnswerId: { type: Schema.Types.ObjectId },
    bounty: {
      amount: { type: Number, min: 0 },
      currency: { type: String, trim: true, maxlength: 3 },
      offeredBy: { type: Schema.Types.ObjectId, ref: 'User' },
      claimedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      claimedAt: { type: Date },
    },
    urgency: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    difficultyLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'expert'],
    },
  },
  expertVerification: {
    isVerified: { type: Boolean, default: false, index: true },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },
    verificationNote: { type: String, trim: true, maxlength: 500 },
    accuracy: { type: Number, min: 1, max: 10 },
  },
  moderation: {
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'flagged'],
      default: 'approved',
      index: true,
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reason: { type: String, trim: true, maxlength: 500 },
    autoModerated: { type: Boolean, default: false },
    confidenceScore: { type: Number, min: 0, max: 1 },
    flags: [{
      type: {
        type: String,
        required: true,
        enum: ['spam', 'inappropriate', 'misleading', 'off_topic', 'duplicate'],
      },
      reportedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      reportedAt: {
        type: Date,
        required: true,
        default: Date.now,
      },
      reason: {
        type: String,
        trim: true,
        maxlength: 500,
      },
    }],
  },
  seo: {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 200,
      index: true,
    },
    metaDescription: {
      type: String,
      trim: true,
      maxlength: 160,
    },
    keywords: [{
      type: String,
      trim: true,
      maxlength: 50,
    }],
    readingTime: {
      type: Number,
      min: 0,
    },
  },
  publishing: {
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'published', 'archived'],
      default: 'published',
      index: true,
    },
    publishedAt: { type: Date, index: true },
    scheduledFor: { type: Date },
    archivedAt: { type: Date },
    featuredUntil: { type: Date },
    isFeatured: { type: Boolean, default: false, index: true },
    isPinned: { type: Boolean, default: false, index: true },
  },
  analytics: {
    clickThroughRate: { type: Number, min: 0, max: 1 },
    engagementRate: { type: Number, min: 0, max: 1 },
    averageReadTime: { type: Number, min: 0 },
    bounceRate: { type: Number, min: 0, max: 1 },
    conversionEvents: [{
      type: { type: String, required: true, trim: true },
      count: { type: Number, required: true, min: 0 },
      lastOccurred: { type: Date, required: true },
    }],
  },
  relatedPosts: [{
    type: Schema.Types.ObjectId,
    ref: 'CommunityPost',
  }],
  followUpPosts: [{
    type: Schema.Types.ObjectId,
    ref: 'CommunityPost',
  }],
  language: {
    type: String,
    required: true,
    trim: true,
    maxlength: 10,
    default: 'en',
  },
  translations: [{
    language: { type: String, required: true, trim: true, maxlength: 10 },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, required: true, maxlength: 10000 },
    summary: { type: String, trim: true, maxlength: 500 },
    translatedBy: { type: String, required: true, enum: ['auto', 'human'] },
    translatedAt: { type: Date, required: true, default: Date.now },
  }],
  editHistory: [{
    editedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    editedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    changes: [{
      field: { type: String, required: true, trim: true },
      oldValue: { type: String, required: true },
      newValue: { type: String, required: true },
    }],
    reason: {
      type: String,
      trim: true,
      maxlength: 200,
    },
  }],
  visibility: {
    type: String,
    enum: ['public', 'private', 'followers', 'friends'],
    default: 'public',
    index: true,
  },
  permissions: {
    canComment: {
      type: String,
      enum: ['everyone', 'followers', 'friends', 'no_one'],
      default: 'everyone',
    },
    canShare: {
      type: String,
      enum: ['everyone', 'followers', 'friends', 'no_one'],
      default: 'everyone',
    },
    canBookmark: {
      type: String,
      enum: ['everyone', 'followers', 'friends', 'no_one'],
      default: 'everyone',
    },
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
});

// Indexes
communityPostSchema.index({ title: 'text', content: 'text', summary: 'text', tags: 'text' });
communityPostSchema.index({ author: 1, createdAt: -1 });
communityPostSchema.index({ type: 1, category: 1, createdAt: -1 });
communityPostSchema.index({ 'engagement.likes': -1, createdAt: -1 });
communityPostSchema.index({ 'publishing.isFeatured': 1, 'publishing.featuredUntil': 1 });
communityPostSchema.index({ 'questionData.isResolved': 1, 'questionData.urgency': 1 });

export const CommunityPost = model<ICommunityPost, ICommunityPostStatics>('CommunityPost', communityPostSchema);
export default CommunityPost;