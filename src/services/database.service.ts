import { db } from "../lib/db";
import {
    users,
    interviews,
    type User,
    type NewUser,
    type Interview,
    type NewInterview,
} from "../db/schema";
import { eq, desc, count } from "drizzle-orm";

export class DatabaseService {
    async createOrUpdateUser(userData: {
        email: string;
        name?: string | null;
        googleId: string;
    }): Promise<User> {
        const existingUser = await db
            .select()
            .from(users)
            .where(eq(users.email, userData.email))
            .limit(1);

        if (existingUser.length > 0) {
            const [updatedUser] = await db
                .update(users)
                .set({
                    name: userData.name || existingUser[0].name,
                    updatedAt: new Date(),
                })
                .where(eq(users.email, userData.email))
                .returning();
            return updatedUser;
        } else {
            const [newUser] = await db
                .insert(users)
                .values({
                    email: userData.email,
                    name: userData.name || "User",
                    googleId: userData.googleId,
                })
                .returning();
            return newUser;
        }
    }

    async getUserByEmail(email: string): Promise<User | null> {
        const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
        return result[0] || null;
    }

    async testConnection(): Promise<{ success: boolean; message: string }> {
        try {
            await db.select().from(users).limit(1);
            return { success: true, message: "Database connection successful" };
        } catch (error: any) {
            return {
                success: false,
                message: `Database connection failed: ${error.message}`,
            };
        }
    }

    // Interview Operations
    async createInterview(
        userId: number,
        jobRole: string,
        company: string,
        experience: string,
        questions: any[]
    ): Promise<Interview> {
        const [interview] = await db
            .insert(interviews)
            .values({
                userId,
                jobRole,
                company,
                experience,
                questions: questions,
            })
            .returning();
        return interview;
    }

    async getUserInterviews(userId: number): Promise<Interview[]> {
        return await db
            .select()
            .from(interviews)
            .where(eq(interviews.userId, userId))
            .orderBy(desc(interviews.createdAt));
    }

    async getUserStats(userId: number) {
        const [interviewCount] = await db
            .select({ count: count() })
            .from(interviews)
            .where(eq(interviews.userId, userId));

        return {
            totalInterviews: interviewCount.count,
            completedInterviews: interviewCount.count,
            totalQuestions: 0,
            averageScore: 0,
        };
    }

    // Placeholder methods for compatibility
    async createQuestionSet(userId: string, data: any) {
        // Convert userId to number and validate
        const numericUserId = parseInt(userId);
        if (isNaN(numericUserId)) {
            throw new Error(`Invalid userId: ${userId} cannot be converted to number`);
        }

        // Create an interview record instead
        return await this.createInterview(
            numericUserId,
            data.jobRole || "Software Engineer",
            data.company || "TechCorp",
            data.experience || "Mid-level",
            data.questions || []
        );
    }

    async getUserQuestionSets(userId: number) {
        return await this.getUserInterviews(userId);
    }

    async getQuestionSetById(id: string, userId: number) {
        const result = await db
            .select()
            .from(interviews)
            .where(eq(interviews.id, parseInt(id)))
            .limit(1);
        return result[0] || null;
    }

    async bookmarkQuestionSet(id: string, userId: number, isBookmarked: boolean) {
        // Placeholder - could extend schema later for bookmarks
        return true;
    }

    async saveInterviewResponse(data: any) {
        // Placeholder - could extend schema later for individual responses
        return true;
    }

    async updateInterviewProgress(interviewId: string, questionIndex: number) {
        // Placeholder - could extend schema later for progress tracking
        return true;
    }

    async completeInterview(interviewId: string) {
        // Placeholder - could extend schema later for completion status
        return true;
    }
}
