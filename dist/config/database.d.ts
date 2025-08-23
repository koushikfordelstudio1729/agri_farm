import mongoose from 'mongoose';
export declare const connectDatabase: () => Promise<typeof mongoose>;
export declare const disconnectDatabase: () => Promise<void>;
export declare const clearDatabase: () => Promise<void>;
export declare const getDatabaseInfo: () => Promise<{
    status: string;
    database: string;
    host: string;
    port: number;
    readyState: number;
    collections: string[];
}>;
export declare const healthCheck: () => Promise<{
    status: "up" | "down";
    responseTime: number;
    details: Record<string, unknown>;
}>;
declare const _default: {
    connectDatabase: () => Promise<typeof mongoose>;
    disconnectDatabase: () => Promise<void>;
    clearDatabase: () => Promise<void>;
    getDatabaseInfo: () => Promise<{
        status: string;
        database: string;
        host: string;
        port: number;
        readyState: number;
        collections: string[];
    }>;
    healthCheck: () => Promise<{
        status: "up" | "down";
        responseTime: number;
        details: Record<string, unknown>;
    }>;
};
export default _default;
//# sourceMappingURL=database.d.ts.map