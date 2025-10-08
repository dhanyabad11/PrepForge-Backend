import { GoogleGenerativeAI } from "@google/generative-ai";

export interface Question {
    id: string;
    question: string;
    type: "behavioral" | "technical" | "situational";
    difficulty: "easy" | "medium" | "hard";
    category: string;
}

export class AIService {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY environment variable is required");
        }

        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    }

    async generateQuestions(
        jobRole: string,
        company: string,
        experience: string
    ): Promise<Question[]> {
        try {
            const prompt = `Generate 5 interview questions for a ${jobRole} position at ${company} for someone with ${experience} experience level. 
      
      Return the response as a JSON array with each question having:
      - id: unique identifier
      - question: the interview question
      - type: 'behavioral', 'technical', or 'situational'
      - difficulty: 'easy', 'medium', or 'hard'
      - category: relevant category like 'problem-solving', 'leadership', etc.
      
      Make questions relevant to the role and company.`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Try to parse JSON from the response
            try {
                const questions = JSON.parse(text);
                return Array.isArray(questions) ? questions : [];
            } catch {
                // Fallback if AI doesn't return valid JSON
                return this.getFallbackQuestions(jobRole);
            }
        } catch (error) {
            console.error("AI service error:", error);
            return this.getFallbackQuestions(jobRole);
        }
    }

    async generateFeedback(question: string, answer: string): Promise<string> {
        try {
            const prompt = `Provide constructive feedback for this interview answer:
      
      Question: ${question}
      Answer: ${answer}
      
      Give specific, actionable feedback focusing on:
      - Strengths in the answer
      - Areas for improvement
      - Suggestions for better responses
      
      Keep feedback professional and encouraging.`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error("Feedback generation error:", error);
            return "Thank you for your response. Consider providing more specific examples and quantifiable results in your answer.";
        }
    }

    async generateFollowUpQuestion(originalQuestion: string, answer: string): Promise<string> {
        try {
            const prompt = `Based on the original question and the user's answer, generate one relevant follow-up question. The follow-up should dig deeper into the user's response.

Original Question: "${originalQuestion}"
User's Answer: "${answer}"

Return only the follow-up question as a single string.`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text().trim();
        } catch (error) {
            console.error("Follow-up question generation error:", error);
            return "Can you elaborate on that a bit more?";
        }
    }

    private getFallbackQuestions(jobRole: string): Question[] {
        const fallbackQuestions = [
            {
                id: "1",
                question: `Tell me about your experience with ${jobRole} and what interests you about this role.`,
                type: "behavioral" as const,
                difficulty: "easy" as const,
                category: "background",
            },
            {
                id: "2",
                question:
                    "Describe a challenging project you worked on and how you overcame obstacles.",
                type: "behavioral" as const,
                difficulty: "medium" as const,
                category: "problem-solving",
            },
            {
                id: "3",
                question: "How do you handle working under pressure and tight deadlines?",
                type: "situational" as const,
                difficulty: "medium" as const,
                category: "stress-management",
            },
            {
                id: "4",
                question: "What are your biggest strengths and how would they benefit our team?",
                type: "behavioral" as const,
                difficulty: "easy" as const,
                category: "self-assessment",
            },
            {
                id: "5",
                question:
                    "Where do you see yourself in 5 years and how does this role fit into your career goals?",
                type: "behavioral" as const,
                difficulty: "medium" as const,
                category: "career-planning",
            },
        ];

        return fallbackQuestions;
    }
}
