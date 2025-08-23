import { Application } from 'express';
declare class App {
    app: Application;
    private readonly port;
    private readonly isDevelopment;
    constructor();
    private initializeMiddlewares;
    private initializeRoutes;
    private createApiRouter;
    private initializeErrorHandling;
    private handleError;
    private healthCheck;
    private checkDatabaseHealth;
    private checkCloudinaryHealth;
    private generateRequestId;
    private gracefulShutdown;
    private server;
    start(): Promise<void>;
}
export default App;
//# sourceMappingURL=app.d.ts.map