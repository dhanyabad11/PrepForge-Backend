import express from 'express';
import { AIService } from '../services/ai.service';

const router = express.Router();
const aiService = new AIService();

// Generate interview questions
router.post('/generate-questions', async (req, res) => {
  try {
    const { jobRole, company } = req.body;

    if (!jobRole || !company) {
      return res.status(400).json({
        error: 'Job role and company are required',
      });
    }

    const questions = await aiService.generateQuestions(jobRole, company);

    res.json({
      success: true,
      questions,
      jobRole,
      company,
    });
  } catch (error) {
    console.error('Error in generate-questions:', error);
    res.status(500).json({
      error: 'Failed to generate questions',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Generate feedback for an answer
router.post('/generate-feedback', async (req, res) => {
  try {
    const { question, answer } = req.body;

    if (!question || !answer) {
      return res.status(400).json({
        error: 'Question and answer are required',
      });
    }

    const feedback = await aiService.generateFeedback(question, answer);

    res.json({
      success: true,
      feedback,
    });
  } catch (error) {
    console.error('Error in generate-feedback:', error);
    res.status(500).json({
      error: 'Failed to generate feedback',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;