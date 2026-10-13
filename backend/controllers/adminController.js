const User = require('../models/User');
const ResumeAnalysis = require('../models/ResumeAnalysis');
const AptitudeResult = require('../models/AptitudeResult');
const CodingResult = require('../models/CodingResult');
const InterviewSession = require('../models/InterviewSession');
const InterviewAnswer = require('../models/InterviewAnswer');

const getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    const query = search
      ? {
          $or: [
            { fullName: { $regex: search } },
            { email: { $regex: search } },
          ],
        }
      : {};

    const total = await User.countDocuments(query);
    const users = await User.find(query, { sort: true, skip, limit });

    res.status(200).json({
      success: true,
      users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit) || 1,
        totalUsers: total,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getUserDetails = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    const resumeAnalysis = await ResumeAnalysis.findOne({ userId });
    const aptitudeResult = await AptitudeResult.findOne({ userId });
    const codingResults = await CodingResult.find({ userId });
    const interviewSession = await InterviewSession.findOne({ userId, status: 'COMPLETED' }, { sort: true });

    let interviewAnswers = [];
    if (interviewSession) {
      interviewAnswers = await InterviewAnswer.find({ sessionId: interviewSession._id });
    }

    res.status(200).json({
      success: true,
      user,
      resumeAnalysis,
      aptitudeResult,
      codingResults,
      interviewSession,
      interviewAnswers,
    });
  } catch (error) {
    next(error);
  }
};

const getPlatformStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ isVerified: true });
    const resumesUploaded = await User.countDocuments({ resumeUploaded: true });
    const aptitudeCompleted = await User.countDocuments({ aptitudeCompleted: true });
    const codingCompleted = await User.countDocuments({ codingCompleted: true });
    const interviewCompleted = await User.countDocuments({ interviewCompleted: true });

    const aptitudePassRate = await AptitudeResult.countDocuments({ status: 'PASS' });
    const aptitudeTotal = await AptitudeResult.countDocuments();

    const avgAptitudeScore = await AptitudeResult.getAveragePercentage();
    const avgInterviewScore = await InterviewSession.getAverageScore();

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        verifiedUsers,
        resumesUploaded,
        aptitudeCompleted,
        codingCompleted,
        interviewCompleted,
        aptitudePassRate: aptitudeTotal > 0 ? Math.round((aptitudePassRate / aptitudeTotal) * 100) : 0,
        avgAptitudeScore,
        avgInterviewScore,
      },
    });
  } catch (error) {
    next(error);
  }
};

const exportData = async (req, res, next) => {
  try {
    const users = await User.find({});

    const exportData = [];

    for (const user of users) {
      const aptResult = await AptitudeResult.findOne({ userId: user._id });
      const codingResults = await CodingResult.find({ userId: user._id });
      const interview = await InterviewSession.findOne({ userId: user._id, status: 'COMPLETED' }, { sort: true });
      const resumeAnalysis = await ResumeAnalysis.findOne({ userId: user._id });

      const avgCodingScore = codingResults.length > 0
        ? Math.round(codingResults.reduce((sum, r) => sum + r.score, 0) / codingResults.length)
        : 0;

      exportData.push({
        name: user.fullName,
        email: user.email,
        college: user.college || '',
        branch: user.branch || '',
        detectedRole: resumeAnalysis ? resumeAnalysis.detectedRole : '',
        resumeScore: resumeAnalysis ? resumeAnalysis.resumeScore : 0,
        aptitudeScore: aptResult ? aptResult.percentage : 0,
        aptitudeStatus: aptResult ? aptResult.status : 'NOT_TAKEN',
        codingScore: avgCodingScore,
        interviewScore: interview ? interview.overallScore : 0,
        registeredAt: user.createdAt,
      });
    }

    res.status(200).json({
      success: true,
      data: exportData,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  getUserDetails,
  getPlatformStats,
  exportData,
};
