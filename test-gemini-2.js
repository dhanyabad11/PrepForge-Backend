#!/usr/bin/env node

/**
 * Test Gemini 2.0 Flash model integration
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");

dotenv.config();

async function testGemini2Flash() {
    console.log("🚀 Testing Gemini 2.0 Flash Integration\n");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.log("❌ No Gemini API key found");
        return;
    }

    console.log("✅ API Key found:", apiKey.substring(0, 10) + "...");
    const genAI = new GoogleGenerativeAI(apiKey);

    // Test different model names for Gemini 2.0 Flash
    const modelNames = [
        "gemini-2.0-flash-exp",
        "gemini-2.0-flash",
        "models/gemini-2.0-flash-exp",
        "models/gemini-2.0-flash",
    ];

    for (const modelName of modelNames) {
        console.log(`\n🤖 Testing model: ${modelName}`);

        try {
            const model = genAI.getGenerativeModel({ model: modelName });

            const testPrompt =
                "Generate 2 interview questions for a Software Engineer position. Format: numbered list.";

            const result = await model.generateContent(testPrompt);
            const response = await result.response;
            const text = response.text();

            console.log(`✅ ${modelName} works!`);
            console.log("Sample output:");
            console.log(text.substring(0, 200) + "...\n");

            // If successful, test feedback generation
            console.log("🔍 Testing feedback generation...");
            const feedbackPrompt = `Provide brief feedback (2 sentences) for this answer: "I have 3 years of JavaScript experience and built several React apps."`;

            const feedbackResult = await model.generateContent(feedbackPrompt);
            const feedbackResponse = await feedbackResult.response;
            const feedbackText = feedbackResponse.text();

            console.log("✅ Feedback generation successful:");
            console.log(feedbackText);

            console.log(`\n🎉 ${modelName} is working perfectly!`);
            return; // Exit after first successful model
        } catch (error) {
            console.log(`❌ ${modelName} failed:`);
            console.log(`   ${error.message}\n`);
        }
    }

    console.log("❌ All Gemini 2.0 Flash model variants failed");
}

testGemini2Flash().catch(console.error);
