import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@/types';
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const authorize: (...roles: UserRole[]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const requireEmailVerification: (req: Request, res: Response, next: NextFunction) => void;
export declare const requirePhoneVerification: (req: Request, res: Response, next: NextFunction) => void;
export declare const optionalAuthenticate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const isOwnerOrRole: (...roles: UserRole[]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const checkAccountStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const authRateLimit: (maxAttempts?: number, windowMs?: number) => (req: Request, res: Response, next: NextFunction) => void;
declare const _default: {
    authenticate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    authorize: (...roles: UserRole[]) => (req: Request, res: Response, next: NextFunction) => void;
    requireEmailVerification: (req: Request, res: Response, next: NextFunction) => void;
    requirePhoneVerification: (req: Request, res: Response, next: NextFunction) => void;
    optionalAuthenticate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    isOwnerOrRole: (...roles: UserRole[]) => (req: Request, res: Response, next: NextFunction) => void;
    checkAccountStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    authRateLimit: (maxAttempts?: number, windowMs?: number) => (req: Request, res: Response, next: NextFunction) => void;
};
export default _default;
//# sourceMappingURL=auth.d.ts.map