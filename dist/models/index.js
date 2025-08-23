"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllModels = exports.SystemModels = exports.CommunityModels = exports.AgricultureModels = exports.UserModels = exports.DiseaseModel = exports.Disease = exports.CropModel = exports.Crop = exports.SocialAccountModel = exports.SocialAccount = exports.OTPAttemptModel = exports.OTPAttempt = exports.PhoneVerificationModel = exports.PhoneVerification = exports.UserModel = exports.User = void 0;
// User Management Models
var User_1 = require("./User");
Object.defineProperty(exports, "User", { enumerable: true, get: function () { return User_1.User; } });
Object.defineProperty(exports, "UserModel", { enumerable: true, get: function () { return __importDefault(User_1).default; } });
var PhoneVerification_1 = require("./PhoneVerification");
Object.defineProperty(exports, "PhoneVerification", { enumerable: true, get: function () { return PhoneVerification_1.PhoneVerification; } });
Object.defineProperty(exports, "PhoneVerificationModel", { enumerable: true, get: function () { return __importDefault(PhoneVerification_1).default; } });
var OTPAttempt_1 = require("./OTPAttempt");
Object.defineProperty(exports, "OTPAttempt", { enumerable: true, get: function () { return OTPAttempt_1.OTPAttempt; } });
Object.defineProperty(exports, "OTPAttemptModel", { enumerable: true, get: function () { return __importDefault(OTPAttempt_1).default; } });
var SocialAccount_1 = require("./SocialAccount");
Object.defineProperty(exports, "SocialAccount", { enumerable: true, get: function () { return SocialAccount_1.SocialAccount; } });
Object.defineProperty(exports, "SocialAccountModel", { enumerable: true, get: function () { return __importDefault(SocialAccount_1).default; } });
// Agriculture Models
var Crop_1 = require("./Crop");
Object.defineProperty(exports, "Crop", { enumerable: true, get: function () { return Crop_1.Crop; } });
Object.defineProperty(exports, "CropModel", { enumerable: true, get: function () { return __importDefault(Crop_1).default; } });
var Disease_1 = require("./Disease");
Object.defineProperty(exports, "Disease", { enumerable: true, get: function () { return Disease_1.Disease; } });
Object.defineProperty(exports, "DiseaseModel", { enumerable: true, get: function () { return __importDefault(Disease_1).default; } });
// Weather Models (to be implemented)
// export { Weather, default as WeatherModel } from './Weather';
// export type { IWeather, IWeatherMethods, IWeatherStatics } from './Weather.types';
// Community Models (to be implemented)
// export { CommunityPost, default as CommunityPostModel } from './CommunityPost';
// export type { ICommunityPost, ICommunityPostMethods, ICommunityPostStatics } from './CommunityPost.types';
// Market Models (to be implemented)
// export { MarketPrice, default as MarketPriceModel } from './MarketPrice';
// export type { IMarketPrice, IMarketPriceMethods, IMarketPriceStatics } from './MarketPrice.types';
// Expert Models (to be implemented)
// export { Expert, default as ExpertModel } from './Expert';
// export type { IExpert, IExpertMethods, IExpertStatics } from './Expert.types';
// Notification Models (to be implemented)
// export { Notification, default as NotificationModel } from './Notification';
// export type { INotification, INotificationMethods, INotificationStatics } from './Notification.types';
// Language and Translation Models (to be implemented)
// export { Language, default as LanguageModel } from './Language';
// export type { ILanguage, ILanguageMethods, ILanguageStatics } from './Language.types';
// export { Translation, default as TranslationModel } from './Translation';
// export type { ITranslation, ITranslationMethods, ITranslationStatics } from './Translation.types';
// Onboarding Models (to be implemented)
// export { Onboarding, default as OnboardingModel } from './Onboarding';
// export type { IOnboarding, IOnboardingMethods, IOnboardingStatics } from './Onboarding.types';
// User Consent Models (to be implemented)
// export { UserConsent, default as UserConsentModel } from './UserConsent';
// export type { IUserConsent, IUserConsentMethods, IUserConsentStatics } from './UserConsent.types';
// Model collections for easy import
exports.UserModels = {
    User,
    PhoneVerification,
    OTPAttempt,
    SocialAccount,
};
exports.AgricultureModels = {
    Crop,
    Disease,
    // Treatment: will be implemented
};
exports.CommunityModels = {
// CommunityPost: will be implemented
// MarketPrice: will be implemented
// Expert: will be implemented
// Notification: will be implemented
};
exports.SystemModels = {
// Language: will be implemented
// Translation: will be implemented
// Onboarding: will be implemented
// UserConsent: will be implemented
};
// All models collection
exports.AllModels = {
    ...exports.UserModels,
    ...exports.AgricultureModels,
    ...exports.CommunityModels,
    ...exports.SystemModels,
};
//# sourceMappingURL=index.js.map