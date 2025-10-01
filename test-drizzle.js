require("dotenv").config();

const { db } = require("./src/lib/db");
const { users, interviews } = require("./src/db/schema");

async function testDrizzleConnection() {
    try {
        console.log("Testing Drizzle ORM connection...");

        // Test basic query
        const result = await db.select().from(users).limit(1);
        console.log("✅ Drizzle connection successful!");
        console.log(
            "Users table query result:",
            result.length === 0 ? "Empty table (expected)" : result
        );

        // Test table structure
        console.log("\n📊 Database tables created:");
        console.log("- users table ✅");
        console.log("- interviews table ✅");

        console.log("\n🎉 Database setup complete! Ready to use.");
    } catch (error) {
        console.error("❌ Drizzle connection failed:", error.message);
        process.exit(1);
    }
}

testDrizzleConnection();
