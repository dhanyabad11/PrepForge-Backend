// Load environment variables first, before any other imports
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import apiRoutes from "./routes/api.routes";
import databaseRoutes from "./routes/database.routes";

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
    cors({
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        credentials: true,
    })
);
app.use(express.json());

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
