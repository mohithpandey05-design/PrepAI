const InterviewSession = require('../models/InterviewSession');
const InterviewQuestion = require('../models/InterviewQuestion');
const InterviewAnswer = require('../models/InterviewAnswer');
const User = require('../models/User');
const ResumeAnalysis = require('../models/ResumeAnalysis');
const AptitudeResult = require('../models/AptitudeResult');
const CodingResult = require('../models/CodingResult');
const {
  generateVideoInterviewQuestions,
  evaluateInterviewAnswer,
  generateFollowUpQuestion,
  generateFinalInterviewReport,
  QUESTION_PLAN,
  FOLLOW_UP_TIMING,
  MAX_FOLLOW_UPS
} = require('../services/geminiService');

const MAX_RERECORDS = 2;

const REVIEW_OVERHEAD_SECONDS = 15;

const FOLLOW_UP_ORDER_BASE = 100;

const EMPTY_CATEGORY_SCORES = {
  technical: 0, communication: 0, problemSolving: 0, confidence: 0, relevance: 0
};

const buildCandidateContext = async (user) => {
  const resumeAnalysis = await ResumeAnalysis.findOne({ userId: user._id });
  const aptitudeResult = await AptitudeResult.findOne({ userId: user._id });
  const codingResults = await CodingResult.find({ userId: user._id });
  const avgCodingScore = codingResults.length > 0
    ? Math.round(codingResults.reduce((a, b) => a + b.score, 0) / codingResults.length)
    : 0;

  const selectedRole = user.selectedRole
    || (resumeAnalysis ? resumeAnalysis.detectedRole : null)
    || 'Software Engineer';

  const detectedSkills = resumeAnalysis ? (resumeAnalysis.detectedSkills || []) : (user.skills || []);
  const missingSkills = resumeAnalysis ? (resumeAnalysis.missingSkills || []) : [];

  return {
    selectedRole,
    context: {
      fullName: user.fullName || 'Candidate',
      selectedRole,
      detectedRole: selectedRole,
      detectedSkills,
      skills: detectedSkills,
      missingSkills,

      requiredSkills: [...new Set([...detectedSkills, ...missingSkills])],
      projects: resumeAnalysis ? (resumeAnalysis.projects || []) : [],
      experience: resumeAnalysis ? (resumeAnalysis.experience || []) : [],
      aptitudeScore: aptitudeResult ? aptitudeResult.percentage : 0,
      codingScore: avgCodingScore
    }
  };
};

const getInterviewIntro = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    const { selectedRole } = await buildCandidateContext(user);

    const plannedSeconds = QUESTION_PLAN.reduce(
      (sum, q) => sum + q.prepTime + q.answerTime + REVIEW_OVERHEAD_SECONDS,
      0
    );

    const followUpSeconds = MAX_FOLLOW_UPS
      * (FOLLOW_UP_TIMING.prepTime + FOLLOW_UP_TIMING.answerTime + REVIEW_OVERHEAD_SECONDS);
    const prepRange = QUESTION_PLAN.map(q => q.prepTime);
    const answerRange = QUESTION_PLAN.map(q => q.answerTime);

    res.status(200).json({
      success: true,
      intro: {
        role: selectedRole,
        candidateName: user.fullName || 'Candidate',
        totalQuestions: QUESTION_PLAN.length,
        estimatedMinutes: Math.ceil((plannedSeconds + followUpSeconds) / 60),
        prepSecondsMin: Math.min(...prepRange, FOLLOW_UP_TIMING.prepTime),
        prepSecondsMax: Math.max(...prepRange),
        answerSecondsMin: Math.min(...answerRange, FOLLOW_UP_TIMING.answerTime),
        answerSecondsMax: Math.max(...answerRange),
        maxRerecords: MAX_RERECORDS,
        maxFollowUps: MAX_FOLLOW_UPS
      }
    });
  } catch (error) {
    next(error);
  }
};

const startInterview = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    const { selectedRole, context } = await buildCandidateContext(user);

    await InterviewSession.updateMany(
      { userId: user._id, status: 'IN_PROGRESS' },
      { status: 'ABANDONED', endedAt: new Date() }
    );

    const questions = await generateVideoInterviewQuestions(context);

    const session = await InterviewSession.create({
      userId: user._id,
      startedAt: new Date(),
      status: 'IN_PROGRESS',
      conversationHistory: JSON.stringify({ questions, context: { role: selectedRole, name: context.fullName } }),
      totalQuestions: questions.length,
      categoryScores: JSON.stringify(EMPTY_CATEGORY_SCORES)
    });

    const stored = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      stored.push(await InterviewQuestion.create({
        sessionId: session._id,
        question: q.question,
        category: q.category,
        difficulty: q.difficulty || 'Medium',
        isAnswered: false,
        prepSeconds: q.prepTime,
        answerSeconds: q.answerTime,
        order: i + 1
      }));
    }

    const estimatedSeconds = stored.reduce(
      (sum, q) => sum + q.prepSeconds + q.answerSeconds + REVIEW_OVERHEAD_SECONDS,
      0
    ) + MAX_FOLLOW_UPS * (FOLLOW_UP_TIMING.prepTime + FOLLOW_UP_TIMING.answerTime + REVIEW_OVERHEAD_SECONDS);

    res.status(200).json({
      success: true,
      message: 'AI Video Interview session started',
      sessionId: session._id,
      selectedRole,
      candidateName: context.fullName,
      questions: stored.map((q, i) => ({
        index: i,
        question: q.question,
        category: q.category,
        difficulty: q.difficulty,
        prepTime: q.prepSeconds,
        answerTime: q.answerSeconds
      })),
      totalQuestions: stored.length,
      maxRerecords: MAX_RERECORDS,
      maxFollowUps: MAX_FOLLOW_UPS,
      estimatedDuration: Math.ceil(estimatedSeconds / 60)
    });

  } catch (error) {
    next(error);
  }
};

const buildFollowUp = async ({ session, question, questions, evaluation, transcript, role }) => {
  try {

    const plan = QUESTION_PLAN[(question.order || 0) - 1];
    if (!plan || !plan.allowFollowUp) return null;

    if (question.category === 'Follow-up') return null;

    if (!evaluation.isMeaningful) return null;

    const existing = questions.filter(q => q.category === 'Follow-up');
    if (existing.length >= MAX_FOLLOW_UPS) return null;

    const text = await generateFollowUpQuestion({
      role,
      question: question.question,
      transcript,
      scores: evaluation.scores
    });
    if (!text) return null;

    const row = await InterviewQuestion.create({
      sessionId: session._id,
      question: text,
      category: 'Follow-up',
      difficulty: question.difficulty || 'Medium',
      isAnswered: false,
      prepSeconds: FOLLOW_UP_TIMING.prepTime,
      answerSeconds: FOLLOW_UP_TIMING.answerTime,

      order: FOLLOW_UP_ORDER_BASE + (question.order || existing.length + 1)
    });

    return {

      index: questions.length,
      question: row.question,
      category: 'Follow-up',
      difficulty: row.difficulty,
      prepTime: row.prepSeconds,
      answerTime: row.answerSeconds,
      parentNumber: question.order || null
    };
  } catch (error) {
    console.warn('⚠️ Could not create a follow-up question:', error.message);
    return null;
  }
};

const submitVideoAnswer = async (req, res, next) => {
  try {
    const { sessionId, questionIndex, transcript, answerSeconds, rerecordCount } = req.body;
    const index = Number(questionIndex);

    if (!sessionId || !Number.isInteger(index) || index < 0 || !transcript || transcript.trim() === '') {
      res.status(400);
      throw new Error('sessionId, questionIndex, and non-empty transcript are required');
    }

    const session = await InterviewSession.findById(sessionId);
    if (!session) {
      res.status(404);
      throw new Error('Active interview session not found');
    }
    if (String(session.userId) !== String(req.user._id)) {
      res.status(403);
      throw new Error('This interview session belongs to another candidate');
    }
    if (session.status !== 'IN_PROGRESS') {
      res.status(409);
      throw new Error('This interview session has already been completed');
    }

    const questions = await InterviewQuestion.findBySessionId(session._id);
    const question = questions[index];
    if (!question) {
      res.status(400);
      throw new Error(`Question ${index + 1} does not exist in this interview session`);
    }

    const cleanTranscript = transcript.trim();
    const evalRes = await evaluateInterviewAnswer(question.question, cleanTranscript);

    const answerPayload = {
      sessionId: session._id,
      questionId: question._id,
      transcript: cleanTranscript,
      scores: evalRes.scores,
      feedback: evalRes.feedback,
      followUpQuestion: evalRes.followUpQuestion || '',
      suggestedApproach: evalRes.suggestedApproach || '',
      answerSeconds: Number(answerSeconds) || 0,
      rerecordCount: Number(rerecordCount) || 0
    };

    const existing = await InterviewAnswer.findByQuestion(session._id, question._id);
    if (existing) {
      await InterviewAnswer.updateById(existing._id, answerPayload);
    } else {
      await InterviewAnswer.create(answerPayload);
    }

    await InterviewQuestion.markAnswered(question._id);

    const answeredCount = questions.filter(q => q.isAnswered || q._id === question._id).length;
    session.totalQuestionsAsked = answeredCount;

    const history = session.conversationHistory;
    const role = (history && history.context && history.context.role) || 'Software Engineer';
    const followUp = existing
      ? null
      : await buildFollowUp({ session, question, questions, evaluation: evalRes, transcript: cleanTranscript, role });

    if (followUp) session.totalQuestions = questions.length + 1;
    await session.save();

    res.status(200).json({
      success: true,
      questionIndex: index,
      answeredCount,
      totalQuestions: questions.length + (followUp ? 1 : 0),
      followUp,
      evaluation: {
        scores: evalRes.scores,
        feedback: evalRes.feedback,
        suggestedApproach: evalRes.suggestedApproach || '',
        isMeaningful: evalRes.isMeaningful
      }
    });

  } catch (error) {
    next(error);
  }
};

const endInterview = async (req, res, next) => {
  try {
    const { sessionId } = req.body;

    const session = await InterviewSession.findById(sessionId);
    if (!session) {
      res.status(404);
      throw new Error('Interview session not found');
    }
    if (String(session.userId) !== String(req.user._id)) {
      res.status(403);
      throw new Error('This interview session belongs to another candidate');
    }

    const answers = await InterviewAnswer.find({ sessionId: session._id });

    if (session.status === 'COMPLETED') {
      return res.status(200).json({
        success: true,
        message: 'Interview already completed',
        report: {
          _id: session._id,
          overallScore: session.overallScore,
          durationMinutes: session.durationMinutes,
          totalQuestionsAsked: session.totalQuestionsAsked,
          meaningfulAnswersCount: session.meaningfulAnswersCount,
          categoryScores: session.categoryScores || EMPTY_CATEGORY_SCORES,
          strengths: session.strengths,
          weaknesses: session.weaknesses,
          improvementSuggestions: session.improvementSuggestions,
          recommendedLearningPath: session.recommendedLearningPath
        },
        answers
      });
    }

    const qaList = answers.map(a => ({
      question: (a.questionId && typeof a.questionId === 'object') ? a.questionId.question : 'Interview Question',

      category: (a.questionId && typeof a.questionId === 'object') ? a.questionId.category : 'Technical',
      transcript: a.transcript || '',
      evaluation: { scores: a.scores, feedback: a.feedback }
    }));

    const startedAt = new Date(session.startedAt || Date.now()).getTime();
    const durationMinutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000));

    if (qaList.length === 0) {
      const totalQs = session.totalQuestions
        || (await InterviewQuestion.findBySessionId(session._id)).length;

      const emptyReport = {
        overallScore: 0,
        meaningfulAnswersCount: 0,
        totalQuestionsAsked: 0,
        categoryScores: { ...EMPTY_CATEGORY_SCORES },
        strengths: ['No responses were recorded during the interview.'],
        weaknesses: ['All questions were left unanswered.'],
        improvementSuggestions: ['Complete all interview questions with detailed, structured answers.'],
        recommendedLearningPath: ['Technical Interview Fundamentals']
      };

      session.endedAt = new Date();
      session.durationMinutes = durationMinutes;
      session.status = 'COMPLETED';
      session.overallScore = 0;
      session.totalQuestions = totalQs;
      session.totalQuestionsAsked = 0;
      session.meaningfulAnswersCount = 0;
      session.categoryScores = { ...EMPTY_CATEGORY_SCORES };
      session.strengths = emptyReport.strengths;
      session.weaknesses = emptyReport.weaknesses;
      session.improvementSuggestions = emptyReport.improvementSuggestions;
      session.recommendedLearningPath = emptyReport.recommendedLearningPath;
      await session.save();

      return res.status(200).json({
        success: true,
        message: 'Interview completed',
        report: { _id: session._id, durationMinutes, totalQuestions: totalQs, ...emptyReport },
        answers: []
      });
    }

    const reportData = await generateFinalInterviewReport(qaList);

    session.endedAt = new Date();
    session.durationMinutes = durationMinutes;
    session.status = 'COMPLETED';
    session.overallScore = reportData.overallScore !== undefined ? reportData.overallScore : 0;
    session.categoryScores = reportData.categoryScores || { ...EMPTY_CATEGORY_SCORES };
    session.strengths = reportData.strengths || [];
    session.weaknesses = reportData.weaknesses || [];
    session.improvementSuggestions = reportData.improvementSuggestions || [];
    session.recommendedLearningPath = reportData.recommendedLearningPath || [];
    session.meaningfulAnswersCount = reportData.meaningfulAnswersCount || 0;
    session.totalQuestionsAsked = reportData.totalQuestionsCount || qaList.length;

    await session.save();

    const user = await User.findById(req.user._id);
    if (user) {
      user.interviewCompleted = true;
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: 'Interview completed successfully',
      report: {
        _id: session._id,
        overallScore: session.overallScore,
        durationMinutes,
        totalQuestions: session.totalQuestions,
        totalQuestionsAsked: session.totalQuestionsAsked,
        meaningfulAnswersCount: session.meaningfulAnswersCount,
        categoryScores: session.categoryScores,
        summary: reportData.summary || '',
        strengths: session.strengths,
        weaknesses: session.weaknesses,
        improvementSuggestions: session.improvementSuggestions,
        recommendedLearningPath: session.recommendedLearningPath
      },
      answers
    });

  } catch (error) {
    next(error);
  }
};

const getReport = async (req, res, next) => {
  try {
    const report = await InterviewSession.findOne({ userId: req.user._id, status: 'COMPLETED' }, { sort: true });

    if (!report) {
      return res.status(200).json({
        success: true,
        report: null
      });
    }

    const answers = await InterviewAnswer.find({ sessionId: report._id });

    res.status(200).json({
      success: true,
      report,
      answers
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInterviewIntro,
  startInterview,
  submitVideoAnswer,
  endInterview,
  getReport
};
