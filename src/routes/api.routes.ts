import express from "express";
import { AIService } from "../services/ai.service";
import { feedbackService } from "../services/feedback.service";
import { DatabaseService } from "../services/database.service";

const router = express.Router();

// Lazy initialization of services to ensure env vars are loaded
let aiService: AIService | null = null;
const getAIService = () => {
    if (!aiService) {
        aiService = new AIService();
    }
    return aiService;
};

let dbService: DatabaseService | null = null;
const getDBService = () => {
    if (!dbService) {
        dbService = new DatabaseService();
    }
    return dbService;
};

// Generate interview questions
router.post("/generate-questions", async (req, res) => {
    try {
        const { jobRole, company, experience, userId } = req.body;

        if (!jobRole || !company || !userId) {
            return res.status(400).json({
                error: "Job role, company, and user ID are required",
            });
        }

        const questions = await getAIService().generateQuestions(
            jobRole,
            company,
            experience || "mid-level"
        );

        // Create a new interview session in the database
        const interview = await getDBService().createInterview(
            userId,
            jobRole,
            company,
            experience || "mid-level",
            questions
        );

        res.json({
            success: true,
            questions,
            interviewId: interview.id,
            jobRole,
            company,
        });
    } catch (error) {
        console.error("Error in generate-questions:", error);
        res.status(500).json({
            error: "Failed to generate questions",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
});

// Generate feedback for an answer and save it
router.post("/generate-feedback", async (req, res) => {
    try {
        const { question, answer, userId, interviewId, questionId } = req.body;

        if (!question || !answer || !userId || !interviewId || !questionId) {
            return res.status(400).json({
                error: "Question, answer, userId, interviewId, and questionId are required",
            });
        }

        // 1. Get feedback from AI
        const feedback = await feedbackService.generateFeedback(question, answer);

        // 2. Save the answer and feedback to the database
        const savedAnswer = await getDBService().saveAnswer({
            userId,
            interviewId,
            questionId,
            question,
            answer,
            relevanceScore: feedback.relevanceScore,
            clarityScore: feedback.clarityScore,
            depthScore: feedback.depthScore,
            starMethodScore: feedback.starMethodScore,
            overallFeedback: feedback.overallFeedback,
            suggestion: feedback.suggestion,
        });

        res.json({
            success: true,
            feedback: savedAnswer,
        });
    } catch (error) {
        console.error("Error in generate-feedback:", error);
        res.status(500).json({
            error: "Failed to generate and save feedback",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
});

// Get user statistics
router.get("/user-stats/:userId", async (req, res) => {
    try {
        const userId = parseInt(req.params.userId, 10);
        if (isNaN(userId)) {
            return res.status(400).json({ error: "Invalid user ID" });
        }

        const stats = await getDBService().getUserStats(userId);
        res.json({ success: true, stats });
    } catch (error) {
        console.error("Error fetching user stats:", error);
        res.status(500).json({
            error: "Failed to fetch user stats",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
});

// Get user interview history
router.get("/interview-history/:userId", async (req, res) => {
    try {
        const userId = parseInt(req.params.userId, 10);
        if (isNaN(userId)) {
            return res.status(400).json({ error: "Invalid user ID" });
        }

        const interviews = await getDBService().getUserInterviews(userId);
        res.json({ success: true, interviews });
    } catch (error) {
        console.error("Error fetching interview history:", error);
        res.status(500).json({
            error: "Failed to fetch interview history",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
});

export default router;
