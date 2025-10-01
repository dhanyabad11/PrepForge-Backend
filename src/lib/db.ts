import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../db/schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
}

// Configure postgres client with proper settings for Neon
const client = postgres(connectionString, {
    prepare: false,
    ssl: "require",
    connection: {
        application_name: "prepforge-backend",
    },
    max: 1, // Limit connections for serverless environments
    idle_timeout: 20,
    connect_timeout: 10,
});

export const db = drizzle(client, { schema });
