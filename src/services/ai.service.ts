import { HfInference } from '@huggingface/inference';

export class AIService {
  private hf: HfInference;

  constructor() {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) {
      console.warn('HUGGINGFACE_API_KEY not found. Using fallback questions.');
    }
    this.hf = new HfInference(apiKey);
  }

  async generateQuestions(jobRole: string, company: string): Promise<string[]> {
    try {
      if (!process.env.HUGGINGFACE_API_KEY) {
        // Fallback questions when API key is not available
        return this.getFallbackQuestions(jobRole, company);
      }

      const prompt = `Generate 8 interview questions for a ${jobRole} position at ${company}. 
      The questions should be relevant to the role and company culture.
      Format each question on a new line without numbering.
      Focus on technical skills, experience, and behavioral aspects.`;

      const response = await this.hf.textGeneration({
        model: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
        inputs: prompt,
        parameters: {
          max_new_tokens: 300,
          temperature: 0.7,
          top_p: 0.9,
        },
      });

      const questions = this.parseQuestions(response.generated_text);
      return questions.length > 0 ? questions : this.getFallbackQuestions(jobRole, company);
    } catch (error) {
      console.error('Error generating questions with AI:', error);
      return this.getFallbackQuestions(jobRole, company);
    }
  }

  private parseQuestions(text: string): string[] {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const questions: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.includes('?') && trimmed.length > 20) {
        // Remove numbering if present
        const cleaned = trimmed.replace(/^\d+\.\s*/, '').trim();
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
      'Tell me about yourself and your background.',
      'What are your greatest strengths and weaknesses?',
      'Describe a challenging project you worked on recently.',
      'Where do you see yourself in 5 years?',
      'Why are you looking for a new opportunity?',
    ];

    // Combine and return 8 questions
    const allQuestions = [...roleSpecific, ...companySpecific, ...general];
    return allQuestions.slice(0, 8);
  }

  private getRoleSpecificQuestions(jobRole: string): string[] {
    const role = jobRole.toLowerCase();

    if (role.includes('software') || role.includes('developer') || role.includes('engineer')) {
      return [
        'Describe your experience with software development lifecycle.',
        'How do you approach debugging complex issues?',
        'What programming languages and frameworks are you most comfortable with?',
        'How do you ensure code quality and maintainability?',
        'Describe a time you had to learn a new technology quickly.',
      ];
    }

    if (role.includes('product') || role.includes('manager')) {
      return [
        'How do you prioritize features and requirements?',
        'Describe your experience working with cross-functional teams.',
        'How do you handle conflicting stakeholder requirements?',
        'What metrics do you use to measure product success?',
        'Tell me about a product launch you managed.',
      ];
    }

    if (role.includes('design') || role.includes('ui') || role.includes('ux')) {
      return [
        'Walk me through your design process.',
        'How do you incorporate user feedback into your designs?',
        'Describe a challenging design problem you solved.',
        'How do you balance user needs with business requirements?',
        'What design tools and methodologies do you prefer?',
      ];
    }

    if (role.includes('data') || role.includes('analyst') || role.includes('scientist')) {
      return [
        'Describe your experience with data analysis and visualization.',
        'How do you approach cleaning and preparing messy data?',
        'What statistical methods do you commonly use?',
        'How do you communicate complex findings to non-technical stakeholders?',
        'Describe a data project that drove business impact.',
      ];
    }

    // Generic professional questions
    return [
      `What interests you most about the ${jobRole} role?`,
      'Describe your experience in this field.',
      'How do you stay updated with industry trends?',
      'What tools and technologies do you work with?',
      'Describe a successful project in your area of expertise.',
    ];
  }

  async generateFeedback(question: string, answer: string): Promise<string> {
    try {
      if (!process.env.HUGGINGFACE_API_KEY) {
        return this.getFallbackFeedback(answer);
      }

      const prompt = `As an interview coach, provide constructive feedback on this interview answer:

Question: ${question}

Answer: ${answer}

Provide specific feedback on:
1. Content quality and relevance
2. Structure and clarity
3. Areas for improvement
4. Suggestions for strengthening the response

Keep feedback constructive and actionable.`;

      const response = await this.hf.textGeneration({
        model: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
        inputs: prompt,
        parameters: {
          max_new_tokens: 200,
          temperature: 0.7,
        },
      });

      return response.generated_text.trim();
    } catch (error) {
      console.error('Error generating feedback:', error);
      return this.getFallbackFeedback(answer);
    }
  }

  private getFallbackFeedback(answer: string): string {
    const wordCount = answer.split(' ').length;
    
    if (wordCount < 20) {
      return "Your answer is quite brief. Try to provide more specific examples and details to better demonstrate your experience and thought process.";
    }
    
    if (wordCount > 200) {
      return "Your answer is comprehensive but quite lengthy. Try to be more concise while maintaining the key points that showcase your qualifications.";
    }
    
    return "Good response! Consider adding specific examples or metrics to strengthen your answer and make it more memorable for the interviewer.";
  }
}