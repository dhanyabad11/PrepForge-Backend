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
        experience: string,
        difficulty: "easy" | "medium" | "hard" = "medium"
    ): Promise<Question[]> {
        try {
            const difficultyGuidelines = {
                easy: "Focus on basic concepts, general questions, and foundational knowledge. Suitable for entry-level or warm-up questions.",
                medium: "Include moderately challenging questions that require some depth of knowledge and practical experience.",
                hard: "Generate advanced questions that require deep expertise, complex problem-solving, and senior-level thinking.",
            };

            const prompt = `Generate 5 ${difficulty} difficulty interview questions for a ${jobRole} position at ${company} for someone with ${experience} experience level. 
      
      Difficulty Level: ${difficulty.toUpperCase()}
      ${difficultyGuidelines[difficulty]}
      
      Return the response as a JSON array with each question having:
      - id: unique identifier (string)
      - question: the interview question (string)
      - type: 'behavioral', 'technical', or 'situational'
      - difficulty: '${difficulty}' (all questions should be ${difficulty})
      - category: relevant category like 'problem-solving', 'leadership', etc.
      
      Make questions relevant to the role, company, and difficulty level.`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Try to parse JSON from the response
            try {
                const questions = JSON.parse(text);
                return Array.isArray(questions) ? questions : [];
            } catch {
                // Fallback if AI doesn't return valid JSON
                return this.getFallbackQuestions(jobRole, difficulty);
            }
        } catch (error) {
            console.error("AI service error:", error);
            return this.getFallbackQuestions(jobRole, difficulty);
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

    private getFallbackQuestions(jobRole: string, difficulty: string = "medium"): Question[] {
        const easyQuestions = [
            {
                id: "1",
                question: `Tell me about yourself and your interest in ${jobRole}.`,
                type: "behavioral" as const,
                difficulty: "easy" as const,
                category: "introduction",
            },
            {
                id: "2",
                question: "What are your main strengths?",
                type: "behavioral" as const,
                difficulty: "easy" as const,
                category: "self-assessment",
            },
            {
                id: "3",
                question: "Why do you want to work in this role?",
                type: "behavioral" as const,
                difficulty: "easy" as const,
                category: "motivation",
            },
            {
                id: "4",
                question: "Describe a typical day in your current or previous role.",
                type: "behavioral" as const,
                difficulty: "easy" as const,
                category: "experience",
            },
            {
                id: "5",
                question: "What interests you about our company?",
                type: "behavioral" as const,
                difficulty: "easy" as const,
                category: "company-fit",
            },
        ];

        const mediumQuestions = [
            {
                id: "1",
                question: `Tell me about your experience with ${jobRole} and what interests you about this role.`,
                type: "behavioral" as const,
                difficulty: "medium" as const,
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
                question: "Tell me about a time when you had to work with a difficult team member.",
                type: "behavioral" as const,
                difficulty: "medium" as const,
                category: "teamwork",
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

        const hardQuestions = [
            {
                id: "1",
                question: `Describe the most complex technical problem you've solved in ${jobRole} and walk me through your approach.`,
                type: "technical" as const,
                difficulty: "hard" as const,
                category: "problem-solving",
            },
            {
                id: "2",
                question:
                    "Tell me about a time when you had to make a critical decision with incomplete information. What was your thought process?",
                type: "situational" as const,
                difficulty: "hard" as const,
                category: "decision-making",
            },
            {
                id: "3",
                question:
                    "How would you design and implement a system for [complex scenario]? Consider scalability, reliability, and cost.",
                type: "technical" as const,
                difficulty: "hard" as const,
                category: "system-design",
            },
            {
                id: "4",
                question:
                    "Describe a situation where your initial approach failed. How did you identify the issue and what did you do differently?",
                type: "behavioral" as const,
                difficulty: "hard" as const,
                category: "adaptability",
            },
            {
                id: "5",
                question:
                    "You're leading a project that's behind schedule and over budget. Walk me through your strategy to recover.",
                type: "situational" as const,
                difficulty: "hard" as const,
                category: "leadership",
            },
        ];

        const questionSets = {
            easy: easyQuestions,
            medium: mediumQuestions,
            hard: hardQuestions,
        };

        return questionSets[difficulty as keyof typeof questionSets] || mediumQuestions;
    }
}
