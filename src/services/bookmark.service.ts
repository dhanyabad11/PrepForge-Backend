import { db } from "../lib/db";
import { savedQuestionSets } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";
import logger from "../utils/logger";

export class BookmarkService {
    // Save a question set
    static async saveQuestionSet(
        userId: number,
        title: string,
        questions: any[],
        options?: {
            description?: string;
            tags?: string[];
            interviewId?: number;
        }
    ) {
        try {
            const [saved] = await db
                .insert(savedQuestionSets)
                .values({
                    userId,
                    title,
                    questions,
                    description: options?.description,
                    tags: options?.tags || [],
                    interviewId: options?.interviewId,
                })
                .returning();

            logger.info("Question set saved", { userId, setId: saved.id });
            return saved;
        } catch (error) {
            logger.error("Error saving question set:", error);
            throw new Error("Failed to save question set");
        }
    }

    // Remove a saved question set
    static async removeQuestionSet(setId: number, userId: number) {
        try {
            const deleted = await db
                .delete(savedQuestionSets)
                .where(and(eq(savedQuestionSets.id, setId), eq(savedQuestionSets.userId, userId)))
                .returning();

            if (deleted.length === 0) {
                throw new Error("Question set not found or unauthorized");
            }

            logger.info("Question set removed", { userId, setId });
            return { success: true };
        } catch (error) {
            logger.error("Error removing question set:", error);
            throw error;
        }
    }

    // Get all saved question sets for a user
    static async getUserQuestionSets(userId: number, tag?: string) {
        try {
            let sets = await db
                .select()
                .from(savedQuestionSets)
                .where(eq(savedQuestionSets.userId, userId))
                .orderBy(desc(savedQuestionSets.createdAt));

            // Filter by tag if provided
            if (tag) {
                sets = sets.filter((set) =>
                    Array.isArray(set.tags) ? set.tags.includes(tag) : false
                );
            }

            logger.info("Question sets retrieved", {
                userId,
                count: sets.length,
                tag,
            });

            return sets;
        } catch (error) {
            logger.error("Error fetching question sets:", error);
            throw new Error("Failed to fetch question sets");
        }
    }

    // Toggle favorite status
    static async toggleFavorite(setId: number, userId: number) {
        try {
            const [set] = await db
                .select()
                .from(savedQuestionSets)
                .where(and(eq(savedQuestionSets.id, setId), eq(savedQuestionSets.userId, userId)));

            if (!set) {
                throw new Error("Question set not found");
            }

            const [updated] = await db
                .update(savedQuestionSets)
                .set({ isFavorite: !set.isFavorite })
                .where(eq(savedQuestionSets.id, setId))
                .returning();

            logger.info("Favorite toggled", { userId, setId, isFavorite: updated.isFavorite });
            return updated;
        } catch (error) {
            logger.error("Error toggling favorite:", error);
            throw error;
        }
    }

    // Increment practice count
    static async incrementPracticeCount(setId: number, userId: number) {
        try {
            const [set] = await db
                .select()
                .from(savedQuestionSets)
                .where(and(eq(savedQuestionSets.id, setId), eq(savedQuestionSets.userId, userId)));

            if (!set) {
                throw new Error("Question set not found");
            }

            const [updated] = await db
                .update(savedQuestionSets)
                .set({ practiceCount: (set.practiceCount || 0) + 1 })
                .where(eq(savedQuestionSets.id, setId))
                .returning();

            return updated;
        } catch (error) {
            logger.error("Error incrementing practice count:", error);
            throw error;
        }
    }

    // Get all tags for a user
    static async getUserTags(userId: number) {
        try {
            const sets = await db
                .select()
                .from(savedQuestionSets)
                .where(eq(savedQuestionSets.userId, userId));

            const allTags = sets.flatMap((set) => (Array.isArray(set.tags) ? set.tags : []));
            const uniqueTags = [...new Set(allTags)];

            return uniqueTags;
        } catch (error) {
            logger.error("Error fetching tags:", error);
            throw new Error("Failed to fetch tags");
        }
    }
}
