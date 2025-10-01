#!/usr/bin/env node

/**
 * Test basic Gemini API connectivity
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");

dotenv.config();

async function testBasicConnection() {
    console.log("🔍 Testing basic Gemini API connection...\n");

    const apiKey = process.env.GEMINI_API_KEY;
    console.log(
        "API Key (first 10 chars):",
        apiKey ? apiKey.substring(0, 10) + "..." : "Not found"
    );

    if (!apiKey) {
        console.log("❌ No Gemini API key found");
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Try with the basic gemini-pro model
    try {
        console.log("🤖 Testing with gemini-pro model...");
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const prompt = "Hello, can you respond with just 'Hello back!'?";
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log("✅ Success! Response:", text);
    } catch (error) {
        console.log("❌ Error details:");
        console.log("- Status:", error.status);
        console.log("- Message:", error.message);

        if (error.message.includes("API key")) {
            console.log("\n💡 Possible solutions:");
            console.log("1. Check if your API key is correct");
            console.log("2. Make sure the API key has Gemini API access enabled");
            console.log("3. Visit https://makersuite.google.com/app/apikey to verify");
        }

        if (error.message.includes("403")) {
            console.log("\n💡 This might be a permission issue with the API key");
        }

        if (error.message.includes("404")) {
            console.log("\n💡 The model might not be available in your region or plan");
        }
    }
}

testBasicConnection().catch(console.error);
