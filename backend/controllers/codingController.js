const CodingQuestion = require('../models/CodingQuestion');
const CodingResult = require('../models/CodingResult');
const User = require('../models/User');
const ResumeAnalysis = require('../models/ResumeAnalysis');
const { executeCode } = require('../services/judge0Service');

function getRoleTag(role) {
  const roleTagMap = {
    'Software Engineer': 'dsa',
    'Frontend Developer': 'frontend',
    'Backend Developer': 'backend',
    'Full Stack Developer': 'fullstack',
    'MERN Stack Developer': 'fullstack',
    'Python Developer': 'backend',
    'Java Developer': 'backend',
    'C++ Developer': 'dsa',
    'Data Analyst': 'dsa',
    'Data Scientist': 'dsa',
    'AI/ML Engineer': 'dsa',
    'DevOps Engineer': 'backend',
    'Cloud Engineer': 'backend',
    'Mobile Developer': 'frontend',
    'QA / Test Engineer': 'dsa',
    'Cybersecurity Engineer': 'dsa'
  };
  return roleTagMap[role] || 'dsa';
}

const startRound = async (req, res, next) => {
  try {
    const selectedRole = req.user.selectedRole || req.user.detectedRole || 'Software Engineer';
    const roleTag = getRoleTag(selectedRole);

    const allQuestions = await CodingQuestion.getProgressionQuestions(roleTag);

    const safeQuestions = allQuestions.filter(Boolean).map(q => ({
      _id: q._id,
      id: q.id,
      title: q.title,
      description: q.description,
      difficulty: q.difficulty,
      category: q.category,
      role: q.role,
      tags: q.tags,
      topics: q.topics || q.tags,
      inputFormat: q.inputFormat,
      outputFormat: q.outputFormat,
      constraints: q.constraints,
      followUp: q.followUp,
      acceptanceRate: q.acceptanceRate || '78.5%',
      submissionsCount: q.submissionsCount || 1240,
      hints: q.hints || [],
      similarQuestions: q.similarQuestions || [],
      sampleInput: q.sampleInput,
      sampleOutput: q.sampleOutput,
      starterCode: q.starterCode,
      testCases: q.testCases
    }));

    res.status(200).json({
      success: true,
      questions: safeQuestions,
      selectedRole,
      detectedRole: req.user.detectedRole || 'Software Engineer'
    });

  } catch (error) {
    next(error);
  }
};

function normalizeOutput(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .trim();
}

const runCode = async (req, res, next) => {
  try {
    const { questionId, language, code, input, expectedOutput, testCases: reqTestCases } = req.body;
    if (!language || !code) {
      res.status(400);
      throw new Error('Language and code are required');
    }

    let publicCases = [];
    let question = null;

    if (questionId) {
      question = await CodingQuestion.findById(questionId);
    }

    if (reqTestCases && Array.isArray(reqTestCases) && reqTestCases.length > 0) {
      publicCases = reqTestCases;
    } else if (question && question.testCases && question.testCases.length > 0) {
      publicCases = question.testCases;
    } else {
      let sampleInput = input || (question ? question.sampleInput : '');
      let expected = expectedOutput || (question ? question.sampleOutput : '');
      publicCases = [{ input: sampleInput, output: expected }];
    }

    let passedCount = 0;
    const testCaseResults = [];
    let isCompileError = false;
    let overallStatus = 'Accepted';
    let compileErrorOutput = null;

    for (let i = 0; i < publicCases.length; i++) {
      const tc = publicCases[i];
      const tcInput = tc.input !== undefined ? tc.input : '';
      const tcOutput = tc.output !== undefined ? tc.output : (tc.expectedOutput || '');

      if (isCompileError) {
        testCaseResults.push({
          testCaseNum: i + 1,
          passed: false,
          input: tcInput,
          yourOutput: null,
          expectedOutput: tcOutput,
          status: 'Compilation Error',
          compileOutput: compileErrorOutput
        });
        continue;
      }

      const result = await executeCode(language, code, tcInput);
      const outNorm = normalizeOutput(result.stdout);
      const expNorm = normalizeOutput(tcOutput);

      if (result.status === 'Compilation Error' || result.compile_output) {
        isCompileError = true;
        overallStatus = 'Compilation Error';
        compileErrorOutput = result.compile_output || result.stderr;
        testCaseResults.push({
          testCaseNum: i + 1,
          passed: false,
          input: tcInput,
          yourOutput: null,
          expectedOutput: tcOutput,
          status: 'Compilation Error',
          compileOutput: compileErrorOutput
        });
      } else if (result.status === 'Runtime Error') {
        if (overallStatus !== 'Compilation Error') overallStatus = 'Runtime Error';
        testCaseResults.push({
          testCaseNum: i + 1,
          passed: false,
          input: tcInput,
          yourOutput: result.stdout || '',
          expectedOutput: tcOutput,
          status: 'Runtime Error',
          stderr: result.stderr
        });
      } else if (result.status === 'Time Limit Exceeded') {
        if (overallStatus !== 'Compilation Error') overallStatus = 'Time Limit Exceeded';
        testCaseResults.push({
          testCaseNum: i + 1,
          passed: false,
          input: tcInput,
          yourOutput: null,
          expectedOutput: tcOutput,
          status: 'Time Limit Exceeded',
          stderr: result.stderr
        });
      } else {
        const isPassed = (outNorm === expNorm);
        if (isPassed) {
          passedCount++;
        } else {
          if (overallStatus === 'Accepted') overallStatus = 'Wrong Answer';
        }

        testCaseResults.push({
          testCaseNum: i + 1,
          passed: isPassed,
          input: tcInput,
          yourOutput: result.stdout || '',
          expectedOutput: tcOutput,
          status: isPassed ? 'Accepted' : 'Wrong Answer'
        });
      }
    }

    const firstResult = testCaseResults[0] || {};

    res.status(200).json({
      success: true,
      status: overallStatus,
      passed: passedCount === publicCases.length && !isCompileError,
      passedTestCases: passedCount,
      totalTestCases: publicCases.length,
      testCases: testCaseResults,
      input: firstResult.input || '',
      yourOutput: firstResult.yourOutput || '',
      expectedOutput: firstResult.expectedOutput || '',
      compileOutput: compileErrorOutput,
      stderr: firstResult.stderr || null
    });
  } catch (error) {
    next(error);
  }
};

const submitCode = async (req, res, next) => {
  try {
    const { questionId, language, code } = req.body;

    const question = await CodingQuestion.findById(questionId);
    if (!question) {
      res.status(404);
      throw new Error('Question not found');
    }

    const allTestCases = [...(question.testCases || []), ...(question.hiddenTestCases || [])];
    let passedCount = 0;
    const testCaseResults = [];
    let isCompileError = false;

    for (let i = 0; i < allTestCases.length; i++) {
      const tc = allTestCases[i];
      if (isCompileError) {
        testCaseResults.push({
          testCaseNum: i + 1,
          passed: false,
          input: tc.input,
          yourOutput: null,
          expectedOutput: tc.output,
          status: 'Compilation Error',
          compileOutput: 'Compilation skipped due to prior syntax error.'
        });
        continue;
      }

      const result = await executeCode(language, code, tc.input);
      const outNorm = normalizeOutput(result.stdout);
      const expectedNorm = normalizeOutput(tc.output);

      if (result.status === 'Compilation Error' || result.compile_output) {
        isCompileError = true;
        testCaseResults.push({
          testCaseNum: i + 1,
          passed: false,
          input: tc.input,
          yourOutput: null,
          expectedOutput: tc.output,
          status: 'Compilation Error',
          compileOutput: result.compile_output || result.stderr
        });
      } else {
        const isPassed = (outNorm === expectedNorm && (result.status === 'Accepted' || !result.stderr));
        if (isPassed) passedCount++;

        let tcStatus = result.status;
        if (tcStatus === 'Accepted' && !isPassed) {
          tcStatus = 'Wrong Answer';
        } else if (isPassed) {
          tcStatus = 'Accepted';
        }

        testCaseResults.push({
          testCaseNum: i + 1,
          passed: isPassed,
          input: tc.input,
          yourOutput: result.stdout || "",
          expectedOutput: tc.output,
          status: tcStatus,
          compileOutput: result.compile_output || null,
          stderr: result.stderr || null
        });
      }
    }

    const total = allTestCases.length;
    const score = Math.round((passedCount / total) * 100);
    const overallStatus = isCompileError ? 'Compilation Error' : (score >= 70 ? 'PASS' : 'FAIL');

    let resultRecord = await CodingResult.findOne({ userId: req.user._id, questionId });

    if (resultRecord) {
      resultRecord.language = language;
      resultRecord.submittedCode = code;
      resultRecord.passedTestCases = passedCount;
      resultRecord.totalTestCases = total;
      resultRecord.score = score;
      resultRecord.status = overallStatus;
      resultRecord.submittedAt = new Date();
      await resultRecord.save();
    } else {
      resultRecord = await CodingResult.create({
        userId: req.user._id,
        questionId,
        language,
        submittedCode: code,
        passedTestCases: passedCount,
        totalTestCases: total,
        score,
        status: overallStatus
      });
    }

    const user = await User.findById(req.user._id);
    if (user) {
      user.codingCompleted = true;
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: 'Code submitted successfully',
      result: {
        _id: resultRecord._id,
        questionId,
        language,
        status: isCompileError ? 'Compilation Error' : (passedCount === total ? 'Accepted' : 'Wrong Answer'),
        passedTestCases: passedCount,
        totalTestCases: total,
        score,
        submittedAt: resultRecord.submittedAt,
        testCases: testCaseResults
      }
    });
  } catch (error) {
    next(error);
  }
};

const getResult = async (req, res, next) => {
  try {
    const results = await CodingResult.find({ userId: req.user._id });

    res.status(200).json({
      success: true,
      results
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  startRound,
  runCode,
  submitCode,
  getResult
};
