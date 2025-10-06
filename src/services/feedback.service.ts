import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

class FeedbackService {
    async generateFeedback(question: string, answer: string): Promise<any> {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
      Analyze the following interview answer based on the question. Provide a detailed evaluation covering:
      1.  **Relevance**: How well does the answer address the question?
      2.  **Clarity**: Is the answer clear, concise, and easy to understand?
      3.  **Depth**: Does the answer demonstrate a deep understanding of the topic?
      4.  **STAR Method**: If applicable, evaluate the use of the Situation, Task, Action, and Result (STAR) method for behavioral questions.

      **Question**: "${question}"
      **Answer**: "${answer}"

      Provide a score from 1 to 10 for each of the four categories (Relevance, Clarity, Depth, STAR Method).
      Also, provide a brief "Overall Feedback" summary and a "Suggestion for Improvement".

      Format the output as a JSON object with the following structure:
      {
        "relevanceScore": number,
        "clarityScore": number,
        "depthScore": number,
        "starMethodScore": number,
        "overallFeedback": "string",
        "suggestion": "string"
      }
    `;

        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = await response.text();

            // Clean the response to ensure it's valid JSON
            const jsonString = text
                .replace(/```json/g, "")
                .replace(/```/g, "")
                .trim();

            return JSON.parse(jsonString);
        } catch (error) {
            console.error("Error generating feedback from AI:", error);
            // Provide a fallback error response
            return {
                relevanceScore: 0,
                clarityScore: 0,
                depthScore: 0,
                starMethodScore: 0,
                overallFeedback: "Could not generate feedback due to an error.",
                suggestion: "Please try again later.",
            };
        }
    }
}

export const feedbackService = new FeedbackService();
