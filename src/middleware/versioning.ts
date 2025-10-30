import { Request, Response, NextFunction } from "express";

// API versioning middleware
export const apiVersion = (version: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        res.setHeader("API-Version", version);
        next();
    };
};

// Deprecation notice middleware
export const deprecationNotice = (message: string, sunsetDate?: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        res.setHeader("Deprecation", "true");
        res.setHeader("X-Deprecation-Notice", message);
        
        if (sunsetDate) {
            res.setHeader("Sunset", sunsetDate);
        }
        
        next();
    };
};
