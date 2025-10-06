import {
    pgTable,
    serial,
    text,
    timestamp,
    integer,
    jsonb,
    boolean,
    real,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    email: text("email").notNull().unique(),
    name: text("name"),
    image: text("image"),
    googleId: text("google_id").unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const interviews = pgTable("interviews", {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
        .references(() => users.id)
        .notNull(),
    jobRole: text("job_role").notNull(),
    company: text("company").notNull(),
    experience: text("experience").notNull(),
    difficulty: text("difficulty").default("medium"), // easy, medium, hard
    questions: jsonb("questions").notNull(),
    feedback: jsonb("feedback"),
    status: text("status").default("in_progress"), // in_progress, completed, abandoned
    duration: integer("duration"), // in seconds
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// New table for detailed answer tracking
export const answers = pgTable("answers", {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
        .references(() => users.id)
        .notNull(),
    interviewId: integer("interview_id")
        .references(() => interviews.id)
        .notNull(),
    questionId: text("question_id").notNull(),
    question: text("question").notNull(),
    answer: text("answer").notNull(),

    // Detailed Scoring (1-10 scale for each criterion)
    relevanceScore: real("relevance_score"), // How relevant to the question
    clarityScore: real("clarity_score"), // How clear and well-structured
    depthScore: real("depth_score"), // Level of detail and insight
    communicationScore: real("communication_score"), // Communication effectiveness
    overallScore: real("overall_score"), // Average of all scores

    // AI-generated detailed feedback
    strengths: jsonb("strengths"), // Array of strength points
    improvements: jsonb("improvements"), // Array of improvement suggestions
    starMethodScore: jsonb("star_method_score"), // Situation, Task, Action, Result scoring
    exampleAnswer: text("example_answer"), // AI-generated better answer example

    // Metadata
    timeSpent: integer("time_spent"), // seconds spent on this question
    attemptNumber: integer("attempt_number").default(1),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

// New table for user progress and achievements
export const userProgress = pgTable("user_progress", {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
        .references(() => users.id)
        .notNull()
        .unique(),

    // Statistics
    totalInterviews: integer("total_interviews").default(0),
    completedInterviews: integer("completed_interviews").default(0),
    totalQuestionsAnswered: integer("total_questions_answered").default(0),
    averageScore: real("average_score").default(0),

    // Skill levels (1-100)
    behavioralSkill: integer("behavioral_skill").default(50),
    technicalSkill: integer("technical_skill").default(50),
    situationalSkill: integer("situational_skill").default(50),
    communicationSkill: integer("communication_skill").default(50),

    // Streaks
    currentStreak: integer("current_streak").default(0),
    longestStreak: integer("longest_streak").default(0),
    lastPracticeDate: timestamp("last_practice_date"),

    // Achievements
    achievements: jsonb("achievements").default([]),
    badges: jsonb("badges").default([]),

    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// New table for saved question sets (favorites)
export const savedQuestionSets = pgTable("saved_question_sets", {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
        .references(() => users.id)
        .notNull(),
    interviewId: integer("interview_id").references(() => interviews.id),
    title: text("title").notNull(),
    description: text("description"),
    questions: jsonb("questions").notNull(),
    tags: jsonb("tags").default([]),
    isFavorite: boolean("is_favorite").default(false),
    practiceCount: integer("practice_count").default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Interview = typeof interviews.$inferSelect;
export type NewInterview = typeof interviews.$inferInsert;
export type Answer = typeof answers.$inferSelect;
export type NewAnswer = typeof answers.$inferInsert;
export type UserProgress = typeof userProgress.$inferSelect;
export type NewUserProgress = typeof userProgress.$inferInsert;
export type SavedQuestionSet = typeof savedQuestionSets.$inferSelect;
export type NewSavedQuestionSet = typeof savedQuestionSets.$inferInsert;
