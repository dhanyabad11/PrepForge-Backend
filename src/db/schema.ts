import { pgTable, text, timestamp, serial, jsonb } from "drizzle-orm/pg-core";

// Users table
export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    googleId: text("google_id").unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Interviews table
export const interviews = pgTable("interviews", {
    id: serial("id").primaryKey(),
    userId: serial("user_id")
        .references(() => users.id)
        .notNull(),
    jobRole: text("job_role").notNull(),
    company: text("company").notNull(),
    experience: text("experience").notNull(),
    questions: jsonb("questions").notNull(), // Store questions as JSON
    feedback: jsonb("feedback"), // Store AI feedback as JSON
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Interview = typeof interviews.$inferSelect;
export type NewInterview = typeof interviews.$inferInsert;
