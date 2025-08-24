import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import { Request } from 'express';
import { generateRandomString, generateSecureToken } from './helpers';

export interface TokenPayload {
  userId: string;
  email: string;
  role?: string;
  permissions?: string[];
  sessionId?: string;
  type: 'access' | 'refresh' | 'reset' | 'verification';
  iat?: number;
  exp?: number;
}

export interface PasswordHashOptions {
  saltRounds?: number;
  pepper?: string;
}

export interface TokenOptions {
  expiresIn?: string | number;
  issuer?: string;
  audience?: string;
  subject?: string;
}

export interface RateLimitInfo {
  key: string;
  attempts: number;
  resetTime: number;
  blocked: boolean;
  retryAfter?: number;
}

export interface SecurityEventLog {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
  details: Record<string, unknown>;
}

class SecurityUtils {
  private static readonly SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  private static readonly JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';
  private static readonly PEPPER = process.env.PASSWORD_PEPPER || '';

  // Password hashing and verification
  static async hashPassword(
    password: string,
    options: PasswordHashOptions = {}
  ): Promise<string> {
    const { saltRounds = SecurityUtils.SALT_ROUNDS, pepper = SecurityUtils.PEPPER } = options;
    const pepperedPassword = password + pepper;
    return bcrypt.hash(pepperedPassword, saltRounds);
  }

  static async verifyPassword(
    password: string,
    hashedPassword: string,
    pepper: string = SecurityUtils.PEPPER
  ): Promise<boolean> {
    const pepperedPassword = password + pepper;
    return bcrypt.compare(pepperedPassword, hashedPassword);
  }

  static generateSalt(): string {
    return bcrypt.genSaltSync(SecurityUtils.SALT_ROUNDS);
  }

  // JWT Token operations
  static generateAccessToken(
    payload: Omit<TokenPayload, 'type' | 'iat' | 'exp'>,
    options: TokenOptions = {}
  ): string {
    const tokenPayload: TokenPayload = {
      ...payload,
      type: 'access',
    };

    return jwt.sign(tokenPayload, SecurityUtils.JWT_SECRET, {
      expiresIn: options.expiresIn || process.env.JWT_ACCESS_EXPIRES || '15m',
      issuer: options.issuer || process.env.JWT_ISSUER || 'agri-farm',
      audience: options.audience || process.env.JWT_AUDIENCE || 'agri-farm-api',
      subject: options.subject || payload.userId,
    });
  }

  static generateRefreshToken(
    payload: Omit<TokenPayload, 'type' | 'iat' | 'exp'>,
    options: TokenOptions = {}
  ): string {
    const tokenPayload: TokenPayload = {
      ...payload,
      type: 'refresh',
    };

    return jwt.sign(tokenPayload, SecurityUtils.JWT_REFRESH_SECRET, {
      expiresIn: options.expiresIn || process.env.JWT_REFRESH_EXPIRES || '7d',
      issuer: options.issuer || process.env.JWT_ISSUER || 'agri-farm',
      audience: options.audience || process.env.JWT_AUDIENCE || 'agri-farm-api',
      subject: options.subject || payload.userId,
    });
  }

  static generateResetToken(
    payload: Omit<TokenPayload, 'type' | 'iat' | 'exp'>,
    options: TokenOptions = {}
  ): string {
    const tokenPayload: TokenPayload = {
      ...payload,
      type: 'reset',
    };

    return jwt.sign(tokenPayload, SecurityUtils.JWT_SECRET, {
      expiresIn: options.expiresIn || '1h',
      issuer: options.issuer || process.env.JWT_ISSUER || 'agri-farm',
      audience: options.audience || process.env.JWT_AUDIENCE || 'agri-farm-api',
      subject: options.subject || payload.userId,
    });
  }

  static generateVerificationToken(
    payload: Omit<TokenPayload, 'type' | 'iat' | 'exp'>,
    options: TokenOptions = {}
  ): string {
    const tokenPayload: TokenPayload = {
      ...payload,
      type: 'verification',
    };

    return jwt.sign(tokenPayload, SecurityUtils.JWT_SECRET, {
      expiresIn: options.expiresIn || '24h',
      issuer: options.issuer || process.env.JWT_ISSUER || 'agri-farm',
      audience: options.audience || process.env.JWT_AUDIENCE || 'agri-farm-api',
      subject: options.subject || payload.userId,
    });
  }

  static verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, SecurityUtils.JWT_SECRET, {
      issuer: process.env.JWT_ISSUER || 'agri-farm',
      audience: process.env.JWT_AUDIENCE || 'agri-farm-api',
    }) as TokenPayload;
  }

  static verifyRefreshToken(token: string): TokenPayload {
    return jwt.verify(token, SecurityUtils.JWT_REFRESH_SECRET, {
      issuer: process.env.JWT_ISSUER || 'agri-farm',
      audience: process.env.JWT_AUDIENCE || 'agri-farm-api',
    }) as TokenPayload;
  }

  static decodeToken(token: string): TokenPayload | null {
    try {
      return jwt.decode(token) as TokenPayload;
    } catch {
      return null;
    }
  }

  // Two-Factor Authentication
  static generateTwoFactorSecret(
    name: string,
    issuer: string = 'Agri Farm'
  ): { secret: string; otpauthUrl: string; qrCode: string } {
    const secret = speakeasy.generateSecret({
      name,
      issuer,
      length: 32,
    });

    return {
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url || '',
      qrCode: secret.qr_code_ascii || '',
    };
  }

  static verifyTwoFactorToken(token: string, secret: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 steps before/after for clock drift
    });
  }

  static generateBackupCodes(count: number = 10): string[] {
    return Array.from({ length: count }, () =>
      generateRandomString(8).toUpperCase().match(/.{4}/g)?.join('-') || ''
    );
  }

  // Encryption and Decryption
  static encrypt(text: string, key?: string): { encrypted: string; iv: string } {
    const algorithm = 'aes-256-gcm';
    const encryptionKey = key || process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipherGCM(algorithm, encryptionKey);
    cipher.setAAD(Buffer.from('additional-data'));
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return {
      encrypted: encrypted + ':' + tag.toString('hex'),
      iv: iv.toString('hex'),
    };
  }

  static decrypt(encryptedData: string, iv: string, key?: string): string {
    const algorithm = 'aes-256-gcm';
    const encryptionKey = key || process.env.ENCRYPTION_KEY || '';
    
    const [encrypted, authTag] = encryptedData.split(':');
    
    const decipher = crypto.createDecipherGCM(algorithm, encryptionKey);
    decipher.setAAD(Buffer.from('additional-data'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // Digital signatures
  static createSignature(data: string, privateKey: string): string {
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(data);
    return sign.sign(privateKey, 'base64');
  }

  static verifySignature(data: string, signature: string, publicKey: string): boolean {
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(data);
    return verify.verify(publicKey, signature, 'base64');
  }

  // Secure random generators
  static generateSecureId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  static generateApiKey(): string {
    const prefix = 'ak_';
    const keyPart = crypto.randomBytes(32).toString('base64url');
    return `${prefix}${keyPart}`;
  }

  static generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // HMAC operations
  static createHMAC(data: string, secret?: string): string {
    const key = secret || process.env.HMAC_SECRET || 'default-secret';
    return crypto.createHmac('sha256', key).update(data).digest('hex');
  }

  static verifyHMAC(data: string, signature: string, secret?: string): boolean {
    const expectedSignature = SecurityUtils.createHMAC(data, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  // Input sanitization
  static sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/['"]/g, '') // Remove quotes to prevent injection
      .replace(/[&]/g, '&amp;')
      .trim();
  }

  static escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  static validateSqlInput(input: string): boolean {
    const sqlInjectionPattern = /('|(\\')|;|\x00|\n|\r|\x1a|\\|\/\*|\*\/|\b(ALTER|CREATE|DELETE|DROP|EXEC(UTE)?|INSERT(\s+INTO)?|MERGE|SELECT|UPDATE|UNION(\s+ALL)?)\b)/gi;
    return !sqlInjectionPattern.test(input);
  }

  // Security headers
  static getSecurityHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    };
  }

  // Request validation
  static extractClientInfo(req: Request): {
    ip: string;
    userAgent: string;
    fingerprint: string;
  } {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
               req.headers['x-real-ip'] as string ||
               req.socket?.remoteAddress ||
               req.ip ||
               'unknown';

    const userAgent = req.headers['user-agent'] || 'unknown';
    
    const fingerprint = SecurityUtils.createHMAC(`${ip}:${userAgent}:${req.headers['accept-language']}`);

    return { ip, userAgent, fingerprint };
  }

  static validateOrigin(origin: string, allowedOrigins: string[]): boolean {
    if (!origin) return false;
    return allowedOrigins.includes(origin) || allowedOrigins.includes('*');
  }

  static isSecureContext(req: Request): boolean {
    return req.secure || 
           req.headers['x-forwarded-proto'] === 'https' ||
           req.hostname === 'localhost';
  }

  // Rate limiting helpers
  static createRateLimitKey(identifier: string, action: string): string {
    return `rate_limit:${action}:${identifier}`;
  }

  static calculateRetryAfter(resetTime: number): number {
    return Math.ceil((resetTime - Date.now()) / 1000);
  }

  // Password strength validation
  static validatePasswordStrength(password: string): {
    score: number;
    feedback: string[];
    isStrong: boolean;
  } {
    let score = 0;
    const feedback: string[] = [];

    // Length check
    if (password.length >= 12) score += 2;
    else if (password.length >= 8) score += 1;
    else feedback.push('Password should be at least 8 characters long');

    // Character variety
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Add lowercase letters');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Add uppercase letters');

    if (/\d/.test(password)) score += 1;
    else feedback.push('Add numbers');

    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?]/.test(password)) score += 1;
    else feedback.push('Add special characters');

    // Complexity checks
    if (password.length >= 16) score += 1;
    if (/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/.test(password)) score += 1;

    // Penalties for common patterns
    if (/(.)\\1{2,}/.test(password)) {
      score -= 1;
      feedback.push('Avoid repeating characters');
    }

    if (/123|abc|qwe/i.test(password)) {
      score -= 1;
      feedback.push('Avoid sequential characters');
    }

    const isStrong = score >= 6;
    
    return {
      score: Math.max(0, Math.min(10, score)),
      feedback: feedback.length ? feedback : ['Strong password!'],
      isStrong,
    };
  }

  // CSRF protection
  static generateCSRFToken(): string {
    return generateSecureToken(32);
  }

  static validateCSRFToken(token: string, sessionToken: string): boolean {
    return crypto.timingSafeEqual(
      Buffer.from(token),
      Buffer.from(sessionToken)
    );
  }

  // API key validation
  static validateApiKeyFormat(apiKey: string): boolean {
    return /^ak_[A-Za-z0-9_-]{43}$/.test(apiKey);
  }

  static hashApiKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }
}

export default SecurityUtils;

// Utility functions for common security operations
export const securityUtils = {
  // Password operations
  hashPassword: SecurityUtils.hashPassword,
  verifyPassword: SecurityUtils.verifyPassword,
  validatePasswordStrength: SecurityUtils.validatePasswordStrength,

  // Token operations
  generateAccessToken: SecurityUtils.generateAccessToken,
  generateRefreshToken: SecurityUtils.generateRefreshToken,
  verifyAccessToken: SecurityUtils.verifyAccessToken,
  verifyRefreshToken: SecurityUtils.verifyRefreshToken,

  // Two-factor authentication
  generateTwoFactorSecret: SecurityUtils.generateTwoFactorSecret,
  verifyTwoFactorToken: SecurityUtils.verifyTwoFactorToken,
  generateBackupCodes: SecurityUtils.generateBackupCodes,

  // Encryption
  encrypt: SecurityUtils.encrypt,
  decrypt: SecurityUtils.decrypt,

  // Request security
  extractClientInfo: SecurityUtils.extractClientInfo,
  validateOrigin: SecurityUtils.validateOrigin,
  isSecureContext: SecurityUtils.isSecureContext,

  // Input sanitization
  sanitizeInput: SecurityUtils.sanitizeInput,
  escapeHtml: SecurityUtils.escapeHtml,
  validateSqlInput: SecurityUtils.validateSqlInput,

  // Headers and CSRF
  getSecurityHeaders: SecurityUtils.getSecurityHeaders,
  generateCSRFToken: SecurityUtils.generateCSRFToken,
  validateCSRFToken: SecurityUtils.validateCSRFToken,

  // Secure generators
  generateSecureId: SecurityUtils.generateSecureId,
  generateApiKey: SecurityUtils.generateApiKey,
  generateSessionId: SecurityUtils.generateSessionId,

  // HMAC operations
  createHMAC: SecurityUtils.createHMAC,
  verifyHMAC: SecurityUtils.verifyHMAC,

  // API key operations
  validateApiKeyFormat: SecurityUtils.validateApiKeyFormat,
  hashApiKey: SecurityUtils.hashApiKey,
};