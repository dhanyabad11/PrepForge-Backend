// Load environment variables first, before any other imports
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import apiRoutes from "./routes/api.routes";
import databaseRoutes from "./routes/database.routes";
import { apiLimiter } from "./middleware/rateLimiter";
import logger, { logStream } from "./utils/logger";
import { healthCheck, livenessProbe, readinessProbe } from "./middleware/healthCheck";

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration for production (Vercel frontend)
const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3002",
    process.env.FRONTEND_URL,
    "https://prep-forge-frontend.vercel.app",
    /https:\/\/prep-forge-frontend.*\.vercel\.app$/, // Allow all Vercel preview deployments
].filter(Boolean);

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for API
    crossOriginEmbedderPolicy: false,
}));

// Request logging
app.use(morgan("combined", { stream: logStream }));

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
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: [
            "Content-Type",
            "Authorization",
            "x-user-email",
            "x-user-name",
            "x-user-image",
        ],
    })
);
app.use(express.json());

// Root endpoint - Welcome message
app.get("/", (req, res) => {
    res.json({
        name: "PrepForge API",
        version: "1.0.0",
        status: "running",
        message: "Welcome to PrepForge API! Visit /api/health for health check.",
        endpoints: {
            health: "/api/health",
            generateQuestions: "/api/generate-questions",
            generateFeedback: "/api/generate-feedback",
            database: "/api/db/*",
        },
        documentation: "https://github.com/dhanyabad11/PrepForge-Backend",
    });
});

// Root route
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
        documentation: "Visit https://github.com/dhanyabad11/PrepForge-Backend",
    });
});

// Routes
app.use("/api", apiRoutes);
app.use("/api/db", databaseRoutes);

// Health check endpoints
app.get("/health", healthCheck);
app.get("/health/live", livenessProbe);
app.get("/health/ready", readinessProbe);

// Legacy health check endpoint
app.get("/api/health", healthCheck); // 404 handler
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

// Start server
app.listen(PORT, () => {
    logger.info(`🚀 PrepForge API server running on port ${PORT}`);
    logger.info(`📝 Health check: http://localhost:${PORT}/health`);
    logger.info(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);

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

export default app;
