import { AuthConfig, JwtPayload, TokenPair } from '@/types/auth.types';
export declare const authConfig: AuthConfig;
export declare const generateTokens: (payload: JwtPayload) => Promise<TokenPair>;
export declare const verifyAccessToken: (token: string) => Promise<JwtPayload>;
export declare const verifyRefreshToken: (token: string) => Promise<{
    userId: string;
    tokenVersion: number;
}>;
export declare const getTokenExpirationTime: (token: string) => Date | null;
export declare const validatePasswordStrength: (password: string) => {
    isValid: boolean;
    errors: string[];
};
export default authConfig;
//# sourceMappingURL=auth.d.ts.map