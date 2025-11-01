import express, { Request, Response } from "express";
import { body, param, query } from "express-validator";
import { validate } from "../middleware/validators";
import { HistoryService } from "../services/history.service";
import { QuestionTimerService } from "../services/timer.service";
import logger from "../utils/logger";

const router = express.Router();

/**
 * GET /api/history/interviews
 * Get user's interview history with pagination
 */
router.get(
    "/interviews",
    [
        query("page").optional().isInt({ min: 1 }).toInt(),
        query("limit").optional().isInt({ min: 1, max: 50 }).toInt(),
        validate,
    ],
    async (req: Request, res: Response) => {
        try {
            const userId = req.headers["x-user-id"] as string;
            if (!userId || userId === "anonymous") {
                return res.status(401).json({
                    error: "Authentication required to view history",
                });
            }

            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;

            const result = await HistoryService.getUserInterviewHistory(
                parseInt(userId),
                page,
                limit
            );

            res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            logger.error("Error fetching interview history:", error);
            res.status(500).json({
                error: "Failed to fetch interview history",
                message: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }
);

/**
 * GET /api/history/interviews/:id
 * Get detailed interview session
 */
router.get(
    "/interviews/:id",
    [param("id").isInt().toInt(), validate],
    async (req: Request, res: Response) => {
        try {
            const userId = req.headers["x-user-id"] as string;
            if (!userId || userId === "anonymous") {
                return res.status(401).json({
                    error: "Authentication required to view interview details",
                });
            }

            const interviewId = parseInt(req.params.id);
            const interview = await HistoryService.getInterviewDetails(
                interviewId,
                parseInt(userId)
            );

            res.json({
                success: true,
                data: interview,
            });
        } catch (error) {
            logger.error("Error fetching interview details:", error);
            res.status(500).json({
                error: "Failed to fetch interview details",
                message: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }
);

/**
 * GET /api/history/analytics
 * Get user's performance analytics
 */
router.get(
    "/analytics",
    [query("days").optional().isInt({ min: 1, max: 365 }).toInt(), validate],
    async (req: Request, res: Response) => {
        try {
            const userId = req.headers["x-user-id"] as string;
            if (!userId || userId === "anonymous") {
                return res.status(401).json({
                    error: "Authentication required to view analytics",
                });
            }

            const days = parseInt(req.query.days as string) || 30;
            const analytics = await HistoryService.getUserAnalytics(parseInt(userId), days);

            res.json({
                success: true,
                data: analytics,
            });
        } catch (error) {
            logger.error("Error fetching analytics:", error);
            res.status(500).json({
                error: "Failed to fetch analytics",
                message: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }
);

/**
 * GET /api/history/skills
 * Get user's skill breakdown
 */
router.get("/skills", async (req: Request, res: Response) => {
    try {
        const userId = req.headers["x-user-id"] as string;
        if (!userId || userId === "anonymous") {
            return res.status(401).json({
                error: "Authentication required to view skills",
            });
        }

        const skills = await HistoryService.getSkillBreakdown(parseInt(userId));

        res.json({
            success: true,
            data: skills,
        });
    } catch (error) {
        logger.error("Error fetching skill breakdown:", error);
        res.status(500).json({
            error: "Failed to fetch skill breakdown",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
});

/**
 * GET /api/history/timer-config
 * Get timer configuration for difficulty levels
 */
router.get("/timer-config", (req: Request, res: Response) => {
    const config = {
        easy: QuestionTimerService.getRecommendedTime("easy"),
        medium: QuestionTimerService.getRecommendedTime("medium"),
        hard: QuestionTimerService.getRecommendedTime("hard"),
    };

    res.json({
        success: true,
        data: config,
    });
});

export default router;
