const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

async function testFullIntegration() {
    console.log("🚀 Testing Complete Gemini 2.5 Flash Integration\n");

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "models/gemini-2.5-flash" });

    try {
        // Test question generation
        console.log("📚 Testing Question Generation...");
        const questionPrompt = `Generate 5 specific interview questions for a Software Engineer position at Google. 

Make the questions:
- Specific to the role and company
- Professional and realistic
- A mix of technical, behavioral, and company-specific questions

Format: Return only the questions, numbered 1-5, one per line.

Questions:`;

        const questionResult = await model.generateContent(questionPrompt);
        const questionResponse = await questionResult.response;
        const questions = questionResponse.text();

        console.log("✅ Questions generated successfully:");
        console.log(questions);
        console.log("");

        // Test feedback generation
        console.log("💬 Testing Feedback Generation...");
        const feedbackPrompt = `You are an experienced interview coach. Provide constructive feedback for this interview response.

Question: "Tell me about your experience with JavaScript frameworks."

Answer: "I have worked with React for about 3 years. I built several web applications using React, including an e-commerce site and a dashboard for analytics. I'm familiar with hooks, state management with Redux, and component lifecycle methods."

Please provide:
1. What was good about the response
2. Areas for improvement  
3. Specific suggestions to make the answer stronger

Keep feedback concise (2-3 sentences), constructive, and actionable.

Feedback:`;

        const feedbackResult = await model.generateContent(feedbackPrompt);
        const feedbackResponse = await feedbackResult.response;
        const feedback = feedbackResponse.text();

        console.log("✅ Feedback generated successfully:");
        console.log(feedback);

        console.log("\n🎉 Gemini 2.5 Flash integration is working perfectly!");
    } catch (error) {
        console.error("❌ Integration test failed:", error.message);
    }
}

testFullIntegration();
