import express from "express";
import { AIService } from "../services/ai.service";
import { DatabaseService } from "../services/database.service";
import { feedbackService } from "../services/feedback.service";
import { extractUserFromRequest } from "../utils/auth.utils";

const router = express.Router();

// Initialize services
let aiService: AIService | null = null;
let dbService: DatabaseService | null = null;

const getAIService = () => {
    if (!aiService) {
        aiService = new AIService();
    }
    return aiService;
};

const getDBService = () => {
    if (!dbService) {
        dbService = new DatabaseService();
    }
    return dbService;
};

// Middleware to extract user from session
const requireAuth = (req: any, res: any, next: any) => {
    const user = extractUserFromRequest(req);
    if (!user) {
        return res.status(401).json({ error: "Authentication required" });
    }
    req.user = user;
    next();
};

// Generate and save interview questions
router.post("/generate-questions", async (req, res) => {
    try {
        const { jobRole, company, userId } = req.body;

        if (!jobRole || !company) {
            return res.status(400).json({
                error: "Job role and company are required",
            });
        }

        // Generate questions using AI
        const experience = req.body.experience || "mid-level";
        const questions = await getAIService().generateQuestions(jobRole, company, experience);

        // If user is authenticated, try to save to database
        if (userId) {
            try {
                // First, get the user by email to get their numeric ID
                const user = await getDBService().getUserByEmail(userId); // userId is actually email

                if (user) {
                    // Create an interview with the generated questions
                    const interview = await getDBService().createInterview(
                        user.id,
                        jobRole,
                        company,
                        experience,
                        questions
                    );

                    res.json({
                        success: true,
                        questions,
                        jobRole,
                        company,
                        interviewId: interview.id,
                        saved: true,
                        message: "Questions generated and saved successfully",
                    });
                } else {
                    res.json({
                        success: true,
                        questions,
                        jobRole,
                        company,
                        saved: false,
                        message: "Questions generated successfully (user not found in database)",
                    });
                }
            } catch (dbError) {
                console.error("Database connection failed, continuing without saving:", dbError);
                // Still return questions even if database fails
                res.json({
                    success: true,
                    questions,
                    jobRole,
                    company,
                    saved: false,
                    message:
                        "Questions generated successfully (database unavailable - working in offline mode)",
                });
            }
        } else {
            res.json({
                success: true,
                questions,
                jobRole,
                company,
                saved: false,
                message: "Questions generated successfully",
            });
        }
    } catch (error) {
        console.error("Error in generate-questions:", error);
        res.status(500).json({
            error: "Failed to generate questions",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
});

// Get user's saved question sets (interviews)
router.get("/question-sets", requireAuth, async (req: any, res) => {
    try {
        const userEmail = req.user.email;
        const user = await getDBService().getUserByEmail(userEmail);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const interviews = await getDBService().getUserInterviews(user.id);

        res.json({
            success: true,
            questionSets: interviews,
        });
    } catch (error) {
        console.error("Error fetching question sets:", error);
        res.status(500).json({
            error: "Failed to fetch question sets",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
});

// Get specific question set (interview details)
router.get("/question-sets/:id", requireAuth, async (req: any, res) => {
    try {
        const { id } = req.params;
        const userEmail = req.user.email;
        const user = await getDBService().getUserByEmail(userEmail);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const interviewDetails = await getDBService().getInterviewDetails(parseInt(id));

        if (!interviewDetails) {
            return res.status(404).json({ error: "Question set not found" });
        }

        res.json({
            success: true,
            questionSet: interviewDetails,
        });
    } catch (error) {
        console.error("Error fetching question set:", error);
        res.status(500).json({
            error: "Failed to fetch question set",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
});

// Bookmark/unbookmark question set (placeholder - can be implemented later)
router.post("/question-sets/:id/bookmark", requireAuth, async (req: any, res) => {
    try {
        const { id } = req.params;
        const { isBookmarked } = req.body;
        const userEmail = req.user.email;
        const user = await getDBService().getUserByEmail(userEmail);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // TODO: Implement bookmark functionality in DatabaseService
        // For now, just return success
        res.json({
            success: true,
            message: isBookmarked ? "Question set bookmarked" : "Question set unbookmarked",
        });
    } catch (error) {
        console.error("Error bookmarking question set:", error);
        res.status(500).json({
            error: "Failed to bookmark question set",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
});

// Start mock interview
router.post("/interviews/start", requireAuth, async (req: any, res) => {
    try {
        const { questionSetId } = req.body;
        const userEmail = req.user.email;
        const user = await getDBService().getUserByEmail(userEmail);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const interview = await getDBService().createInterview(
            user.id,
            "Mock Interview",
            "Practice Company",
            "Practice",
            [] // Empty questions array for now
        );

        res.json({
            success: true,
            interview,
        });
    } catch (error) {
        console.error("Error starting interview:", error);
        res.status(500).json({
            error: "Failed to start interview",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
});

// Submit interview response
router.post("/interviews/:id/response", requireAuth, async (req: any, res) => {
    try {
        const { id: interviewId } = req.params;
        const { questionId, answer, question, userId } = req.body;
        const userEmail = req.user.email;
        const user = await getDBService().getUserByEmail(userEmail);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Generate AI feedback
        const feedback = await feedbackService.generateFeedback(question, answer);

        // Calculate overall score
        const overallScore =
            (feedback.relevanceScore +
                feedback.clarityScore +
                feedback.depthScore +
                feedback.starMethodScore) /
            4;

        // Save response
        const savedAnswer = await getDBService().saveAnswer({
            userId: user.id,
            interviewId: parseInt(interviewId),
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
        });

        res.json({
            success: true,
            feedback: savedAnswer,
        });
    } catch (error) {
        console.error("Error saving interview response:", error);
        res.status(500).json({
            error: "Failed to save response",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
});

// Complete interview (placeholder - status tracking can be added later)
router.post("/interviews/:id/complete", requireAuth, async (req: any, res) => {
    try {
        const { id: interviewId } = req.params;

        // TODO: Implement completeInterview method in DatabaseService
        // For now, just return success
        res.json({
            success: true,
            message: "Interview completed successfully",
        });
    } catch (error) {
        console.error("Error completing interview:", error);
        res.status(500).json({
            error: "Failed to complete interview",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
});

// Get user's interview history
router.get("/interviews", requireAuth, async (req: any, res) => {
    try {
        const userEmail = req.user.email;
        const user = await getDBService().getUserByEmail(userEmail);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const interviews = await getDBService().getUserInterviews(user.id);

        res.json({
            success: true,
            interviews,
        });
    } catch (error) {
        console.error("Error fetching interviews:", error);
        res.status(500).json({
            error: "Failed to fetch interviews",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
});

// Get user statistics
router.get("/stats", requireAuth, async (req: any, res) => {
    try {
        const userEmail = req.user.email;
        const user = await getDBService().getUserByEmail(userEmail);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const stats = await getDBService().getUserStats(user.id);

        res.json({
            success: true,
            stats,
        });
    } catch (error) {
        console.error("Error fetching user stats:", error);
        res.status(500).json({
            error: "Failed to fetch statistics",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
});

// User authentication/profile routes
router.post("/auth/user", async (req, res) => {
    try {
        const { email, name, image, googleId } = req.body;

        if (!email || !googleId) {
            return res.status(400).json({
                error: "Email and Google ID are required",
            });
        }

        try {
            const user = await getDBService().createOrUpdateUser({
                email,
                name,
                googleId,
            });

            res.json({
                success: true,
                user,
                message: "User authenticated and saved to database",
            });
        } catch (dbError) {
            console.error("Database connection failed for user auth, continuing:", dbError);
            // Return success even if database fails - app works in offline mode
            res.json({
                success: true,
                user: { email, name, image, googleId },
                message: "User authenticated (database unavailable - working in offline mode)",
                offline: true,
            });
        }
    } catch (error) {
        console.error("Error in user authentication:", error);
        res.status(500).json({
            error: "Failed to process user authentication",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
});

export default router;
