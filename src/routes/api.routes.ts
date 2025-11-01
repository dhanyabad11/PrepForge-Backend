import express, { Request, Response } from "express";
import { AIService } from "../services/ai.service";
import { feedbackService } from "../services/feedback.service";
import { DatabaseService } from "../services/database.service";
import { aiLimiter } from "../middleware/rateLimiter";
import {
    validateQuestionGeneration,
    validateFeedbackGeneration,
    validateUserId,
} from "../middleware/validators";
import logger from "../utils/logger";

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
router.post(
    "/generate-questions",
    aiLimiter,
    validateQuestionGeneration,
    async (req: Request, res: Response) => {
        try {
            const {
                jobRole,
                company,
                experience,
                userId,
                difficulty,
                numberOfQuestions,
                questionType,
            } = req.body;

            logger.info("Generating questions", { jobRole, company, userId, difficulty });

            if (!jobRole || !company || !userId) {
                return res.status(400).json({
                    error: "Job role, company, and user ID are required",
                });
            }

            const validDifficulty =
                difficulty === "easy" || difficulty === "medium" || difficulty === "hard"
                    ? difficulty
                    : "medium";

            const validNumberOfQuestions =
                numberOfQuestions && [5, 10, 15, 20].includes(numberOfQuestions)
                    ? numberOfQuestions
                    : 5;

            const validQuestionType =
                questionType &&
                ["behavioral", "technical", "situational", "all"].includes(questionType)
                    ? questionType
                    : "all";

            const questions = await getAIService().generateQuestions(
                jobRole,
                company,
                experience || "mid-level",
                validDifficulty,
                validNumberOfQuestions,
                validQuestionType
            );

            // Try to create a new interview session in the database
            let interviewId: string | number = `temp-${Date.now()}`;
            try {
                const interview = await getDBService().createInterview(
                    userId,
                    jobRole,
                    company,
                    experience || "mid-level",
                    questions
                );
                interviewId = interview.id;
            } catch (dbError) {
                console.error("Database error (non-fatal):", dbError);
                // Continue without database - use temporary ID
            }

            res.json({
                success: true,
                questions,
                interviewId,
                jobRole,
                company,
            });
        } catch (error) {
            logger.error("Error in generate-questions:", error);
            res.status(500).json({
                error: "Failed to generate questions",
                message: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }
);

// Generate feedback for an answer and save it
router.post(
    "/generate-feedback",
    aiLimiter,
    validateFeedbackGeneration,
    async (req: Request, res: Response) => {
        try {
            const { question, answer, userId, interviewId, questionId, timeSpent } = req.body;

            if (!question || !answer || !userId || !interviewId || !questionId) {
                return res.status(400).json({
                    error: "Question, answer, userId, interviewId, and questionId are required",
                });
            }

            // 1. Get feedback from AI
            const feedback = await feedbackService.generateFeedback(question, answer);

            // 2. Calculate overall score
            const overallScore =
                (feedback.relevanceScore +
                    feedback.clarityScore +
                    feedback.depthScore +
                    feedback.starMethodScore) /
                4;

            // 3. Save the answer and feedback to the database
            const savedAnswer = await getDBService().saveAnswer({
                userId,
                interviewId,
                questionId,
                question,
                answer,
                relevanceScore: feedback.relevanceScore,
                clarityScore: feedback.clarityScore,
                depthScore: feedback.depthScore,
                overallScore: overallScore,
                strengths: feedback.overallFeedback ? [feedback.overallFeedback] : [],
                improvements: feedback.suggestion ? [feedback.suggestion] : [],
                starMethodScore: { overall: feedback.starMethodScore },
                timeSpent,
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
    }
);

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

// Get details for a specific interview
router.get("/interview-details/:interviewId", async (req, res) => {
    try {
        const interviewId = parseInt(req.params.interviewId, 10);
        if (isNaN(interviewId)) {
            return res.status(400).json({ error: "Invalid interview ID" });
        }

        const details = await getDBService().getInterviewDetails(interviewId);

        if (!details) {
            return res.status(404).json({ error: "Interview not found" });
        }

        res.json({ success: true, details });
    } catch (error) {
        console.error("Error fetching interview details:", error);
        res.status(500).json({
            error: "Failed to fetch interview details",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
});

// Generate a follow-up question
router.post("/generate-follow-up", async (req, res) => {
    try {
        const { originalQuestion, answer } = req.body;

        if (!originalQuestion || !answer) {
            return res.status(400).json({
                error: "Original question and answer are required",
            });
        }

        const followUpQuestion = await getAIService().generateFollowUpQuestion(
            originalQuestion,
            answer
        );

        res.json({
            success: true,
            followUpQuestion,
        });
    } catch (error) {
        console.error("Error generating follow-up question:", error);
        res.status(500).json({
            error: "Failed to generate follow-up question",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
});

// Get detailed analytics for a user
router.get("/analytics/:userId", async (req, res) => {
    try {
        const userId = parseInt(req.params.userId, 10);
        if (isNaN(userId)) {
            return res.status(400).json({ error: "Invalid user ID" });
        }

        const analytics = await getDBService().getDetailedAnalytics(userId);
        res.json({ success: true, analytics });
    } catch (error) {
        console.error("Error fetching analytics:", error);
        res.status(500).json({
            error: "Failed to fetch analytics",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
});

export default router;
