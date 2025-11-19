// Load environment variables first, before any other imports
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import apiRoutes from "./routes/api.routes";
import databaseRoutes from "./routes/database.routes";
import historyRoutes from "./routes/history.routes";
import bookmarkRoutes from "./routes/bookmark.routes";
import { apiLimiter } from "./middleware/rateLimiter";
import logger, { logStream } from "./utils/logger";
import { healthCheck, livenessProbe, readinessProbe } from "./middleware/healthCheck";
import {
    requestIdMiddleware,
    performanceLogger,
    timeoutMiddleware,
} from "./middleware/performance";
import { apiVersion } from "./middleware/versioning";
import { GracefulShutdown } from "./utils/gracefulShutdown";

const app = express();
const PORT = parseInt(process.env.PORT || "5000", 10);

// CORS configuration for production (Vercel frontend)
const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3002",
    process.env.FRONTEND_URL,
    "https://prep-forge-frontend.vercel.app",
    "https://prep-forge-web.vercel.app",
    /https:\/\/prep-forge-frontend.*\.vercel\.app$/, // Allow all Vercel preview deployments
    /https:\/\/prep-forge-web.*\.vercel\.app$/, // New repo name
].filter(Boolean);

// Security and performance middleware
app.use(
    helmet({
        contentSecurityPolicy: false, // Disable CSP for API
        crossOriginEmbedderPolicy: false,
    })
);
app.use(compression()); // Response compression
app.use(requestIdMiddleware); // Request ID tracking
app.use(apiVersion); // API versioning

// Request logging
app.use(morgan("combined", { stream: logStream }));

// Performance monitoring
app.use(performanceLogger);

// Rate limiting
app.use("/api", apiLimiter);

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (mobile apps, Postman, etc.)
            if (!origin) return callback(null, true);

            // Check if origin is in allowed list or matches regex
            const isAllowed = allowedOrigins.some((allowed) => {
                if (typeof allowed === "string") return allowed === origin;
                if (allowed instanceof RegExp) return allowed.test(origin);
                return false;
            });

            if (isAllowed) {
                callback(null, true);
            } else {
                console.log("CORS blocked origin:", origin);
                callback(new Error("Not allowed by CORS"));
            }
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allowedHeaders: [
            "Content-Type",
            "Authorization",
            "x-user-email",
            "x-user-name",
            "x-user-image",
            "X-Request-ID",
        ],
        exposedHeaders: ["X-Request-ID", "X-API-Version"],
    })
);
app.use(express.json());

// Timeout middleware (30 seconds for long-running AI requests)
app.use(timeoutMiddleware(30000));

// Root endpoint - Welcome message
app.get("/", (req, res) => {
    res.json({
        name: "PrepForge API",
        version: "1.0.0",
        status: "running",
        message: "Welcome to PrepForge API - AI-Powered Interview Preparation",
        endpoints: {
            health: "/api/health",
            generateQuestions: "/api/generate-questions",
            generateFeedback: "/api/generate-feedback",
            database: "/api/db/*",
        },
        features: {
            security: "helmet.js",
            compression: "gzip",
            rateLimit: "express-rate-limit",
            monitoring: "winston + morgan",
            requestTracking: "UUID",
            gracefulShutdown: "enabled",
        },
        documentation: "https://github.com/dhanyabad11/PrepForge-Backend",
    });
});

// Routes
app.use("/api", apiRoutes);
app.use("/api/db", databaseRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/bookmarks", bookmarkRoutes);

// Health check endpoints
app.get("/health", healthCheck);
app.get("/health/live", livenessProbe);
app.get("/health/ready", readinessProbe);

// Legacy health check endpoint
app.get("/api/health", healthCheck);

// 404 handler
app.use((req, res, next) => {
    res.status(404).json({
        error: "Route not found",
        path: req.originalUrl,
    });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error("Error:", {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
    });

    res.status(err.status || 500).json({
        error: "Internal server error",
        message: process.env.NODE_ENV === "development" ? err.message : "Something went wrong",
    });
});

// Start server - Listen on all network interfaces for Render
const HOST = '0.0.0.0';
const server = app.listen(PORT, HOST, () => {
    logger.info(`🚀 PrepForge API server running on ${HOST}:${PORT}`);
    logger.info(`📝 Health check: http://localhost:${PORT}/health`);
    logger.info(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);
    logger.info(`🔒 Security: Helmet + CORS + Rate Limiting`);
    logger.info(`⚡ Performance: Compression + Request Tracking`);

    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "your_api_key_here") {
        logger.info(`🤖 AI Integration: ✅ Enabled with Google Gemini`);
        logger.info(`   🧠 Model: gemini-2.0-flash-exp`);
        logger.info(`   📚 Question Generation: ✅ Active`);
        logger.info(`   💬 Feedback Generation: ✅ Active`);
    } else {
        logger.warn(`🤖 AI Integration: ⚠️  Disabled (using fallback questions)`);
        logger.warn(`   💡 To enable AI: Set GEMINI_API_KEY in .env file`);
        logger.warn(`   🔗 Get API key: https://makersuite.google.com/app/apikey`);
    }
});

// Graceful shutdown disabled for Render compatibility
// new GracefulShutdown(server);

export default app;
