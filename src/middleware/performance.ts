import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";

declare global {
    namespace Express {
        interface Request {
            id: string;
            startTime: number;
        }
    }
}

// Add unique request ID to each request
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
    req.id = uuidv4();
    req.startTime = Date.now();
    
    // Add request ID to response headers
    res.setHeader("X-Request-ID", req.id);
    
    next();
};

// Log request completion with performance metrics
export const performanceLogger = (req: Request, res: Response, next: NextFunction) => {
    // Store original end function
    const originalEnd = res.end;

    // Override end function to log performance
    res.end = function (this: Response, ...args: any[]) {
        const duration = Date.now() - req.startTime;
        
        // Log request completion
        console.log({
            requestId: req.id,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            userAgent: req.get("user-agent"),
            ip: req.ip,
        });

        // Call original end function
        // @ts-expect-error - args type complexity
        return originalEnd.apply(this, args);
    };

    next();
};

// Timeout middleware - 30 seconds default
export const timeoutMiddleware = (timeoutMs: number = 30000) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const timeout = setTimeout(() => {
            if (!res.headersSent) {
                res.status(408).json({
                    error: "Request timeout",
                    message: "The request took too long to process",
                    requestId: req.id,
                });
            }
        }, timeoutMs);

        // Clear timeout when response is sent
        res.on("finish", () => clearTimeout(timeout));
        res.on("close", () => clearTimeout(timeout));

        next();
    };
};
