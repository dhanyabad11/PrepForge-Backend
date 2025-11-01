import { db } from "../lib/db";
import { interviews, answers, userProgress, users } from "../db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import logger from "../utils/logger";

export class HistoryService {
    /**
     * Get user's interview history with pagination
     */
    static async getUserInterviewHistory(userId: number, page: number = 1, limit: number = 10) {
        try {
            const offset = (page - 1) * limit;

            const userInterviews = await db
                .select({
                    id: interviews.id,
                    jobRole: interviews.jobRole,
                    company: interviews.company,
                    difficulty: interviews.difficulty,
                    status: interviews.status,
                    duration: interviews.duration,
                    createdAt: interviews.createdAt,
                    questionCount: sql<number>`jsonb_array_length(${interviews.questions})`,
                })
                .from(interviews)
                .where(eq(interviews.userId, userId))
                .orderBy(desc(interviews.createdAt))
                .limit(limit)
                .offset(offset);

            // Get total count
            const totalCount = await db
                .select({ count: sql<number>`count(*)` })
                .from(interviews)
                .where(eq(interviews.userId, userId));

            return {
                interviews: userInterviews,
                pagination: {
                    page,
                    limit,
                    total: Number(totalCount[0]?.count || 0),
                    totalPages: Math.ceil(Number(totalCount[0]?.count || 0) / limit),
                },
            };
        } catch (error) {
            logger.error("Error fetching interview history:", error);
            throw error;
        }
    }

    /**
     * Get detailed interview session with answers and feedback
     */
    static async getInterviewDetails(interviewId: number, userId: number) {
        try {
            const [interview] = await db
                .select()
                .from(interviews)
                .where(and(eq(interviews.id, interviewId), eq(interviews.userId, userId)));

            if (!interview) {
                throw new Error("Interview not found");
            }

            const interviewAnswers = await db
                .select()
                .from(answers)
                .where(eq(answers.interviewId, interviewId))
                .orderBy(answers.createdAt);

            return {
                ...interview,
                detailedAnswers: interviewAnswers,
            };
        } catch (error) {
            logger.error("Error fetching interview details:", error);
            throw error;
        }
    }

    /**
     * Get user's performance analytics
     */
    static async getUserAnalytics(userId: number, days: number = 30) {
        try {
            const dateThreshold = new Date();
            dateThreshold.setDate(dateThreshold.getDate() - days);

            // Get recent interviews
            const recentInterviews = await db
                .select()
                .from(interviews)
                .where(
                    and(
                        eq(interviews.userId, userId),
                        sql`${interviews.createdAt} >= ${dateThreshold}`
                    )
                )
                .orderBy(desc(interviews.createdAt));

            // Get answer statistics
            const answerStats = await db
                .select({
                    avgOverallScore: sql<number>`AVG(${answers.overallScore})`,
                    avgRelevanceScore: sql<number>`AVG(${answers.relevanceScore})`,
                    avgClarityScore: sql<number>`AVG(${answers.clarityScore})`,
                    avgDepthScore: sql<number>`AVG(${answers.depthScore})`,
                    avgCommunicationScore: sql<number>`AVG(${answers.communicationScore})`,
                    totalAnswers: sql<number>`COUNT(*)`,
                })
                .from(answers)
                .where(
                    and(eq(answers.userId, userId), sql`${answers.createdAt} >= ${dateThreshold}`)
                );

            // Get progress data
            const [progress] = await db
                .select()
                .from(userProgress)
                .where(eq(userProgress.userId, userId));

            // Calculate improvement trend
            const trend = await this.calculateImprovementTrend(userId, days);

            return {
                period: {
                    days,
                    startDate: dateThreshold,
                    endDate: new Date(),
                },
                overview: {
                    totalInterviews: recentInterviews.length,
                    completedInterviews: recentInterviews.filter((i) => i.status === "completed")
                        .length,
                    totalQuestionsAnswered: Number(answerStats[0]?.totalAnswers || 0),
                    averageScore: Number(answerStats[0]?.avgOverallScore || 0).toFixed(2),
                },
                scores: {
                    overall: Number(answerStats[0]?.avgOverallScore || 0).toFixed(2),
                    relevance: Number(answerStats[0]?.avgRelevanceScore || 0).toFixed(2),
                    clarity: Number(answerStats[0]?.avgClarityScore || 0).toFixed(2),
                    depth: Number(answerStats[0]?.avgDepthScore || 0).toFixed(2),
                    communication: Number(answerStats[0]?.avgCommunicationScore || 0).toFixed(2),
                },
                skills: {
                    behavioral: progress?.behavioralSkill || 50,
                    technical: progress?.technicalSkill || 50,
                    situational: progress?.situationalSkill || 50,
                    communication: progress?.communicationSkill || 50,
                },
                streaks: {
                    current: progress?.currentStreak || 0,
                    longest: progress?.longestStreak || 0,
                    lastPractice: progress?.lastPracticeDate,
                },
                trend,
                recentActivity: recentInterviews.slice(0, 5).map((interview) => ({
                    id: interview.id,
                    role: interview.jobRole,
                    company: interview.company,
                    date: interview.createdAt,
                    status: interview.status,
                })),
            };
        } catch (error) {
            logger.error("Error fetching user analytics:", error);
            throw error;
        }
    }

    /**
     * Calculate improvement trend over time
     */
    static async calculateImprovementTrend(userId: number, days: number) {
        try {
            const dateThreshold = new Date();
            dateThreshold.setDate(dateThreshold.getDate() - days);

            const weeklyScores = await db
                .select({
                    week: sql<string>`DATE_TRUNC('week', ${answers.createdAt})`,
                    avgScore: sql<number>`AVG(${answers.overallScore})`,
                    count: sql<number>`COUNT(*)`,
                })
                .from(answers)
                .where(
                    and(eq(answers.userId, userId), sql`${answers.createdAt} >= ${dateThreshold}`)
                )
                .groupBy(sql`DATE_TRUNC('week', ${answers.createdAt})`)
                .orderBy(sql`DATE_TRUNC('week', ${answers.createdAt})`);

            if (weeklyScores.length < 2) {
                return { trend: "neutral", change: 0, data: weeklyScores };
            }

            const firstWeek = Number(weeklyScores[0].avgScore);
            const lastWeek = Number(weeklyScores[weeklyScores.length - 1].avgScore);
            const change = ((lastWeek - firstWeek) / firstWeek) * 100;

            return {
                trend: change > 5 ? "improving" : change < -5 ? "declining" : "stable",
                change: Number(change.toFixed(2)),
                data: weeklyScores,
            };
        } catch (error) {
            logger.error("Error calculating improvement trend:", error);
            return { trend: "neutral", change: 0, data: [] };
        }
    }

    /**
     * Get user's strongest and weakest areas
     */
    static async getSkillBreakdown(userId: number) {
        try {
            const skillScores = await db
                .select({
                    avgRelevance: sql<number>`AVG(${answers.relevanceScore})`,
                    avgClarity: sql<number>`AVG(${answers.clarityScore})`,
                    avgDepth: sql<number>`AVG(${answers.depthScore})`,
                    avgCommunication: sql<number>`AVG(${answers.communicationScore})`,
                })
                .from(answers)
                .where(eq(answers.userId, userId));

            const scores = skillScores[0];
            const skills = [
                { name: "Relevance", score: Number(scores?.avgRelevance || 0) },
                { name: "Clarity", score: Number(scores?.avgClarity || 0) },
                { name: "Depth", score: Number(scores?.avgDepth || 0) },
                { name: "Communication", score: Number(scores?.avgCommunication || 0) },
            ];

            skills.sort((a, b) => b.score - a.score);

            return {
                strongest: skills.slice(0, 2),
                weakest: skills.slice(-2),
                allSkills: skills,
            };
        } catch (error) {
            logger.error("Error fetching skill breakdown:", error);
            throw error;
        }
    }
}
