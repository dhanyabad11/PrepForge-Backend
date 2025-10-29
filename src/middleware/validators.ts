import { body, param, query, validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";

// Middleware to check validation results
export const validate = (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: "Validation failed",
            details: errors.array().map((err) => ({
                field: err.type === "field" ? err.path : "unknown",
                message: err.msg,
            })),
        });
    }
    next();
};

// Question generation validation
export const validateQuestionGeneration = [
    body("jobRole")
        .trim()
        .notEmpty()
        .withMessage("Job role is required")
        .isLength({ min: 2, max: 100 })
        .withMessage("Job role must be between 2 and 100 characters")
        .escape(),
    body("company")
        .trim()
        .notEmpty()
        .withMessage("Company is required")
        .isLength({ min: 2, max: 100 })
        .withMessage("Company must be between 2 and 100 characters")
        .escape(),
    body("userId")
        .optional()
        .trim()
        .isLength({ min: 1, max: 255 })
        .withMessage("User ID must be between 1 and 255 characters")
        .escape(),
    body("experience")
        .optional()
        .trim()
        .isIn(["entry-level", "mid-level", "senior", "lead"])
        .withMessage("Invalid experience level"),
    body("difficulty")
        .optional()
        .isIn(["easy", "medium", "hard"])
        .withMessage("Difficulty must be easy, medium, or hard"),
    body("numberOfQuestions")
        .optional()
        .isInt({ min: 1, max: 20 })
        .withMessage("Number of questions must be between 1 and 20"),
    body("questionType")
        .optional()
        .isIn(["behavioral", "technical", "situational", "all"])
        .withMessage("Invalid question type"),
    validate,
];

// Feedback generation validation
export const validateFeedbackGeneration = [
    body("question")
        .trim()
        .notEmpty()
        .withMessage("Question is required")
        .isLength({ min: 5, max: 1000 })
        .withMessage("Question must be between 5 and 1000 characters"),
    body("answer")
        .trim()
        .notEmpty()
        .withMessage("Answer is required")
        .isLength({ min: 10, max: 5000 })
        .withMessage("Answer must be between 10 and 5000 characters"),
    body("userId").optional().trim().escape(),
    body("interviewId").optional().trim().escape(),
    body("questionId").optional().trim().escape(),
    validate,
];

// User ID parameter validation
export const validateUserId = [
    param("userId").isInt({ min: 1 }).withMessage("User ID must be a positive integer"),
    validate,
];

// Interview ID parameter validation
export const validateInterviewId = [
    param("id").isInt({ min: 1 }).withMessage("Interview ID must be a positive integer"),
    validate,
];

// Pagination validation
export const validatePagination = [
    query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100"),
    validate,
];
