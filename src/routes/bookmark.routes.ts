import express, { Request, Response } from "express";
import { BookmarkService } from "../services/bookmark.service";
import { body, param, query } from "express-validator";
import { validate } from "../middleware/validators";
import logger from "../utils/logger";

const router = express.Router();

// Save a question set
router.post(
    "/save",
    [
        body("userId").isInt().withMessage("User ID must be an integer"),
        body("title").isString().trim().notEmpty().withMessage("Title is required"),
        body("questions").isArray().withMessage("Questions must be an array"),
        body("description").optional().isString(),
        body("tags").optional().isArray(),
        body("interviewId").optional().isInt(),
        validate,
    ],
    async (req: Request, res: Response) => {
        try {
            const { userId, title, questions, description, tags, interviewId } = req.body;

            const saved = await BookmarkService.saveQuestionSet(userId, title, questions, {
                description,
                tags,
                interviewId,
            });

            res.json({
                success: true,
                data: saved,
            });
        } catch (error: any) {
            logger.error("Error saving question set:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to save question set",
            });
        }
    }
);

// Get all saved question sets for a user
router.get(
    "/user/:userId",
    [
        param("userId").isInt().withMessage("User ID must be an integer"),
        query("tag").optional().isString(),
        validate,
    ],
    async (req: Request, res: Response) => {
        try {
            const userId = parseInt(req.params.userId);
            const tag = req.query.tag as string | undefined;

            const sets = await BookmarkService.getUserQuestionSets(userId, tag);

            res.json({
                success: true,
                data: sets,
                count: sets.length,
            });
        } catch (error: any) {
            logger.error("Error fetching question sets:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to fetch question sets",
            });
        }
    }
);

// Toggle favorite status
router.patch(
    "/:setId/favorite",
    [
        param("setId").isInt().withMessage("Set ID must be an integer"),
        body("userId").isInt().withMessage("User ID must be an integer"),
        validate,
    ],
    async (req: Request, res: Response) => {
        try {
            const setId = parseInt(req.params.setId);
            const { userId } = req.body;

            const updated = await BookmarkService.toggleFavorite(setId, userId);

            res.json({
                success: true,
                data: updated,
            });
        } catch (error: any) {
            logger.error("Error toggling favorite:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to toggle favorite",
            });
        }
    }
);

// Increment practice count
router.post(
    "/:setId/practice",
    [
        param("setId").isInt().withMessage("Set ID must be an integer"),
        body("userId").isInt().withMessage("User ID must be an integer"),
        validate,
    ],
    async (req: Request, res: Response) => {
        try {
            const setId = parseInt(req.params.setId);
            const { userId } = req.body;

            const updated = await BookmarkService.incrementPracticeCount(setId, userId);

            res.json({
                success: true,
                data: updated,
            });
        } catch (error: any) {
            logger.error("Error incrementing practice count:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to increment practice count",
            });
        }
    }
);

// Delete a saved question set
router.delete(
    "/:setId",
    [
        param("setId").isInt().withMessage("Set ID must be an integer"),
        body("userId").isInt().withMessage("User ID must be an integer"),
        validate,
    ],
    async (req: Request, res: Response) => {
        try {
            const setId = parseInt(req.params.setId);
            const { userId } = req.body;

            await BookmarkService.removeQuestionSet(setId, userId);

            res.json({
                success: true,
                message: "Question set deleted successfully",
            });
        } catch (error: any) {
            logger.error("Error deleting question set:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to delete question set",
            });
        }
    }
);

// Get all tags for a user
router.get(
    "/user/:userId/tags",
    [param("userId").isInt().withMessage("User ID must be an integer"), validate],
    async (req: Request, res: Response) => {
        try {
            const userId = parseInt(req.params.userId);

            const tags = await BookmarkService.getUserTags(userId);

            res.json({
                success: true,
                data: tags,
            });
        } catch (error: any) {
            logger.error("Error fetching tags:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to fetch tags",
            });
        }
    }
);

export default router;
