import { Document } from 'mongoose';
import { DatabaseId } from '@/types/common.types';

export interface IExpert extends Document {
  _id: DatabaseId;
  userId: DatabaseId;
  
  // Professional information
  credentials: {
    degree: string;
    institution: string;
    graduationYear: number;
    certifications: {
      name: string;
      issuingBody: string;
      issueDate: Date;
      expiryDate?: Date;
      certificateNumber?: string;
      verificationUrl?: string;
    }[];
    licenses: {
      type: string;
      number: string;
      issuingAuthority: string;
      issueDate: Date;
      expiryDate?: Date;
      status: 'active' | 'expired' | 'suspended';
    }[];
  };
  
  // Expertise areas
  expertise: {
    primarySpecialization: 'crop_management' | 'disease_control' | 'pest_management' | 'soil_science' | 'plant_pathology' | 'entomology' | 'agronomy' | 'horticulture' | 'irrigation' | 'organic_farming';
    secondarySpecializations: string[];
    crops: DatabaseId[];
    diseases: DatabaseId[];
    technologies: string[];
    farmingSystems: string[];
    geographicRegions: string[];
  };
  
  // Professional experience
  experience: {
    totalYears: number;
    currentPosition: string;
    currentEmployer: string;
    workHistory: {
      position: string;
      company: string;
      startDate: Date;
      endDate?: Date;
      isCurrent: boolean;
      description: string;
      achievements?: string[];
    }[];
    researchExperience?: {
      projects: {
        title: string;
        description: string;
        startDate: Date;
        endDate?: Date;
        role: string;
        outcomes?: string[];
      }[];
      publications: {
        title: string;
        journal: string;
        publishDate: Date;
        doi?: string;
        url?: string;
        citations?: number;
      }[];
    };
  };
  
  // Verification status
  verification: {
    status: 'pending' | 'verified' | 'rejected' | 'suspended';
    verifiedBy?: DatabaseId;
    verificationDate?: Date;
    verificationMethod: string[];
    documentsSubmitted: {
      type: string;
      filename: string;
      url: string;
      uploadDate: Date;
      verificationStatus: 'pending' | 'verified' | 'rejected';
    }[];
    verificationNotes?: string;
    trustScore: number; // 0-100
  };
  
  // Platform statistics
  stats: {
    consultations: {
      total: number;
      completed: number;
      ongoing: number;
      rating: {
        average: number;
        count: number;
        distribution: {
          1: number;
          2: number;
          3: number;
          4: number;
          5: number;
        };
      };
    };
    responses: {
      communityPosts: number;
      questions: number;
      averageResponseTime: number; // in hours
      helpfulnessRating: number;
    };
    content: {
      articlesPublished: number;
      videosCreated: number;
      guidesWritten: number;
      totalViews: number;
      totalLikes: number;
    };
  };
  
  // Availability and pricing
  availability: {
    isAvailable: boolean;
    maxConcurrentConsultations: number;
    responseTimeCommitment: number; // hours
    workingHours: {
      monday: { start: string; end: string; available: boolean };
      tuesday: { start: string; end: string; available: boolean };
      wednesday: { start: string; end: string; available: boolean };
      thursday: { start: string; end: string; available: boolean };
      friday: { start: string; end: string; available: boolean };
      saturday: { start: string; end: string; available: boolean };
      sunday: { start: string; end: string; available: boolean };
    };
    timezone: string;
    vacationPeriods: {
      startDate: Date;
      endDate: Date;
      reason: string;
    }[];
  };
  
  pricing: {
    consultationTypes: {
      type: 'chat' | 'video' | 'phone' | 'email' | 'field_visit';
      pricePerHour: number;
      currency: string;
      duration: number; // minutes
      description: string;
      isAvailable: boolean;
    }[];
    packageDeals: {
      name: string;
      description: string;
      price: number;
      currency: string;
      duration: number; // days
      features: string[];
      consultationHours: number;
      isPopular: boolean;
    }[];
    freeServices: {
      communityQuestions: boolean;
      basicConsultation: boolean;
      contentCreation: boolean;
      mentorship: boolean;
    };
  };
  
  // Communication preferences
  communication: {
    languages: string[];
    preferredMethods: string[];
    communicationStyle: string;
    responsePolicy: string;
    automaticReplies: {
      enabled: boolean;
      message: string;
      conditions: string[];
    };
  };
  
  // Reviews and feedback
  reviews: {
    _id: DatabaseId;
    reviewerId: DatabaseId;
    consultationId?: DatabaseId;
    rating: number;
    title: string;
    comment: string;
    aspects: {
      knowledge: number;
      communication: number;
      timeliness: number;
      helpfulness: number;
      professionalism: number;
    };
    isVerified: boolean;
    isAnonymous: boolean;
    expertReply?: {
      message: string;
      repliedAt: Date;
    };
    createdAt: Date;
    updatedAt: Date;
  }[];
  
  // Platform engagement
  engagement: {
    joinDate: Date;
    lastActive: Date;
    activityLevel: 'low' | 'medium' | 'high' | 'very_high';
    loyaltyProgram: {
      tier: 'bronze' | 'silver' | 'gold' | 'platinum';
      points: number;
      benefits: string[];
    };
    achievements: {
      type: string;
      name: string;
      description: string;
      earnedAt: Date;
      badge?: string;
    }[];
  };
  
  // Financial information
  financial: {
    earnings: {
      total: number;
      thisMonth: number;
      lastMonth: number;
      currency: string;
    };
    paymentInfo: {
      preferredMethod: 'bank_transfer' | 'paypal' | 'stripe' | 'crypto';
      accountDetails?: string; // encrypted
      taxInfo?: {
        taxId: string;
        country: string;
        category: string;
      };
    };
    transactions: {
      id: string;
      amount: number;
      currency: string;
      type: 'consultation' | 'bonus' | 'referral' | 'penalty';
      status: 'pending' | 'completed' | 'failed' | 'refunded';
      date: Date;
      description: string;
    }[];
  };
  
  // Content and resources
  content: {
    bio: string;
    expertise_summary: string;
    approach: string;
    achievements: string[];
    portfolio: {
      type: 'article' | 'video' | 'case_study' | 'research';
      title: string;
      description: string;
      url?: string;
      thumbnailUrl?: string;
      publishDate: Date;
      views: number;
      likes: number;
    }[];
    resources: {
      title: string;
      type: 'guide' | 'template' | 'tool' | 'calculator';
      description: string;
      url: string;
      isPublic: boolean;
      downloadCount: number;
    }[];
  };
  
  // Metadata
  tags: string[];
  isActive: boolean;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IExpertMethods {
  addReview(review: Partial<IExpert['reviews'][0]>): Promise<void>;
  updateStats(): Promise<void>;
  calculateTrustScore(): Promise<number>;
  isAvailableNow(): boolean;
  getAvailableSlots(date: Date): string[];
  addTransaction(transaction: IExpert['financial']['transactions'][0]): Promise<void>;
  updateEarnings(amount: number): Promise<void>;
  addAchievement(achievement: IExpert['engagement']['achievements'][0]): Promise<void>;
  setAvailability(isAvailable: boolean, reason?: string): Promise<void>;
  updateResponseTime(consultationId: DatabaseId, responseTime: number): Promise<void>;
  addPortfolioItem(item: IExpert['content']['portfolio'][0]): Promise<void>;
  verify(verifiedBy: DatabaseId, method: string[], notes?: string): Promise<void>;
  suspend(reason: string, suspendedBy: DatabaseId): Promise<void>;
}

export interface IExpertStatics {
  findBySpecialization(specialization: string): Promise<IExpert[]>;
  findByLocation(regions: string[]): Promise<IExpert[]>;
  findAvailable(): Promise<IExpert[]>;
  findTopRated(limit?: number): Promise<IExpert[]>;
  findByPriceRange(minPrice: number, maxPrice: number): Promise<IExpert[]>;
  search(query: string, filters?: ExpertSearchFilters): Promise<IExpert[]>;
  getExpertStats(): Promise<{
    totalExperts: number;
    verifiedExperts: number;
    availableExperts: number;
    averageRating: number;
    totalConsultations: number;
    expertsBySpecialization: Record<string, number>;
  }>;
  findByLanguage(language: string): Promise<IExpert[]>;
  findFeatured(limit?: number): Promise<IExpert[]>;
  cleanup(inactiveDays: number): Promise<number>;
}

export interface ExpertSearchFilters {
  specialization?: string;
  crops?: DatabaseId[];
  regions?: string[];
  minRating?: number;
  maxPrice?: number;
  availability?: boolean;
  languages?: string[];
  verified?: boolean;
}

export interface CreateExpertData {
  userId: DatabaseId;
  credentials: IExpert['credentials'];
  expertise: IExpert['expertise'];
  experience: IExpert['experience'];
  availability?: Partial<IExpert['availability']>;
  pricing?: Partial<IExpert['pricing']>;
  communication?: Partial<IExpert['communication']>;
  content?: Partial<IExpert['content']>;
}

export interface UpdateExpertData {
  credentials?: Partial<IExpert['credentials']>;
  expertise?: Partial<IExpert['expertise']>;
  availability?: Partial<IExpert['availability']>;
  pricing?: Partial<IExpert['pricing']>;
  communication?: Partial<IExpert['communication']>;
  content?: Partial<IExpert['content']>;
  isActive?: boolean;
}