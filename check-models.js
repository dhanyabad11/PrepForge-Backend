#!/usr/bin/env node

/**
 * Check available Gemini models
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");

dotenv.config();

async function listModels() {
    console.log("🔍 Checking available Gemini models...\n");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.log("❌ No Gemini API key found");
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        // Try some common model names
        const commonModels = [
            "gemini-pro",
            "gemini-1.5-pro",
            "gemini-1.0-pro",
            "models/gemini-pro",
            "models/gemini-1.5-pro",
            "models/gemini-1.0-pro",
        ];

        for (const modelName of commonModels) {
            try {
                console.log(`Testing model: ${modelName}`);
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Hello");
                const response = await result.response;
                console.log(`✅ ${modelName} works!`);
                console.log(`Sample response: ${response.text().substring(0, 50)}...\n`);
                break;
            } catch (error) {
                console.log(`❌ ${modelName} failed: ${error.message}\n`);
            }
        }
    } catch (error) {
        console.error("Error:", error.message);
    }
}

listModels().catch(console.error);
