import { db } from "../lib/db";
import {
    users,
    interviews,
    answers,
    userProgress,
    type User,
    type NewUser,
    type Interview,
    type NewInterview,
    type Answer,
    type NewAnswer,
    type UserProgress,
    type NewUserProgress,
} from "../db/schema";
import { eq, desc, count, avg } from "drizzle-orm";

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

    async getInterviewDetails(
        interviewId: number
    ): Promise<{ interview: Interview; answers: Answer[] } | null> {
        const [interview] = await db
            .select()
            .from(interviews)
            .where(eq(interviews.id, interviewId))
            .limit(1);

        if (!interview) {
            return null;
        }

        const interviewAnswers = await this.getAnswersForInterview(interviewId);

        return {
            interview,
            answers: interviewAnswers,
        };
    }

    async getUserStats(userId: number) {
        const interviewStats = await db
            .select({
                totalInterviews: count(interviews.id),
            })
            .from(interviews)
            .where(eq(interviews.userId, userId));

        const answerStats = await db
            .select({
                totalAnswers: count(answers.id),
                avgRelevance: avg(answers.relevanceScore),
                avgClarity: avg(answers.clarityScore),
                avgDepth: avg(answers.depthScore),
            })
            .from(answers)
            .where(eq(answers.userId, userId));

        const progress = await this.getUserProgress(userId);

        return {
            totalInterviews: interviewStats[0]?.totalInterviews || 0,
            totalAnswers: answerStats[0]?.totalAnswers || 0,
            averageRelevance: parseFloat(answerStats[0]?.avgRelevance || "0").toFixed(1),
            averageClarity: parseFloat(answerStats[0]?.avgClarity || "0").toFixed(1),
            averageDepth: parseFloat(answerStats[0]?.avgDepth || "0").toFixed(1),
            ...progress,
        };
    }

    // Answer Operations
    async saveAnswer(answerData: NewAnswer): Promise<Answer> {
        const [savedAnswer] = await db.insert(answers).values(answerData).returning();
        // After saving an answer, update user progress
        await this.updateUserProgress(answerData.userId, {
            relevanceScore: savedAnswer.relevanceScore,
            clarityScore: savedAnswer.clarityScore,
            depthScore: savedAnswer.depthScore,
        });
        return savedAnswer;
    }

    async getAnswersForInterview(interviewId: number): Promise<Answer[]> {
        return await db
            .select()
            .from(answers)
            .where(eq(answers.interviewId, interviewId))
            .orderBy(desc(answers.createdAt));
    }

    // User Progress Operations
    async updateUserProgress(
        userId: number,
        scores: {
            relevanceScore: number | null;
            clarityScore: number | null;
            depthScore: number | null;
        }
    ): Promise<UserProgress> {
        const existingProgress = await db
            .select()
            .from(userProgress)
            .where(eq(userProgress.userId, userId))
            .limit(1);

        if (existingProgress.length > 0) {
            const current = existingProgress[0];
            const newTotalAnswers = (current.totalQuestionsAnswered || 0) + 1;

            const newAverages = {
                averageScore:
                    ((current.averageScore || 0) * (current.totalQuestionsAnswered || 0) +
                        ((scores.relevanceScore || 0) +
                            (scores.clarityScore || 0) +
                            (scores.depthScore || 0)) /
                            3) /
                    newTotalAnswers,
            };

            const [updatedProgress] = await db
                .update(userProgress)
                .set({
                    totalQuestionsAnswered: newTotalAnswers,
                    averageScore: newAverages.averageScore,
                    lastPracticeDate: new Date(),
                    updatedAt: new Date(),
                })
                .where(eq(userProgress.userId, userId))
                .returning();
            return updatedProgress;
        } else {
            const [newProgress] = await db
                .insert(userProgress)
                .values({
                    userId,
                    totalQuestionsAnswered: 1,
                    averageScore:
                        ((scores.relevanceScore || 0) +
                            (scores.clarityScore || 0) +
                            (scores.depthScore || 0)) /
                        3,
                })
                .returning();
            return newProgress;
        }
    }

    async getUserProgress(userId: number): Promise<UserProgress | null> {
        const result = await db
            .select()
            .from(userProgress)
            .where(eq(userProgress.userId, userId))
            .limit(1);
        return result[0] || null;
    }
}
