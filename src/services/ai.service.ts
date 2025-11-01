import { GoogleGenerativeAI } from "@google/generative-ai";
import { CacheService } from "./cache.service";
import logger from "../utils/logger";

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
        difficulty: "easy" | "medium" | "hard" = "medium",
        numberOfQuestions: number = 5,
        questionType?: "behavioral" | "technical" | "situational" | "all"
    ): Promise<Question[]> {
        // Create cache key based on parameters
        const cacheKey = `questions:${jobRole}:${company}:${experience}:${difficulty}:${numberOfQuestions}:${
            questionType || "all"
        }`;

        // Try to get from cache first
        const cached = CacheService.get<Question[]>(cacheKey);
        if (cached) {
            logger.info("Returning cached questions", { cacheKey });
            return cached;
        }

        try {
            const difficultyGuidelines = {
                easy: "Focus on basic concepts, general questions, and foundational knowledge. Suitable for entry-level or warm-up questions.",
                medium: "Include moderately challenging questions that require some depth of knowledge and practical experience.",
                hard: "Generate advanced questions that require deep expertise, complex problem-solving, and senior-level thinking.",
            };

            const seniorityContext = {
                "entry-level": "junior developer or entry-level candidate",
                junior: "junior developer with 0-2 years of experience",
                "mid-level": "mid-level professional with 3-5 years of experience",
                senior: "senior professional with 6+ years of experience",
                lead: "lead or staff level with 8+ years of experience",
            };

            const typeFilter =
                questionType && questionType !== "all"
                    ? `Focus ONLY on ${questionType} questions. All ${numberOfQuestions} questions must be ${questionType} type.`
                    : `Mix different types: behavioral, technical, and situational questions.`;

            const seniorityLevel =
                seniorityContext[experience as keyof typeof seniorityContext] || experience;

            const prompt = `Generate ${numberOfQuestions} ${difficulty} difficulty interview questions for a ${jobRole} position at ${company} for a ${seniorityLevel}. 
      
      Difficulty Level: ${difficulty.toUpperCase()}
      ${difficultyGuidelines[difficulty]}
      
      Question Type Requirement: ${typeFilter}
      
      Return the response as a JSON array with each question having:
      - id: unique identifier (string)
      - question: the interview question (string)
      - type: 'behavioral', 'technical', or 'situational' ${
          questionType && questionType !== "all" ? `(MUST be '${questionType}')` : ""
      }
      - difficulty: '${difficulty}' (all questions should be ${difficulty})
      - category: relevant category like 'problem-solving', 'leadership', etc.
      
      Make questions relevant to the role, company, seniority level, and difficulty level.
      ${
          questionType && questionType !== "all"
              ? `IMPORTANT: ALL questions must be ${questionType} type questions.`
              : ""
      }`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Try to parse JSON from the response
            try {
                const questions = JSON.parse(text);
                const parsedQuestions = Array.isArray(questions) ? questions : [];

                // Filter by type if specified and limit to requested number
                let filteredQuestions = parsedQuestions;
                if (questionType && questionType !== "all") {
                    filteredQuestions = parsedQuestions.filter((q) => q.type === questionType);
                }

                const finalQuestions = filteredQuestions.slice(0, numberOfQuestions);

                // Cache the result for 1 hour (3600000ms)
                CacheService.set(cacheKey, finalQuestions, 3600000);
                logger.info("Questions cached", { cacheKey });

                return finalQuestions;
            } catch {
                // Fallback if AI doesn't return valid JSON
                return this.getFallbackQuestions(
                    jobRole,
                    difficulty,
                    numberOfQuestions,
                    questionType
                );
            }
        } catch (error) {
            console.error("AI service error:", error);
            return this.getFallbackQuestions(jobRole, difficulty, numberOfQuestions, questionType);
        }
    }

    async generateFeedback(question: string, answer: string): Promise<string> {
        // Create cache key for feedback
        const cacheKey = `feedback:${question.substring(0, 50)}:${answer.substring(0, 50)}`;

        // Try to get from cache
        const cached = CacheService.get<string>(cacheKey);
        if (cached) {
            logger.info("Returning cached feedback", { cacheKey });
            return cached;
        }

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
            const feedback = response.text();

            // Cache feedback for 30 minutes
            CacheService.set(cacheKey, feedback, 1800000);
            logger.info("Feedback cached", { cacheKey });

            return feedback;
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

    private getFallbackQuestions(
        jobRole: string,
        difficulty: string = "medium",
        numberOfQuestions: number = 5,
        questionType?: "behavioral" | "technical" | "situational" | "all"
    ): Question[] {
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
            {
                id: "6",
                question: `What programming languages or tools do you use for ${jobRole}?`,
                type: "technical" as const,
                difficulty: "easy" as const,
                category: "technical-skills",
            },
            {
                id: "7",
                question: "How would you handle receiving negative feedback?",
                type: "situational" as const,
                difficulty: "easy" as const,
                category: "professionalism",
            },
            {
                id: "8",
                question: "What is your greatest professional achievement?",
                type: "behavioral" as const,
                difficulty: "easy" as const,
                category: "achievements",
            },
            {
                id: "9",
                question: "How do you stay updated with industry trends?",
                type: "behavioral" as const,
                difficulty: "easy" as const,
                category: "learning",
            },
            {
                id: "10",
                question: "Describe your ideal work environment.",
                type: "behavioral" as const,
                difficulty: "easy" as const,
                category: "work-culture",
            },
            {
                id: "11",
                question: `What basic concepts of ${jobRole} are you most comfortable with?`,
                type: "technical" as const,
                difficulty: "easy" as const,
                category: "fundamentals",
            },
            {
                id: "12",
                question: "How do you prioritize your tasks?",
                type: "situational" as const,
                difficulty: "easy" as const,
                category: "time-management",
            },
            {
                id: "13",
                question: "Tell me about a time you worked in a team.",
                type: "behavioral" as const,
                difficulty: "easy" as const,
                category: "teamwork",
            },
            {
                id: "14",
                question: "What are your career goals for the next year?",
                type: "behavioral" as const,
                difficulty: "easy" as const,
                category: "goals",
            },
            {
                id: "15",
                question:
                    "How would you explain a complex technical concept to a non-technical person?",
                type: "situational" as const,
                difficulty: "easy" as const,
                category: "communication",
            },
            {
                id: "16",
                question: `What tools or frameworks are you familiar with in ${jobRole}?`,
                type: "technical" as const,
                difficulty: "easy" as const,
                category: "tools",
            },
            {
                id: "17",
                question: "Describe a time when you had to learn something new quickly.",
                type: "behavioral" as const,
                difficulty: "easy" as const,
                category: "adaptability",
            },
            {
                id: "18",
                question: "What motivates you in your work?",
                type: "behavioral" as const,
                difficulty: "easy" as const,
                category: "motivation",
            },
            {
                id: "19",
                question: "How do you handle constructive criticism?",
                type: "situational" as const,
                difficulty: "easy" as const,
                category: "feedback",
            },
            {
                id: "20",
                question: "What makes you a good fit for this role?",
                type: "behavioral" as const,
                difficulty: "easy" as const,
                category: "fit",
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
            {
                id: "6",
                question: `Explain the architecture of a system you've built for ${jobRole}.`,
                type: "technical" as const,
                difficulty: "medium" as const,
                category: "architecture",
            },
            {
                id: "7",
                question: "How would you handle a conflict between two team members?",
                type: "situational" as const,
                difficulty: "medium" as const,
                category: "conflict-resolution",
            },
            {
                id: "8",
                question:
                    "Describe a time when you had to persuade stakeholders to adopt your solution.",
                type: "behavioral" as const,
                difficulty: "medium" as const,
                category: "influence",
            },
            {
                id: "9",
                question: `What are the trade-offs between different approaches in ${jobRole}?`,
                type: "technical" as const,
                difficulty: "medium" as const,
                category: "decision-making",
            },
            {
                id: "10",
                question: "Tell me about a time when you missed a deadline. What happened?",
                type: "behavioral" as const,
                difficulty: "medium" as const,
                category: "failure",
            },
            {
                id: "11",
                question: "How do you ensure code quality in your projects?",
                type: "technical" as const,
                difficulty: "medium" as const,
                category: "quality",
            },
            {
                id: "12",
                question: "How would you onboard a new team member?",
                type: "situational" as const,
                difficulty: "medium" as const,
                category: "mentorship",
            },
            {
                id: "13",
                question: "Describe your approach to debugging complex issues.",
                type: "technical" as const,
                difficulty: "medium" as const,
                category: "debugging",
            },
            {
                id: "14",
                question: "Tell me about a time you had to adapt to significant changes at work.",
                type: "behavioral" as const,
                difficulty: "medium" as const,
                category: "change-management",
            },
            {
                id: "15",
                question: "How do you balance technical debt with feature development?",
                type: "situational" as const,
                difficulty: "medium" as const,
                category: "prioritization",
            },
            {
                id: "16",
                question: `What testing strategies do you use for ${jobRole} projects?`,
                type: "technical" as const,
                difficulty: "medium" as const,
                category: "testing",
            },
            {
                id: "17",
                question: "Describe a time when you improved a process or system.",
                type: "behavioral" as const,
                difficulty: "medium" as const,
                category: "improvement",
            },
            {
                id: "18",
                question: "How would you handle a situation where you disagree with your manager?",
                type: "situational" as const,
                difficulty: "medium" as const,
                category: "disagreement",
            },
            {
                id: "19",
                question: `Explain performance optimization techniques for ${jobRole}.`,
                type: "technical" as const,
                difficulty: "medium" as const,
                category: "optimization",
            },
            {
                id: "20",
                question: "Tell me about a time you took initiative on a project.",
                type: "behavioral" as const,
                difficulty: "medium" as const,
                category: "initiative",
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
            {
                id: "6",
                question: `Design a scalable architecture for a high-traffic ${jobRole} application.`,
                type: "technical" as const,
                difficulty: "hard" as const,
                category: "scalability",
            },
            {
                id: "7",
                question:
                    "Describe a time when you had to make a decision that was unpopular but necessary.",
                type: "behavioral" as const,
                difficulty: "hard" as const,
                category: "tough-decisions",
            },
            {
                id: "8",
                question:
                    "How would you architect a system to handle millions of concurrent users?",
                type: "technical" as const,
                difficulty: "hard" as const,
                category: "system-design",
            },
            {
                id: "9",
                question: "Tell me about a time you had to deliver bad news to stakeholders.",
                type: "situational" as const,
                difficulty: "hard" as const,
                category: "communication",
            },
            {
                id: "10",
                question:
                    "Describe the most significant technical architecture decision you've made and its impact.",
                type: "technical" as const,
                difficulty: "hard" as const,
                category: "architecture",
            },
            {
                id: "11",
                question:
                    "How would you handle a critical production outage affecting thousands of users?",
                type: "situational" as const,
                difficulty: "hard" as const,
                category: "crisis-management",
            },
            {
                id: "12",
                question:
                    "Explain how you would mentor a struggling team member while meeting project deadlines.",
                type: "behavioral" as const,
                difficulty: "hard" as const,
                category: "mentorship",
            },
            {
                id: "13",
                question: `What are the most critical security considerations for ${jobRole} and how do you address them?`,
                type: "technical" as const,
                difficulty: "hard" as const,
                category: "security",
            },
            {
                id: "14",
                question:
                    "Describe a situation where you had to completely pivot your technical approach mid-project.",
                type: "behavioral" as const,
                difficulty: "hard" as const,
                category: "adaptability",
            },
            {
                id: "15",
                question:
                    "How would you lead a technical transformation initiative across multiple teams?",
                type: "situational" as const,
                difficulty: "hard" as const,
                category: "transformation",
            },
            {
                id: "16",
                question: `Design a distributed system with high availability requirements for ${jobRole}.`,
                type: "technical" as const,
                difficulty: "hard" as const,
                category: "distributed-systems",
            },
            {
                id: "17",
                question:
                    "Tell me about a time when you had to navigate significant organizational politics.",
                type: "behavioral" as const,
                difficulty: "hard" as const,
                category: "politics",
            },
            {
                id: "18",
                question:
                    "How would you migrate a legacy system to a modern architecture with zero downtime?",
                type: "technical" as const,
                difficulty: "hard" as const,
                category: "migration",
            },
            {
                id: "19",
                question:
                    "Describe how you've built and maintained a high-performing engineering culture.",
                type: "behavioral" as const,
                difficulty: "hard" as const,
                category: "culture",
            },
            {
                id: "20",
                question:
                    "How do you make technology decisions when there are multiple valid approaches?",
                type: "situational" as const,
                difficulty: "hard" as const,
                category: "decision-framework",
            },
        ];

        const questionSets = {
            easy: easyQuestions,
            medium: mediumQuestions,
            hard: hardQuestions,
        };

        let allQuestions: Question[] =
            questionSets[difficulty as keyof typeof questionSets] || mediumQuestions;

        // Filter by type if specified
        if (questionType && questionType !== "all") {
            allQuestions = allQuestions.filter((q) => q.type === questionType);
        }

        // Return requested number of questions
        return allQuestions.slice(0, numberOfQuestions);
    }
}
