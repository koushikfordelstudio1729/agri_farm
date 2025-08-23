import type { 
  DatabaseId, 
  BaseDocument,
  LanguageCode,
  ContactInfo,
  Address,
  Rating,
  ConsultationStatus 
} from './common.types';

export interface ExpertSpecialization {
  id: DatabaseId;
  name: string;
  category: 'crop_disease' | 'pest_management' | 'soil_health' | 'nutrition' | 'irrigation' | 'organic_farming' | 'precision_agriculture' | 'post_harvest' | 'marketing';
  description: string;
  certificationRequired: boolean;
  experienceRequired: number;
  isActive: boolean;
}

export interface ExpertQualification {
  id: DatabaseId;
  type: 'degree' | 'certification' | 'license' | 'training' | 'experience';
  title: string;
  institution: string;
  field: string;
  obtainedDate: Date;
  expiryDate?: Date;
  documentUrl?: string;
  verificationStatus: 'pending' | 'verified' | 'rejected' | 'expired';
  verifiedBy?: DatabaseId;
  verifiedAt?: Date;
  notes?: string;
}

export interface ExpertProfile extends BaseDocument {
  id: DatabaseId;
  userId: DatabaseId;
  specializations: DatabaseId[];
  qualifications: ExpertQualification[];
  experience: {
    totalYears: number;
    description: string;
    previousPositions: {
      title: string;
      organization: string;
      startDate: Date;
      endDate?: Date;
      description: string;
    }[];
    achievements: string[];
    publications: {
      title: string;
      journal?: string;
      year: number;
      doi?: string;
      url?: string;
    }[];
  };
  languages: LanguageCode[];
  serviceAreas: {
    countries: string[];
    states?: string[];
    regions?: string[];
    remote: boolean;
    travelRadius?: number;
  };
  availability: {
    timezone: string;
    workingHours: {
      [key: string]: {
        start: string;
        end: string;
        available: boolean;
      };
    };
    vacations: {
      startDate: Date;
      endDate: Date;
      reason?: string;
    }[];
    isCurrentlyAvailable: boolean;
    responseTime: {
      average: number;
      unit: 'minutes' | 'hours' | 'days';
    };
    bookingLeadTime: {
      minimum: number;
      maximum: number;
      unit: 'hours' | 'days';
    };
  };
  consultationTypes: {
    chat: {
      available: boolean;
      rate: number;
      currency: string;
      unit: 'per_message' | 'per_hour' | 'per_session';
      minDuration?: number;
      maxDuration?: number;
    };
    voice: {
      available: boolean;
      rate: number;
      currency: string;
      unit: 'per_minute' | 'per_hour';
      minDuration: number;
      maxDuration: number;
    };
    video: {
      available: boolean;
      rate: number;
      currency: string;
      unit: 'per_minute' | 'per_hour';
      minDuration: number;
      maxDuration: number;
      platform: 'builtin' | 'zoom' | 'google_meet' | 'teams';
    };
    onsite: {
      available: boolean;
      rate: number;
      currency: string;
      unit: 'per_hour' | 'per_day';
      travelCharges: boolean;
      travelRate?: number;
      maxDistance: number;
      minDuration: number;
    };
  };
  rating: Rating;
  statistics: {
    totalConsultations: number;
    completedConsultations: number;
    averageSessionDuration: number;
    clientRetentionRate: number;
    responseRate: number;
    onTimePercentage: number;
    diagnosisAccuracy?: number;
  };
  portfolio: {
    successStories: {
      title: string;
      description: string;
      crop?: DatabaseId;
      problem: string;
      solution: string;
      outcome: string;
      images?: string[];
      clientTestimonial?: string;
      date: Date;
    }[];
    casesHandled: {
      cropId: DatabaseId;
      diseaseId?: DatabaseId;
      count: number;
      successRate: number;
    }[];
  };
  verificationStatus: 'pending' | 'under_review' | 'verified' | 'rejected' | 'suspended';
  verificationDetails: {
    submittedAt?: Date;
    reviewedBy?: DatabaseId;
    reviewedAt?: Date;
    rejectionReason?: string;
    notes?: string;
    documentsVerified: boolean;
    backgroundCheckCompleted: boolean;
    interviewCompleted?: boolean;
  };
  pricing: {
    currency: string;
    consultationFee: {
      chat: number;
      voice: number;
      video: number;
      onsite: number;
    };
    packageDeals: {
      name: string;
      description: string;
      sessions: number;
      validityDays: number;
      originalPrice: number;
      discountedPrice: number;
      features: string[];
    }[];
    seasonalRates: {
      season: string;
      multiplier: number;
      startDate: Date;
      endDate: Date;
    }[];
  };
  bankingDetails?: {
    accountHolder: string;
    bankName: string;
    accountNumber: string;
    routingNumber?: string;
    swiftCode?: string;
    paypalEmail?: string;
    upiId?: string;
  };
  marketingProfile: {
    tagline: string;
    introduction: string;
    expertise: string[];
    mediaKit: {
      profileImages: string[];
      videos: string[];
      documents: string[];
    };
    socialProof: {
      clientLogos: string[];
      certificationBadges: string[];
      mediaFeatures: {
        title: string;
        publication: string;
        date: Date;
        url?: string;
      }[];
    };
  };
  preferences: {
    autoAcceptConsultations: boolean;
    maxDailyConsultations: number;
    preferredCommunication: 'chat' | 'voice' | 'video';
    allowEmergencyConsultations: boolean;
    sendRatingReminders: boolean;
  };
  isActive: boolean;
  pausedUntil?: Date;
  pauseReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Consultation extends BaseDocument {
  id: DatabaseId;
  consultationNumber: string;
  clientId: DatabaseId;
  expertId: DatabaseId;
  type: 'chat' | 'voice' | 'video' | 'onsite';
  status: ConsultationStatus;
  subject: string;
  description: string;
  cropId?: DatabaseId;
  problemCategory: string;
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  scheduling: {
    preferredDate?: Date;
    preferredTime?: string;
    duration: number;
    timezone: string;
    scheduledAt?: Date;
    startedAt?: Date;
    endedAt?: Date;
    actualDuration?: number;
  };
  location?: {
    type: 'remote' | 'onsite';
    address?: Address;
    meetingLink?: string;
    platform?: string;
    meetingId?: string;
    accessCode?: string;
  };
  attachments: {
    images: string[];
    videos: string[];
    documents: string[];
    voiceNotes: string[];
  };
  pricing: {
    baseRate: number;
    duration: number;
    totalAmount: number;
    currency: string;
    additionalCharges?: {
      item: string;
      amount: number;
      description: string;
    }[];
    discount?: {
      type: 'percentage' | 'fixed';
      value: number;
      reason: string;
    };
    taxes: {
      type: string;
      percentage: number;
      amount: number;
    }[];
    finalAmount: number;
  };
  payment: {
    status: 'pending' | 'paid' | 'partially_paid' | 'failed' | 'refunded';
    method?: 'card' | 'bank_transfer' | 'paypal' | 'wallet' | 'upi';
    transactionId?: string;
    paidAt?: Date;
    refundedAt?: Date;
    refundAmount?: number;
    refundReason?: string;
  };
  communication: {
    messages: {
      id: string;
      senderId: DatabaseId;
      senderType: 'client' | 'expert';
      type: 'text' | 'image' | 'voice' | 'video' | 'document' | 'system';
      content: string;
      attachments?: string[];
      timestamp: Date;
      isRead: boolean;
      readAt?: Date;
    }[];
    callLogs: {
      startTime: Date;
      endTime: Date;
      duration: number;
      type: 'voice' | 'video';
      quality: 'poor' | 'fair' | 'good' | 'excellent';
      recordingUrl?: string;
    }[];
    notes: {
      authorId: DatabaseId;
      authorType: 'client' | 'expert';
      content: string;
      isPrivate: boolean;
      timestamp: Date;
    }[];
  };
  diagnosis?: {
    problem: string;
    causes: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
    recommendations: {
      immediate: string[];
      shortTerm: string[];
      longTerm: string[];
      preventive: string[];
    };
    followUpRequired: boolean;
    followUpDate?: Date;
    treatmentPlan: {
      step: number;
      description: string;
      timeline: string;
      materials: string[];
      cost?: number;
    }[];
    expectedOutcome: string;
    successMetrics: string[];
  };
  followUp: {
    scheduled: boolean;
    date?: Date;
    type?: 'call' | 'message' | 'onsite';
    completed: boolean;
    notes?: string;
    outcome?: string;
  };
  feedback: {
    clientRating?: {
      overall: number;
      communication: number;
      expertise: number;
      timeliness: number;
      value: number;
      comment?: string;
      wouldRecommend: boolean;
      submittedAt: Date;
    };
    expertRating?: {
      overall: number;
      communication: number;
      preparation: number;
      cooperation: number;
      comment?: string;
      submittedAt: Date;
    };
  };
  resolution: {
    resolved: boolean;
    resolutionDate?: Date;
    outcome: 'successful' | 'partially_successful' | 'unsuccessful' | 'ongoing';
    clientSatisfaction?: number;
    improvementMeasured: boolean;
    beforeAfterPhotos?: {
      before: string[];
      after: string[];
    };
    yieldImprovement?: {
      baseline: number;
      improved: number;
      unit: string;
      percentage: number;
    };
  };
  adminNotes?: {
    note: string;
    authorId: DatabaseId;
    timestamp: Date;
  }[];
  tags: string[];
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpertApplication {
  id: DatabaseId;
  userId: DatabaseId;
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    countryCode: string;
    dateOfBirth: Date;
    nationality: string;
    address: Address;
    languages: LanguageCode[];
  };
  professionalInfo: {
    currentPosition: string;
    organization: string;
    yearsOfExperience: number;
    specializations: DatabaseId[];
    qualifications: Omit<ExpertQualification, 'id' | 'verificationStatus' | 'verifiedBy' | 'verifiedAt'>[];
    workHistory: {
      position: string;
      organization: string;
      startDate: Date;
      endDate?: Date;
      description: string;
    }[];
  };
  expertise: {
    crops: DatabaseId[];
    diseases: DatabaseId[];
    regions: string[];
    farmingSystems: string[];
    consultationTypes: ('chat' | 'voice' | 'video' | 'onsite')[];
  };
  documents: {
    resume?: string;
    coverLetter?: string;
    certifications: string[];
    portfolio?: string[];
    references: {
      name: string;
      position: string;
      organization: string;
      email: string;
      phone: string;
      relationship: string;
    }[];
  };
  motivation: {
    whyJoin: string;
    experience: string;
    goals: string;
    availability: string;
  };
  termsAccepted: boolean;
  dataProcessingConsent: boolean;
  backgroundCheckConsent: boolean;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'waitlisted';
  reviewNotes?: string;
  reviewedBy?: DatabaseId;
  reviewedAt?: Date;
  submittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpertAvailability {
  expertId: DatabaseId;
  date: Date;
  timeSlots: {
    start: string;
    end: string;
    available: boolean;
    consultationType: 'chat' | 'voice' | 'video' | 'onsite';
    rate: number;
    booked?: boolean;
    consultationId?: DatabaseId;
  }[];
  isHoliday: boolean;
  holidayReason?: string;
  specialRates?: {
    multiplier: number;
    reason: string;
  };
  updatedAt: Date;
}

export interface CreateConsultationRequest {
  expertId: DatabaseId;
  type: 'chat' | 'voice' | 'video' | 'onsite';
  subject: string;
  description: string;
  cropId?: DatabaseId;
  problemCategory: string;
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  preferredDate?: Date;
  preferredTime?: string;
  duration?: number;
  location?: Address;
  attachments?: {
    images?: Express.Multer.File[];
    documents?: Express.Multer.File[];
  };
}

export interface UpdateConsultationRequest {
  subject?: string;
  description?: string;
  preferredDate?: Date;
  preferredTime?: string;
  location?: Address;
  status?: ConsultationStatus;
}

export interface ExpertSearchFilters {
  specializations?: DatabaseId[];
  languages?: LanguageCode[];
  rating?: number;
  experience?: number;
  availability?: {
    date: Date;
    timeSlot: string;
    type: 'chat' | 'voice' | 'video' | 'onsite';
  };
  location?: {
    country: string;
    state?: string;
    radius?: number;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  priceRange?: {
    min: number;
    max: number;
    currency: string;
  };
  consultationType?: ('chat' | 'voice' | 'video' | 'onsite')[];
  responseTime?: number;
  verificationStatus?: 'verified' | 'pending';
}

export interface ExpertStats {
  totalExperts: number;
  verifiedExperts: number;
  activeExperts: number;
  specializations: {
    specialization: string;
    count: number;
    averageRating: number;
  }[];
  consultationStats: {
    total: number;
    completed: number;
    averageDuration: number;
    averageRating: number;
  };
  revenue: {
    total: number;
    thisMonth: number;
    growth: number;
  };
  topPerformers: {
    expertId: DatabaseId;
    name: string;
    rating: number;
    consultations: number;
    revenue: number;
  }[];
}

export interface ExpertPayout {
  id: DatabaseId;
  expertId: DatabaseId;
  period: {
    start: Date;
    end: Date;
  };
  consultations: DatabaseId[];
  grossEarnings: number;
  platformFee: number;
  taxes: number;
  adjustments: {
    type: 'bonus' | 'penalty' | 'refund';
    amount: number;
    reason: string;
  }[];
  netEarnings: number;
  currency: string;
  payoutMethod: 'bank_transfer' | 'paypal' | 'check' | 'crypto';
  payoutDetails: Record<string, string>;
  status: 'pending' | 'processed' | 'paid' | 'failed';
  processedAt?: Date;
  paidAt?: Date;
  transactionId?: string;
  createdAt: Date;
}