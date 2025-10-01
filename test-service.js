#!/usr/bin/env node

/**
 * Complete AI Service Integration Test
 * Tests the updated AIService class with Gemini 2.0 Flash
 */

const path = require("path");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Import the AIService (compiled TypeScript)
async function testAIService() {
    console.log("🧪 Testing Complete AI Service Integration\n");

    try {
        // Import the TypeScript AI service (we'll compile it first)
        const { exec } = require("child_process");
        const { promisify } = require("util");
        const execAsync = promisify(exec);

        console.log("🔧 Compiling TypeScript...");
        await execAsync("npx tsc");
        console.log("✅ TypeScript compiled successfully\n");

        // Import the compiled JavaScript
        const { AIService } = require("./dist/services/ai.service.js");

        const aiService = new AIService();

        console.log("🤖 AI Service Status:");
        console.log("- AI Enabled:", aiService.isAIEnabled());
        console.log("- Model Info:", aiService.getModelInfo());
        console.log("");

        if (aiService.isAIEnabled()) {
            // Test question generation
            console.log("📚 Testing Question Generation...");
            const questions = await aiService.generateQuestions("Software Engineer", "Google");

            console.log(`✅ Generated ${questions.length} questions:`);
            questions.forEach((q, i) => {
                console.log(`${i + 1}. ${q}`);
            });
            console.log("");

            // Test feedback generation
            console.log("💬 Testing Feedback Generation...");
            const testAnswer =
                "I have experience with React, Node.js, and PostgreSQL. I built an e-commerce platform that handles 1000+ users daily.";
            const feedback = await aiService.generateFeedback(
                "Tell me about your technical experience",
                testAnswer
            );

            console.log("✅ Generated feedback:");
            console.log(feedback);
            console.log("");
        }

        console.log("🎉 AI Service Integration Test Complete!");
    } catch (error) {
        console.error("❌ Test failed:", error.message);
    }
}

testAIService().catch(console.error);
