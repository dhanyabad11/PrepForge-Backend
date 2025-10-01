import { GoogleGenerativeAI } from "@google/generative-ai";

export class AIService {
    private genAI: GoogleGenerativeAI | null = null;
    private isConfigured: boolean;

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        this.isConfigured = !!(apiKey && apiKey !== "your_api_key_here");

        if (!this.isConfigured) {
            console.warn("🤖 AI Service: Using fallback mode (no valid Gemini API key)");
        } else {
            console.log("🤖 AI Service: Configured with Google Gemini API");
            this.genAI = new GoogleGenerativeAI(apiKey!);
        }
    }

    public isAIEnabled(): boolean {
        return this.isConfigured;
    }

    public getModelInfo(): { questionModel: string; feedbackModel: string } {
        return {
            questionModel: "gemini-2.0-flash-exp",
            feedbackModel: "gemini-2.0-flash-exp",
        };
    }

    async generateQuestions(jobRole: string, company: string): Promise<string[]> {
        try {
            if (!this.isConfigured || !this.genAI) {
                console.log("Gemini API not configured, using fallback questions");
                return this.getFallbackQuestions(jobRole, company);
            }

            const model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

            const prompt = `Generate 8 specific interview questions for a ${jobRole} position at ${company}. 
            
Make the questions:
- Specific to the role and company
- Professional and realistic
- A mix of technical, behavioral, and company-specific questions
- Each question should be complete and well-formed

Format: Return only the questions, numbered 1-8, one per line.

Example format:
1. What interests you about working at ${company}?
2. How would you approach...

Questions:`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            const questions = this.parseQuestions(text);
            if (questions.length > 0) {
                console.log(`Generated ${questions.length} questions using Gemini AI`);
                return questions.slice(0, 8);
            }

            return this.getFallbackQuestions(jobRole, company);
        } catch (error) {
            console.error("Error generating questions with Gemini AI:", error);
            return this.getFallbackQuestions(jobRole, company);
        }
    }

    private parseQuestions(text: string): string[] {
        const lines = text.split("\n").filter((line) => line.trim().length > 0);
        const questions: string[] = [];

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.includes("?") && trimmed.length > 20) {
                // Remove numbering if present
                const cleaned = trimmed.replace(/^\d+\.\s*/, "").trim();
                if (cleaned.length > 0) {
                    questions.push(cleaned);
                }
            }
        }

        return questions.slice(0, 8); // Limit to 8 questions
    }

    private getFallbackQuestions(jobRole: string, company: string): string[] {
        const roleSpecific = this.getRoleSpecificQuestions(jobRole);
        const companySpecific = [
            `Why do you want to work at ${company}?`,
            `What do you know about ${company}'s culture and values?`,
            `How would you contribute to ${company}'s mission?`,
        ];

        const general = [
            "Tell me about yourself and your background.",
            "What are your greatest strengths and weaknesses?",
            "Describe a challenging project you worked on recently.",
            "Where do you see yourself in 5 years?",
            "Why are you looking for a new opportunity?",
        ];

        // Combine and return 8 questions
        const allQuestions = [...roleSpecific, ...companySpecific, ...general];
        return allQuestions.slice(0, 8);
    }

    private getRoleSpecificQuestions(jobRole: string): string[] {
        const role = jobRole.toLowerCase();

        if (role.includes("software") || role.includes("developer") || role.includes("engineer")) {
            return [
                "Describe your experience with software development lifecycle.",
                "How do you approach debugging complex issues?",
                "What programming languages and frameworks are you most comfortable with?",
                "How do you ensure code quality and maintainability?",
                "Describe a time you had to learn a new technology quickly.",
            ];
        }

        if (role.includes("product") || role.includes("manager")) {
            return [
                "How do you prioritize features and requirements?",
                "Describe your experience working with cross-functional teams.",
                "How do you handle conflicting stakeholder requirements?",
                "What metrics do you use to measure product success?",
                "Tell me about a product launch you managed.",
            ];
        }

        if (role.includes("design") || role.includes("ui") || role.includes("ux")) {
            return [
                "Walk me through your design process.",
                "How do you incorporate user feedback into your designs?",
                "Describe a challenging design problem you solved.",
                "How do you balance user needs with business requirements?",
                "What design tools and methodologies do you prefer?",
            ];
        }

        if (role.includes("data") || role.includes("analyst") || role.includes("scientist")) {
            return [
                "Describe your experience with data analysis and visualization.",
                "How do you approach cleaning and preparing messy data?",
                "What statistical methods do you commonly use?",
                "How do you communicate complex findings to non-technical stakeholders?",
                "Describe a data project that drove business impact.",
            ];
        }

        // Generic professional questions
        return [
            `What interests you most about the ${jobRole} role?`,
            "Describe your experience in this field.",
            "How do you stay updated with industry trends?",
            "What tools and technologies do you work with?",
            "Describe a successful project in your area of expertise.",
        ];
    }

    async generateFeedback(question: string, answer: string): Promise<string> {
        try {
            if (!this.isConfigured || !this.genAI) {
                console.log("Gemini API not configured, using fallback feedback");
                return this.getFallbackFeedback(answer);
            }

            const model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

            const prompt = `You are an experienced interview coach. Provide constructive feedback for this interview response.

Question: "${question}"

Answer: "${answer}"

Please provide:
1. What was good about the response
2. Areas for improvement
3. Specific suggestions to make the answer stronger

Keep feedback concise (2-3 sentences), constructive, and actionable. Focus on both content and delivery aspects.

Feedback:`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const feedback = response.text().trim();

            if (feedback && feedback.length > 10) {
                console.log("Generated AI feedback using Gemini");
                return feedback;
            }

            return this.getFallbackFeedback(answer);
        } catch (error) {
            console.error("Error generating feedback with Gemini:", error);
            return this.getFallbackFeedback(answer);
        }
    }

    private getFallbackFeedback(answer: string): string {
        const wordCount = answer.split(" ").length;

        if (wordCount < 20) {
            return "Your answer is quite brief. Try to provide more specific examples and details to better demonstrate your experience and thought process.";
        }

        if (wordCount > 200) {
            return "Your answer is comprehensive but quite lengthy. Try to be more concise while maintaining the key points that showcase your qualifications.";
        }

        return "Good response! Consider adding specific examples or metrics to strengthen your answer and make it more memorable for the interviewer.";
    }
}
