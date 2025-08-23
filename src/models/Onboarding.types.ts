import { Document } from 'mongoose';
import { DatabaseId } from '@/types/common.types';

export interface IOnboarding extends Document {
  _id: DatabaseId;
  userId: DatabaseId;
  currentStep: number;
  totalSteps: number;
  completedSteps: number[];
  stepData: Record<string, any>;
  isCompleted: boolean;
  completedAt?: Date;
  skippedSteps: number[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IOnboardingMethods {
  completeStep(stepNumber: number, data?: any): Promise<void>;
  skipStep(stepNumber: number): Promise<void>;
  goToStep(stepNumber: number): Promise<void>;
  complete(): Promise<void>;
  reset(): Promise<void>;
}

export interface IOnboardingStatics {
  findByUser(userId: DatabaseId): Promise<IOnboarding | null>;
  findIncomplete(): Promise<IOnboarding[]>;
  getCompletionStats(): Promise<{ averageCompletion: number; dropOffPoints: number[] }>;
}