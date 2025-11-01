import { Request, Response } from "express";
import { db } from "../lib/db";

interface HealthMetrics {
    status: "healthy" | "degraded" | "unhealthy";
    timestamp: string;
    uptime: number;
    version: string;
    environment: string;
    services: {
        database: {
            status: "up" | "down";
            responseTime?: number;
            error?: string;
        };
        ai: {
            status: "enabled" | "disabled";
            provider?: string;
            model?: string;
        };
    };
    system: {
        memory: {
            used: number;
            total: number;
            percentage: number;
        };
        cpu: {
            usage: number;
        };
    };
}

// Store server start time
const serverStartTime = Date.now();

// Check database health
async function checkDatabaseHealth(): Promise<{
    status: "up" | "down";
    responseTime?: number;
    error?: string;
}> {
    const startTime = Date.now();
    try {
        await db.execute("SELECT 1");
        return {
            status: "up",
            responseTime: Date.now() - startTime,
        };
    } catch (error) {
        return {
            status: "down",
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

// Get AI service status
function getAIStatus(): {
    status: "enabled" | "disabled";
    provider?: string;
    model?: string;
} {
    const aiEnabled = !!(
        process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "your_api_key_here"
    );

    if (aiEnabled) {
        return {
            status: "enabled",
            provider: "Google Gemini",
            model: "gemini-2.0-flash-exp",
        };
    }

    return {
        status: "disabled",
    };
}

// Get system metrics
function getSystemMetrics() {
    const memUsage = process.memoryUsage();
    const totalMem = memUsage.heapTotal;
    const usedMem = memUsage.heapUsed;

    return {
        memory: {
            used: Math.round(usedMem / 1024 / 1024), // MB
            total: Math.round(totalMem / 1024 / 1024), // MB
            percentage: Math.round((usedMem / totalMem) * 100),
        },
        cpu: {
            usage: Math.round(process.cpuUsage().user / 1000000), // Convert to seconds
        },
    };
}

// Main health check handler
export async function healthCheck(req: Request, res: Response) {
    try {
        const dbHealth = await checkDatabaseHealth();
        const aiStatus = getAIStatus();
        const systemMetrics = getSystemMetrics();

        const uptime = Math.floor((Date.now() - serverStartTime) / 1000); // seconds

        // Determine overall status
        let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";

        if (dbHealth.status === "down") {
            overallStatus = "degraded"; // App can work without DB
        }

        if (systemMetrics.memory.percentage > 90) {
            overallStatus = "degraded";
        }

        const metrics: HealthMetrics = {
            status: overallStatus,
            timestamp: new Date().toISOString(),
            uptime,
            version: process.env.npm_package_version || "1.0.0",
            environment: process.env.NODE_ENV || "development",
            services: {
                database: dbHealth,
                ai: aiStatus,
            },
            system: systemMetrics,
        };

        // Set appropriate status code
        const statusCode =
            overallStatus === "healthy" ? 200 : overallStatus === "degraded" ? 200 : 503;

        res.status(statusCode).json(metrics);
    } catch (error) {
        res.status(503).json({
            status: "unhealthy",
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : "Health check failed",
        });
    }
}

// Liveness probe - simple check if server is running
export function livenessProbe(req: Request, res: Response) {
    res.status(200).json({
        status: "alive",
        timestamp: new Date().toISOString(),
    });
}

// Readiness probe - check if server is ready to accept traffic
export async function readinessProbe(req: Request, res: Response) {
    try {
        const dbHealth = await checkDatabaseHealth();

        // Server is ready if database is up (or if we're in offline mode)
        const isReady = dbHealth.status === "up" || process.env.OFFLINE_MODE === "true";

        if (isReady) {
            res.status(200).json({
                status: "ready",
                timestamp: new Date().toISOString(),
            });
        } else {
            res.status(503).json({
                status: "not_ready",
                reason: "Database not available",
                timestamp: new Date().toISOString(),
            });
        }
    } catch (error) {
        res.status(503).json({
            status: "not_ready",
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: new Date().toISOString(),
        });
    }
}
