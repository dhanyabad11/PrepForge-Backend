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

        const today = new Date();

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

            // Streak Logic
            let newCurrentStreak = current.currentStreak || 0;
            let newLongestStreak = current.longestStreak || 0;
            const lastPractice = current.lastPracticeDate
                ? new Date(current.lastPracticeDate)
                : null;

            if (lastPractice) {
                const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                const lastPracticeStart = new Date(
                    lastPractice.getFullYear(),
                    lastPractice.getMonth(),
                    lastPractice.getDate()
                );
                const diffTime = todayStart.getTime() - lastPracticeStart.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays === 1) {
                    newCurrentStreak++;
                } else if (diffDays > 1) {
                    newCurrentStreak = 1;
                }
            } else {
                newCurrentStreak = 1;
            }

            if (newCurrentStreak > newLongestStreak) {
                newLongestStreak = newCurrentStreak;
            }

            const [updatedProgress] = await db
                .update(userProgress)
                .set({
                    totalQuestionsAnswered: newTotalAnswers,
                    averageScore: newAverages.averageScore,
                    lastPracticeDate: today,
                    currentStreak: newCurrentStreak,
                    longestStreak: newLongestStreak,
                    updatedAt: today,
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
                    currentStreak: 1,
                    longestStreak: 1,
                    lastPracticeDate: today,
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

    // Performance Analytics Methods
    async getPerformanceOverTime(userId: number, days: number = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const performanceData = await db
            .select({
                date: answers.createdAt,
                avgRelevance: avg(answers.relevanceScore),
                avgClarity: avg(answers.clarityScore),
                avgDepth: avg(answers.depthScore),
                avgOverall: avg(answers.overallScore),
                count: count(answers.id),
            })
            .from(answers)
            .where(eq(answers.userId, userId))
            .groupBy(answers.createdAt)
            .orderBy(desc(answers.createdAt))
            .limit(days);

        return performanceData.map((item) => ({
            date: item.date,
            averageRelevance: parseFloat(item.avgRelevance || "0"),
            averageClarity: parseFloat(item.avgClarity || "0"),
            averageDepth: parseFloat(item.avgDepth || "0"),
            averageOverall: parseFloat(item.avgOverall || "0"),
            questionsAnswered: item.count,
        }));
    }

    async getWeakAreas(userId: number) {
        // Get all answers and analyze performance by question type
        const allAnswers = await db
            .select()
            .from(answers)
            .innerJoin(interviews, eq(answers.interviewId, interviews.id))
            .where(eq(answers.userId, userId));

        const scoresByType: Record<string, { total: number; count: number }> = {};
        const scoresByCategory: Record<string, { total: number; count: number }> = {};

        allAnswers.forEach(({ answers: ans, interviews: interview }) => {
            const questions = interview.questions as any[];
            const matchingQuestion = questions.find((q) => q.id === ans.questionId);

            if (matchingQuestion && ans.overallScore) {
                // By type
                const type = matchingQuestion.type || "unknown";
                if (!scoresByType[type]) {
                    scoresByType[type] = { total: 0, count: 0 };
                }
                scoresByType[type].total += ans.overallScore;
                scoresByType[type].count += 1;

                // By category
                const category = matchingQuestion.category || "general";
                if (!scoresByCategory[category]) {
                    scoresByCategory[category] = { total: 0, count: 0 };
                }
                scoresByCategory[category].total += ans.overallScore;
                scoresByCategory[category].count += 1;
            }
        });

        const weakTypes = Object.entries(scoresByType)
            .map(([type, data]) => ({
                type,
                averageScore: data.total / data.count,
                count: data.count,
            }))
            .sort((a, b) => a.averageScore - b.averageScore)
            .slice(0, 3);

        const weakCategories = Object.entries(scoresByCategory)
            .map(([category, data]) => ({
                category,
                averageScore: data.total / data.count,
                count: data.count,
            }))
            .sort((a, b) => a.averageScore - b.averageScore)
            .slice(0, 3);

        return {
            weakTypes,
            weakCategories,
        };
    }

    async getSkillProgression(userId: number) {
        const progress = await this.getUserProgress(userId);

        if (!progress) {
            return {
                behavioral: 50,
                technical: 50,
                situational: 50,
                communication: 50,
            };
        }

        return {
            behavioral: progress.behavioralSkill || 50,
            technical: progress.technicalSkill || 50,
            situational: progress.situationalSkill || 50,
            communication: progress.communicationSkill || 50,
        };
    }

    async getDetailedAnalytics(userId: number) {
        const [performanceOverTime, weakAreas, skillProgression, userStats] = await Promise.all([
            this.getPerformanceOverTime(userId, 30),
            this.getWeakAreas(userId),
            this.getSkillProgression(userId),
            this.getUserStats(userId),
        ]);

        return {
            performanceOverTime,
            weakAreas,
            skillProgression,
            userStats,
        };
    }
}
