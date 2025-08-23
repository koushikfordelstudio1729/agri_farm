// User Management Models
export { User, default as UserModel } from './User';
export type { IUser, IUserMethods, IUserStatics } from './User.types';

export { PhoneVerification, default as PhoneVerificationModel } from './PhoneVerification';
export type { IPhoneVerification, IPhoneVerificationMethods, IPhoneVerificationStatics } from './PhoneVerification.types';

export { OTPAttempt, default as OTPAttemptModel } from './OTPAttempt';
export type { IOTPAttempt, IOTPAttemptMethods, IOTPAttemptStatics } from './OTPAttempt.types';

export { SocialAccount, default as SocialAccountModel } from './SocialAccount';
export type { ISocialAccount, ISocialAccountMethods, ISocialAccountStatics } from './SocialAccount.types';

// Agriculture Models
export { Crop, default as CropModel } from './Crop';
export type { ICrop, ICropMethods, ICropStatics } from './Crop.types';

export { Disease, default as DiseaseModel } from './Disease';
export type { IDisease } from './Disease';

// Diagnosis Model (already exists)
export { Diagnosis, default as DiagnosisModel } from './Diagnosis';
export type { IDiagnosis, IDiagnosisMethods, IDiagnosisStatics } from './Diagnosis.types';

// Treatment Models
export { Treatment, default as TreatmentModel } from './Treatment';
export type { ITreatment, ITreatmentMethods, ITreatmentStatics } from './Treatment.types';

// Weather Models
export { Weather, default as WeatherModel } from './Weather';
export type { IWeather, IWeatherMethods, IWeatherStatics } from './Weather.types';

// Community Models
export { CommunityPost, default as CommunityPostModel } from './CommunityPost';
export type { ICommunityPost, ICommunityPostMethods, ICommunityPostStatics } from './CommunityPost.types';

// Market Models
export { MarketPrice, default as MarketPriceModel } from './MarketPrice';
export type { IMarketPrice, IMarketPriceMethods, IMarketPriceStatics } from './MarketPrice.types';

// Expert Models
export { Expert, default as ExpertModel } from './Expert';
export type { IExpert, IExpertMethods, IExpertStatics } from './Expert.types';

// Notification Models
export { Notification, default as NotificationModel } from './Notification';
export type { INotification, INotificationMethods, INotificationStatics } from './Notification.types';

// Language and Translation Models
export { Language, default as LanguageModel } from './Language';
export type { ILanguage, ILanguageMethods, ILanguageStatics } from './Language.types';

export { Translation, default as TranslationModel } from './Translation';
export type { ITranslation, ITranslationMethods, ITranslationStatics } from './Translation.types';

// Onboarding Models
export { Onboarding, default as OnboardingModel } from './Onboarding';
export type { IOnboarding, IOnboardingMethods, IOnboardingStatics } from './Onboarding.types';

// User Consent Models
export { UserConsent, default as UserConsentModel } from './UserConsent';
export type { IUserConsent, IUserConsentMethods, IUserConsentStatics } from './UserConsent.types';

// Model collections for easy import
export const UserModels = {
  User,
  PhoneVerification,
  OTPAttempt,
  SocialAccount,
};

export const AgricultureModels = {
  Crop,
  Disease,
  Treatment,
  Diagnosis,
};

export const CommunityModels = {
  CommunityPost,
  Expert,
};

export const MarketModels = {
  MarketPrice,
};

export const NotificationModels = {
  Notification,
};

export const SystemModels = {
  Language,
  Translation,
  Onboarding,
  UserConsent,
  Weather,
};

// All models collection
export const AllModels = {
  ...UserModels,
  ...AgricultureModels,
  ...CommunityModels,
  ...MarketModels,
  ...NotificationModels,
  ...SystemModels,
};