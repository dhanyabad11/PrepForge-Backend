require("dotenv").config();

const { neon } = require("@neondatabase/serverless");

const sql = neon(process.env.DATABASE_URL);

async function testConnection() {
    try {
        console.log("Testing Neon database connection...");
        console.log("Using DATABASE_URL:", process.env.DATABASE_URL ? "Found" : "Missing");

        const result = await sql`SELECT version()`;
        const { version } = result[0];

        console.log("✅ Connection successful!");
        console.log("PostgreSQL version:", version);

        // Test creating a simple table
        console.log("\nTesting table creation...");
        await sql`CREATE TABLE IF NOT EXISTS test_table (id SERIAL PRIMARY KEY, name TEXT)`;
        console.log("✅ Table creation successful!");

        // Clean up
        await sql`DROP TABLE IF EXISTS test_table`;
        console.log("✅ Cleanup successful!");
    } catch (error) {
        console.error("❌ Connection failed:", error.message);
        process.exit(1);
    }
}

testConnection();
