import logger from "../utils/logger";

export interface TimerConfig {
    easy: number; // seconds
    medium: number;
    hard: number;
}

export class QuestionTimerService {
    private static readonly DEFAULT_TIMERS: TimerConfig = {
        easy: 120, // 2 minutes
        medium: 180, // 3 minutes
        hard: 300, // 5 minutes
    };

    /**
     * Get recommended time for a question based on difficulty
     */
    static getRecommendedTime(difficulty: "easy" | "medium" | "hard"): number {
        return this.DEFAULT_TIMERS[difficulty];
    }

    /**
     * Calculate time performance score
     */
    static calculateTimeScore(
        timeSpent: number,
        recommendedTime: number
    ): {
        score: number;
        feedback: string;
    } {
        const ratio = timeSpent / recommendedTime;

        if (ratio <= 0.8) {
            return {
                score: 10,
                feedback: "Excellent! You answered quickly while maintaining quality.",
            };
        } else if (ratio <= 1.0) {
            return {
                score: 9,
                feedback: "Great timing! You used the recommended time effectively.",
            };
        } else if (ratio <= 1.2) {
            return {
                score: 7,
                feedback: "Good, but try to be more concise in real interviews.",
            };
        } else if (ratio <= 1.5) {
            return {
                score: 5,
                feedback: "You took a bit longer than recommended. Practice being more direct.",
            };
        } else {
            return {
                score: 3,
                feedback: "Too slow. Focus on structuring your thoughts before answering.",
            };
        }
    }

    /**
     * Generate difficulty-adjusted questions
     */
    static adjustQuestionDifficulty(
        baseQuestions: any[],
        difficulty: "easy" | "medium" | "hard"
    ): any[] {
        return baseQuestions.map((q) => ({
            ...q,
            difficulty,
            recommendedTime: this.getRecommendedTime(difficulty),
            tips: this.getDifficultyTips(difficulty),
        }));
    }

    /**
     * Get tips based on difficulty level
     */
    private static getDifficultyTips(
        difficulty: "easy" | "medium" | "hard"
    ): string[] {
        const tips = {
            easy: [
                "Keep your answer clear and concise",
                "Focus on the key points",
                "Use simple examples",
            ],
            medium: [
                "Structure your answer with introduction, body, and conclusion",
                "Provide specific examples from your experience",
                "Explain your thought process",
            ],
            hard: [
                "Use the STAR method (Situation, Task, Action, Result)",
                "Demonstrate deep technical or strategic thinking",
                "Show how you handle complex scenarios",
                "Include metrics and measurable outcomes",
            ],
        };

        return tips[difficulty];
    }
}
