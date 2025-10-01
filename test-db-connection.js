const { Client } = require("pg");

async function testConnection() {
    // Test different possible host formats
    const connectionStrings = [
        "postgresql://postgres:116ef012%40pinku@db.solaqtjrstzrbgetsqzc.supabase.co:5432/postgres?sslmode=require",
        "postgresql://postgres:116ef012%40pinku@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require",
        "postgresql://postgres:116ef012%40pinku@db.solaqtjrstzrbgetsqzc.supabase.co:6543/postgres?sslmode=require",
    ];

    for (let i = 0; i < connectionStrings.length; i++) {
        console.log(`\n🔍 Testing connection ${i + 1}...`);
        console.log(`📡 Host: ${connectionStrings[i].split("@")[1].split(":")[0]}`);

        const client = new Client({
            connectionString: connectionStrings[i],
        });

        try {
            console.log("🔍 Testing Supabase connection...");
            await client.connect();
            console.log("✅ Database connection successful!");

            const result = await client.query("SELECT version()");
            console.log("📊 Database version:", result.rows[0].version);
        } catch (error) {
            console.error("❌ Connection failed:", error.message);
        } finally {
            try {
                await client.end();
            } catch (e) {
                // Ignore cleanup errors
            }
        }
    }

    console.error("\n🔧 All connections failed. Possible solutions:");
    console.error("   1. Check if Supabase project is active/unpaused");
    console.error("   2. Verify password and project ID are correct");
    console.error("   3. Check network restrictions in Supabase settings");
    console.error("   4. Try getting fresh connection details from Supabase dashboard");
}

testConnection();
