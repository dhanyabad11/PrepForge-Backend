// Load environment variables first, before any other imports
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import apiRoutes from "./routes/api.routes";
import databaseRoutes from "./routes/database.routes";

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration for production (Vercel frontend)
const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3002",
    process.env.FRONTEND_URL,
    /https:\/\/prepforge.*\.vercel\.app$/, // Allow all Vercel preview deployments
].filter(Boolean);

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

// Routes
app.use("/api", apiRoutes);
app.use("/api/db", databaseRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
    const aiEnabled = !!(
        process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "your_api_key_here"
    );

    res.json({
        status: "OK",
        message: "PrepForge API is running",
        timestamp: new Date().toISOString(),
        ai: {
            enabled: aiEnabled,
            models: aiEnabled
                ? {
                      questions: "gemini-2.0-flash-exp",
                      feedback: "gemini-2.0-flash-exp",
                  }
                : null,
            fallback: !aiEnabled ? "Using high-quality fallback questions" : null,
        },
        environment: process.env.NODE_ENV || "development",
    });
}); // 404 handler
app.use((req, res, next) => {
    res.status(404).json({
        error: "Route not found",
        path: req.originalUrl,
    });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Error:", err);
    res.status(500).json({
        error: "Internal server error",
        message: process.env.NODE_ENV === "development" ? err.message : "Something went wrong",
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 PrepForge API server running on port ${PORT}`);
    console.log(`📝 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);

    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "your_api_key_here") {
        console.log(`🤖 AI Integration: ✅ Enabled with Google Gemini`);
        console.log(`   🧠 Model: gemini-2.0-flash-exp`);
        console.log(`   📚 Question Generation: ✅ Active`);
        console.log(`   💬 Feedback Generation: ✅ Active`);
    } else {
        console.log(`🤖 AI Integration: ⚠️  Disabled (using fallback questions)`);
        console.log(`   💡 To enable AI: Set GEMINI_API_KEY in .env file`);
        console.log(`   🔗 Get API key: https://makersuite.google.com/app/apikey`);
    }
});

export default app;
