import winston from 'winston';
import { Request, Response } from 'express';
interface LogContext {
    requestId?: string;
    userId?: string;
    ip?: string;
    userAgent?: string;
    method?: string;
    url?: string;
    statusCode?: number;
    responseTime?: number;
    service?: string;
    action?: string;
    error?: Error | string;
    metadata?: Record<string, unknown>;
}
declare const logger: winston.Logger;
export declare const requestLogger: (req: Request, res: Response, next: () => void) => void;
export declare const logInfo: (message: string, context?: LogContext) => void;
export declare const logWarn: (message: string, context?: LogContext) => void;
export declare const logError: (message: string, error?: Error | string, context?: LogContext) => void;
export declare const logDebug: (message: string, context?: LogContext) => void;
export declare const logAuth: (message: string, context?: LogContext) => void;
export declare const logSecurity: (message: string, context?: LogContext) => void;
export declare const logPerformance: (message: string, context?: LogContext) => void;
export declare const logDatabase: (message: string, context?: LogContext) => void;
export declare const logExternalService: (message: string, service: string, context?: LogContext) => void;
export declare const logFileOperation: (message: string, context?: LogContext) => void;
export declare const logApiCall: (message: string, endpoint: string, method: string, statusCode: number, responseTime: number, context?: LogContext) => void;
export declare const logCriticalError: (message: string, error?: Error, context?: LogContext) => void;
export declare const logUserAction: (userId: string, action: string, resource: string, result: "success" | "failure", context?: LogContext) => void;
export declare const logDiagnosisRequest: (userId: string, diagnosisId: string, cropType: string, context?: LogContext) => void;
export declare const logExpertConsultation: (userId: string, expertId: string, consultationType: string, status: string, context?: LogContext) => void;
export declare const sanitizeLogData: (data: Record<string, unknown>) => Record<string, unknown>;
export declare const loggerHealthCheck: () => {
    status: "healthy" | "unhealthy";
    details: Record<string, unknown>;
};
export { logger };
export default logger;
//# sourceMappingURL=logger.d.ts.map