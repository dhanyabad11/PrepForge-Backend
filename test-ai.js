#!/usr/bin/env node

/**
 * AI Integration Test Script
 * Tests the Hugging Face API integration with the specified free models
 */

const { HfInference } = require("@huggingface/inference");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

async function testAIIntegration() {
    console.log("🧪 Testing AI Integration for PrepForge\n");

    const apiKey = process.env.HUGGINGFACE_API_KEY;

    if (!apiKey || apiKey === "your_huggingface_api_key_here") {
        console.log("❌ No valid API key found");
        console.log("💡 Set HUGGINGFACE_API_KEY in your .env file");
        console.log("🔗 Get API key: https://huggingface.co/settings/tokens\n");
        return;
    }

    console.log("✅ API key found");
    const hf = new HfInference(apiKey);

    // Test 1: Question Generation Model
    console.log("\n📚 Testing Question Generation Model...");
    console.log("Model: ThomasSimonini/t5-end2end-question-generation");

    try {
        const questionPrompt =
            "context: Software Engineer position at Google\nquestion: What are good interview questions for this role?";

        const questionResponse = await hf.textGeneration({
            model: "ThomasSimonini/t5-end2end-question-generation",
            inputs: questionPrompt,
            parameters: {
                max_new_tokens: 100,
                temperature: 0.7,
            },
        });

        console.log("✅ Question generation successful");
        console.log("Sample output:", questionResponse.generated_text.substring(0, 100) + "...");
    } catch (error) {
        console.log("❌ Question generation failed:", error.message);
    }

    // Test 2: Feedback Generation Model
    console.log("\n💬 Testing Feedback Generation Model...");
    console.log("Model: teknium/OpenHermes-2.5-Mistral-7B");

    try {
        const feedbackPrompt = `<|im_start|>system
You are an interview coach. Provide brief feedback.
<|im_end|>
<|im_start|>user
Question: Tell me about yourself.
Answer: I am a software engineer with 3 years of experience.
<|im_end|>
<|im_start|>assistant`;

        const feedbackResponse = await hf.textGeneration({
            model: "teknium/OpenHermes-2.5-Mistral-7B",
            inputs: feedbackPrompt,
            parameters: {
                max_new_tokens: 80,
                temperature: 0.7,
                stop: ["<|im_end|>"],
            },
        });

        console.log("✅ Feedback generation successful");
        console.log("Sample output:", feedbackResponse.generated_text.substring(0, 100) + "...");
    } catch (error) {
        console.log("❌ Feedback generation failed:", error.message);
    }

    console.log("\n🎉 AI Integration test completed!");
}

// Run the test
testAIIntegration().catch(console.error);
