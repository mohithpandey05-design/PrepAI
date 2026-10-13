const AptitudeQuestion = require('../models/AptitudeQuestion');
const AptitudeResult = require('../models/AptitudeResult');
const User = require('../models/User');

const startTest = async (req, res, next) => {
  try {

    const prevResult = await AptitudeResult.findOne({ userId: req.user._id });
    const excludeIds = prevResult ? (prevResult.askedQuestionIds || []) : [];

    const getQuestions = async (category) => {
      const easy = await AptitudeQuestion.getRandomQuestions({ category, difficulty: 'Easy', excludeIds, limit: 2 });
      const medium = await AptitudeQuestion.getRandomQuestions({ category, difficulty: 'Medium', excludeIds, limit: 2 });
      const hard = await AptitudeQuestion.getRandomQuestions({ category, difficulty: 'Hard', excludeIds, limit: 1 });

      let questions = [...easy, ...medium, ...hard];
      const fetchedIds = new Set(questions.map(q => q._id));

      if (questions.length < 5) {
        const activeExclusions = [...new Set([...excludeIds, ...fetchedIds])];
        const categoryUnasked = await AptitudeQuestion.getRandomQuestions({
          category,
          excludeIds: activeExclusions,
          limit: 5 - questions.length
        });
        questions = [...questions, ...categoryUnasked];
      }

      if (questions.length < 5) {
        const currentIds = new Set(questions.map(q => q._id));
        const fallback = await AptitudeQuestion.getRandomQuestions({
          category,
          excludeIds: Array.from(currentIds),
          limit: 5 - questions.length
        });
        questions = [...questions, ...fallback];
      }

      return questions;
    };

    const quantitative = await getQuestions('Quantitative');
    const logical = await getQuestions('Logical');
    const verbal = await getQuestions('Verbal');

    const allQuestions = [...quantitative, ...logical, ...verbal];
    const newQuestionIds = allQuestions.map(q => q._id);

    let result = await AptitudeResult.findOne({ userId: req.user._id });
    if (result) {
      result.askedQuestionIds = [...new Set([...(result.askedQuestionIds || []), ...newQuestionIds])];
      await result.save();
    } else {
      await AptitudeResult.create({
        userId: req.user._id,
        score: 0,
        totalQuestions: 15,
        correctAnswers: 0,
        wrongAnswers: 0,
        percentage: 0,
        status: 'FAIL',
        askedQuestionIds: newQuestionIds
      });
    }

    const safeQuestions = allQuestions.map(q => ({
      _id: q._id,
      question: q.question,
      options: q.options,
      category: q.category,
      difficulty: q.difficulty
    }));

    const selectedRole = req.user.selectedRole || req.user.detectedRole || 'Software Engineer';

    res.status(200).json({
      success: true,
      questions: safeQuestions,
      totalDurationMinutes: 15,
      selectedRole
    });

  } catch (error) {
    next(error);
  }
};

const submitTest = async (req, res, next) => {
  try {
    const { answers } = req.body;

    if (!answers || !Array.isArray(answers)) {
      res.status(400);
      throw new Error('Invalid submission payload');
    }

    let correctCount = 0;
    let wrongCount = 0;
    const totalQuestions = answers.length || 15;
    const submittedIds = answers.map(a => a.questionId).filter(Boolean);

    for (const ans of answers) {
      const q = await AptitudeQuestion.findById(ans.questionId);
      if (q) {
        if (q.correctAnswer === ans.selectedOption) {
          correctCount++;
        } else if (ans.selectedOption !== null && ans.selectedOption !== '') {
          wrongCount++;
        }
      }
    }

    const percentage = Math.round((correctCount / totalQuestions) * 100);
    const status = percentage >= 60 ? 'PASS' : 'FAIL';

    let result = await AptitudeResult.findOne({ userId: req.user._id });

    if (result) {
      result.score = correctCount;
      result.totalQuestions = totalQuestions;
      result.correctAnswers = correctCount;
      result.wrongAnswers = wrongCount;
      result.percentage = percentage;
      result.status = status;
      result.askedQuestionIds = [...new Set([...(result.askedQuestionIds || []), ...submittedIds])];
      result.completedAt = new Date();
      await result.save();
    } else {
      result = await AptitudeResult.create({
        userId: req.user._id,
        score: correctCount,
        totalQuestions,
        correctAnswers: correctCount,
        wrongAnswers: wrongCount,
        percentage,
        status,
        askedQuestionIds: submittedIds
      });
    }

    const user = await User.findById(req.user._id);
    if (user) {
      user.aptitudeCompleted = true;
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: 'Test submitted successfully',
      result
    });

  } catch (error) {
    next(error);
  }
};

const getResult = async (req, res, next) => {
  try {
    const result = await AptitudeResult.findOne({ userId: req.user._id });
    if (!result) {
      return res.status(200).json({
        success: true,
        result: null
      });
    }

    res.status(200).json({
      success: true,
      result
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  startTest,
  submitTest,
  getResult
};
