import { Document, Model } from 'mongoose';

export interface IExpert extends Document {
  userId: string;
  expertProfile: {
    specializations: Array<{
      category: 'plant_pathology' | 'entomology' | 'agronomy' | 'horticulture' | 'soil_science' | 'irrigation' | 'organic_farming' | 'crop_breeding';
      level: 'novice' | 'intermediate' | 'advanced' | 'expert';
      yearsOfExperience: number;
      certifications?: string[];
    }>;
    expertise: {
      crops: string[];
      diseases: string[];
      regions: string[];
      languages: string[];
      services: Array<'consultation' | 'diagnosis_review' | 'treatment_plan' | 'prevention_advice' | 'soil_analysis' | 'pest_management'>;
    };
    credentials: {
      education: Array<{
        degree: string;
        institution: string;
        year: number;
        fieldOfStudy: string;
      }>;
      certifications: Array<{
        name: string;
        issuingOrganization: string;
        issueDate: Date;
        expiryDate?: Date;
        credentialId?: string;
        verificationUrl?: string;
      }>;
      licenses: Array<{
        type: string;
        number: string;
        issuingAuthority: string;
        issueDate: Date;
        expiryDate: Date;
        jurisdiction: string;
      }>;
    };
    experience: {
      totalYears: number;
      currentPosition?: string;
      currentOrganization?: string;
      previousPositions: Array<{
        title: string;
        organization: string;
        startDate: Date;
        endDate?: Date;
        description?: string;
      }>;
      publications?: Array<{
        title: string;
        journal?: string;
        year: number;
        authors: string[];
        doi?: string;
        url?: string;
      }>;
      awards?: Array<{
        name: string;
        year: number;
        organization: string;
        description?: string;
      }>;
    };
  };
  verification: {
    status: 'pending' | 'verified' | 'rejected' | 'suspended';
    verifiedBy?: string;
    verifiedAt?: Date;
    verificationNotes?: string;
    documents: Array<{
      type: 'degree' | 'certificate' | 'license' | 'id' | 'resume';
      filename: string;
      url: string;
      uploadedAt: Date;
      verified: boolean;
    }>;
    background: {
      checked: boolean;
      checkedAt?: Date;
      result?: 'clear' | 'flagged' | 'rejected';
      notes?: string;
    };
  };
  availability: {
    status: 'available' | 'busy' | 'away' | 'offline';
    workingHours: Array<{
      day: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 1 = Monday, etc.
      startTime: string; // HH:MM format
      endTime: string; // HH:MM format
      timezone: string;
    }>;
    blackoutDates: Array<{
      startDate: Date;
      endDate: Date;
      reason?: string;
    }>;
    responseTime: {
      average: number; // in minutes
      target: number; // in minutes
      lastUpdated: Date;
    };
    maxConsultationsPerDay?: number;
  };
  consultation: {
    rates: Array<{
      service: 'quick_question' | 'detailed_consultation' | 'diagnosis_review' | 'follow_up' | 'emergency';
      price: number;
      currency: string;
      duration?: number; // in minutes
      description?: string;
    }>;
    methods: Array<'chat' | 'video' | 'phone' | 'email' | 'in_person'>;
    languages: string[];
    paymentMethods: string[];
    cancellationPolicy?: string;
    refundPolicy?: string;
  };
  performance: {
    ratings: {
      overall: number;
      communication: number;
      expertise: number;
      timeliness: number;
      helpfulness: number;
      totalReviews: number;
    };
    statistics: {
      totalConsultations: number;
      completedConsultations: number;
      cancelledConsultations: number;
      averageSessionDuration: number;
      responseTime: {
        average: number;
        median: number;
      };
      repeatClients: number;
      successRate: number; // percentage of successful diagnoses
    };
    badges: Array<{
      type: 'top_rated' | 'fast_responder' | 'specialist' | 'verified_expert' | 'community_favorite';
      earnedAt: Date;
      description?: string;
    }>;
  };
  community: {
    postsCount: number;
    likesReceived: number;
    followersCount: number;
    contributionScore: number;
    lastActiveAt?: Date;
    moderationFlags?: Array<{
      type: string;
      reason: string;
      reportedAt: Date;
      resolved: boolean;
    }>;
  };
  preferences: {
    notifications: {
      newConsultations: boolean;
      messages: boolean;
      reviews: boolean;
      communityActivity: boolean;
      promotions: boolean;
    };
    privacy: {
      showRealName: boolean;
      showLocation: boolean;
      showContactInfo: boolean;
      allowDirectBooking: boolean;
    };
  };
  subscription: {
    plan: 'free' | 'basic' | 'premium' | 'enterprise';
    startDate: Date;
    endDate?: Date;
    autoRenew: boolean;
    features: string[];
    paymentStatus: 'active' | 'past_due' | 'cancelled' | 'suspended';
  };
  isActive: boolean;
  joinedAt: Date;
  lastLoginAt?: Date;

  // Virtuals
  isVerified: boolean;
  isAvailable: boolean;
  averageRating: number;
  completionRate: number;
  experienceLevel: 'junior' | 'mid' | 'senior' | 'principal';

  // Instance methods
  updateAvailability(status: IExpert['availability']['status']): Promise<void>;
  addBlackoutDate(startDate: Date, endDate: Date, reason?: string): Promise<void>;
  removeBlackoutDate(startDate: Date, endDate: Date): Promise<void>;
  updateRates(rates: IExpert['consultation']['rates']): Promise<void>;
  addSpecialization(specialization: IExpert['expertProfile']['specializations'][0]): Promise<void>;
  removeSpecialization(category: string): Promise<void>;
  addCredential(type: 'education' | 'certification' | 'license', credential: any): Promise<void>;
  updateVerificationStatus(status: IExpert['verification']['status'], notes?: string): Promise<void>;
  calculatePerformanceMetrics(): Promise<void>;
  isAvailableAt(dateTime: Date): boolean;
  getUpcomingConsultations(): Promise<any[]>;
  canTakeNewConsultation(): Promise<boolean>;
}

export interface IExpertStatics {
  findByUserId(userId: string): Promise<IExpert | null>;
  findVerifiedExperts(filters?: {
    specializations?: string[];
    crops?: string[];
    regions?: string[];
    languages?: string[];
    availability?: boolean;
    minRating?: number;
  }): Promise<IExpert[]>;
  findExpertsByService(service: string): Promise<IExpert[]>;
  searchExperts(query: string, filters?: {
    specializations?: string[];
    location?: { latitude: number; longitude: number; radiusKm: number };
    availability?: boolean;
    priceRange?: { min: number; max: number };
  }): Promise<IExpert[]>;
  getTopExperts(criteria: 'rating' | 'consultations' | 'response_time', limit?: number): Promise<IExpert[]>;
  getExpertStats(): Promise<{
    total: number;
    verified: number;
    active: number;
    bySpecialization: Record<string, number>;
    byRegion: Record<string, number>;
    averageRating: number;
    averageResponseTime: number;
  }>;
  findAvailableExperts(
    dateTime: Date,
    duration: number,
    filters?: { specializations?: string[]; languages?: string[] }
  ): Promise<IExpert[]>;
  updateExpertRanking(): Promise<void>;
  createExpertProfile(userId: string, profileData: Partial<IExpert['expertProfile']>): Promise<IExpert>;
}

export interface IExpertModel extends Model<IExpert>, IExpertStatics {}