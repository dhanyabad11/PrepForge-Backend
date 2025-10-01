#!/usr/bin/env node

/**
 * Gemini AI Integration Test Script
 * Tests the Google Gemini API integration
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

async function testGeminiIntegration() {
    console.log("🧪 Testing Gemini AI Integration for PrepForge\n");

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === "your_api_key_here") {
        console.log("❌ No valid Gemini API key found");
        console.log("💡 Set GEMINI_API_KEY in your .env file");
        console.log("🔗 Get API key: https://makersuite.google.com/app/apikey\n");
        return;
    }

    console.log("✅ Gemini API key found");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Test 1: Question Generation
    console.log("\n📚 Testing Question Generation...");
    console.log("Model: gemini-1.5-flash");

    try {
        const questionPrompt = `Generate 5 specific interview questions for a Software Engineer position at Google. 
        
Make the questions:
- Specific to the role and company
- Professional and realistic
- A mix of technical, behavioral, and company-specific questions

Format: Return only the questions, numbered 1-5, one per line.

Questions:`;

        const result = await model.generateContent(questionPrompt);
        const response = await result.response;
        const text = response.text();

        console.log("✅ Question generation successful");
        console.log("Generated questions:");
        console.log(text);
    } catch (error) {
        console.log("❌ Question generation failed:", error.message);
    }

    // Test 2: Feedback Generation
    console.log("\n💬 Testing Feedback Generation...");

    try {
        const feedbackPrompt = `You are an experienced interview coach. Provide constructive feedback for this interview response.

Question: "Tell me about your experience with JavaScript frameworks."

Answer: "I have worked with React for about 3 years. I built several web applications using React, including an e-commerce site and a dashboard for analytics. I'm familiar with hooks, state management with Redux, and component lifecycle methods."

Please provide:
1. What was good about the response
2. Areas for improvement
3. Specific suggestions to make the answer stronger

Keep feedback concise (2-3 sentences), constructive, and actionable.

Feedback:`;

        const result = await model.generateContent(feedbackPrompt);
        const response = await result.response;
        const feedback = response.text();

        console.log("✅ Feedback generation successful");
        console.log("Generated feedback:");
        console.log(feedback);
    } catch (error) {
        console.log("❌ Feedback generation failed:", error.message);
    }

    console.log("\n🎉 Gemini AI Integration Test Complete!");
}

// Run the test
testGeminiIntegration().catch(console.error);
