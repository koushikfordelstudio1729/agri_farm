import type { Router } from 'express';
export declare const AUTH_ROUTES: {
    readonly REGISTER: "/register";
    readonly LOGIN: "/login";
    readonly PHONE_AUTH: "/phone/auth";
    readonly VERIFY_OTP: "/phone/verify";
    readonly REFRESH: "/refresh";
    readonly LOGOUT: "/logout";
    readonly PASSWORD_RESET: "/password/reset";
    readonly PASSWORD_RESET_CONFIRM: "/password/reset/confirm";
    readonly PASSWORD_CHANGE: "/password/change";
    readonly EMAIL_VERIFY: "/email/verify";
    readonly EMAIL_RESEND: "/email/resend";
    readonly PHONE_VERIFY: "/phone/verify-token";
    readonly PHONE_RESEND: "/phone/resend";
    readonly GOOGLE_AUTH: "/google";
    readonly GOOGLE_CALLBACK: "/google/callback";
    readonly FACEBOOK_AUTH: "/facebook";
    readonly FACEBOOK_CALLBACK: "/facebook/callback";
    readonly ME: "/me";
    readonly SESSIONS: "/sessions";
};
export interface RegisterValidationSchema {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    countryCode?: string;
    preferredLanguage?: string;
    acceptTerms: boolean;
    acceptPrivacy: boolean;
    marketingConsent?: boolean;
}
export interface LoginValidationSchema {
    email: string;
    password: string;
    rememberMe?: boolean;
}
export interface PhoneAuthValidationSchema {
    phone: string;
    countryCode: string;
}
export interface OtpValidationSchema {
    phone: string;
    countryCode: string;
    otp: string;
    verificationType: 'registration' | 'login' | 'phone_update' | 'password_reset';
}
export interface RefreshTokenValidationSchema {
    refreshToken: string;
}
export interface PasswordResetValidationSchema {
    email: string;
}
export interface PasswordResetConfirmValidationSchema {
    token: string;
    newPassword: string;
}
export interface ChangePasswordValidationSchema {
    currentPassword: string;
    newPassword: string;
}
export interface EmailVerificationValidationSchema {
    token: string;
}
export interface PhoneVerificationValidationSchema {
    phone: string;
    countryCode: string;
}
export interface ResendVerificationValidationSchema {
    email?: string;
    phone?: string;
    countryCode?: string;
    type: 'email' | 'phone';
}
export interface AuthRateLimits {
    register: {
        windowMs: number;
        max: number;
    };
    login: {
        windowMs: number;
        max: number;
    };
    phoneAuth: {
        windowMs: number;
        max: number;
    };
    otpVerify: {
        windowMs: number;
        max: number;
    };
    passwordReset: {
        windowMs: number;
        max: number;
    };
    emailResend: {
        windowMs: number;
        max: number;
    };
}
export interface AuthRouteConfig {
    router: Router;
    rateLimits: AuthRateLimits;
    validationRules: {
        [key: string]: any;
    };
}
export type AuthRouteHandler = (req: any, res: any, next: any) => Promise<void> | void;
export interface AuthRouteMiddleware {
    rateLimiter: AuthRouteHandler;
    validator: AuthRouteHandler;
    sanitizer: AuthRouteHandler;
}
//# sourceMappingURL=auth.types.d.ts.map