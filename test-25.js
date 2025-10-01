const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

async function testGemini25() {
    console.log("🚀 Testing Gemini 2.5 Flash...");

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // Try different model names for Gemini 2.5
    const models = [
        "gemini-2.5-flash-exp",
        "gemini-2.5-flash",
        "models/gemini-2.5-flash-exp",
        "models/gemini-2.5-flash",
    ];

    for (const modelName of models) {
        try {
            console.log(`Testing: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Say hello in one sentence.");
            const response = await result.response;
            console.log(`✅ ${modelName} works!`);
            console.log("Response:", response.text());
            return; // Exit after first success
        } catch (error) {
            console.log(`❌ ${modelName} failed: ${error.message.substring(0, 100)}...`);
        }
    }

    console.log("❌ All Gemini 2.5 models failed");
}

testGemini25().catch(console.error);
