const User = require('../models/User');
const ResumeAnalysis = require('../models/ResumeAnalysis');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const { analyzeResumeWithGemini } = require('../services/geminiService');
const { isValidCandidateName } = require('../utils/candidateNameValidator');

const analyzeResume = async (req, res, next) => {
  try {
    console.log('[RESUME] Upload received');
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    if (!user.resumeFileName) {
      res.status(400);
      throw new Error('No resume found. Please upload a resume first.');
    }

    const resumePath = path.join(__dirname, '..', 'uploads', 'resumes', user.resumeFileName);
    console.log('[RESUME] File path:', resumePath);

    if (!fs.existsSync(resumePath)) {
      res.status(404);
      throw new Error('Resume file is missing from server.');
    }

    const dataBuffer = fs.readFileSync(resumePath);
    console.log('[RESUME] File size:', dataBuffer.length, 'bytes');

    let resumeText = '';
    try {
      const pdfParse = require('pdf-parse');
      const pdfData = await pdfParse(dataBuffer);
      resumeText = pdfData ? pdfData.text || '' : '';
    } catch (pdfErr) {
      console.warn('[RESUME] Primary pdf-parse warning, using fallback decode:', pdfErr.message);
      resumeText = dataBuffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ');
    }

    console.log('[RESUME] Extracted text length:', resumeText.length);
    if (!resumeText || resumeText.trim().length < 20) {
      res.status(400);
      throw new Error('Could not extract readable text from the PDF file. Please ensure it is a text-based PDF.');
    }

    console.log('[RESUME] Gemini extraction started');
    const analysisData = await analyzeResumeWithGemini(resumeText);
    console.log('[RESUME] Gemini extraction completed');

    let analysis = await ResumeAnalysis.findOne({ userId: user._id });

    const updateFields = {
      resumeScore: analysisData.resumeScore || 85,
      atsScore: analysisData.atsScore || analysisData.resumeScore || 85,
      summary: analysisData.summary || '',
      detectedSkills: analysisData.skills || [],
      missingSkills: analysisData.missingSkills || [],
      strengths: analysisData.strengths || [],
      weaknesses: analysisData.weaknesses || [],
      experience: analysisData.experience || [],
      education: analysisData.education || [],
      projects: analysisData.projects || [],
      detectedRole: analysisData.detectedRole || 'Software Engineer',
      recommendedRoles: analysisData.recommendedRoles || [],
      analysisDate: new Date(),
    };

    if (analysis) {
      Object.assign(analysis, updateFields);
      await analysis.save();
    } else {
      analysis = await ResumeAnalysis.create({
        userId: user._id,
        ...updateFields,
      });
    }
    console.log('[RESUME] Resume analysis saved to MySQL table resume_analyses');

    const editedFields = Array.isArray(user.manuallyEditedFields) ? user.manuallyEditedFields : [];
    const existingName = user.fullName || '';
    const candidateName = analysisData.fullName ? analysisData.fullName.trim() : '';

    console.log(`[PROFILE] Existing name: "${existingName}"`);
    console.log(`[RESUME] Candidate name candidate: "${candidateName}"`);

    const isCandidateNameValid = isValidCandidateName(candidateName);
    console.log(`[RESUME] Candidate name validation: ${isCandidateNameValid ? 'VALID' : 'INVALID'}`);

    if (isCandidateNameValid) {
      const hasValidExistingName = isValidCandidateName(existingName) && !user.isResumeDerivedName;
      if (!editedFields.includes('fullName') && !hasValidExistingName) {
        user.fullName = candidateName;
        user.isResumeDerivedName = true;
        console.log(`[RESUME] Full name updated: "${user.fullName}"`);
      } else {
        console.log(`[RESUME] Full name update skipped: keeping existing name "${existingName}"`);
      }
    } else {
      console.log('[RESUME] Full name update skipped');
    }

    if (!editedFields.includes('phone') && analysisData.phone && typeof analysisData.phone === 'string') {
      user.phone = analysisData.phone;
    }
    if (!editedFields.includes('college') && analysisData.college) {
      user.college = analysisData.college;
    }
    if (!editedFields.includes('branch') && analysisData.branch) {
      user.branch = analysisData.branch;
    }
    if (!editedFields.includes('graduationYear') && analysisData.graduationYear) {
      user.graduationYear = parseInt(analysisData.graduationYear, 10) || user.graduationYear;
    }
    if (!editedFields.includes('skills') && analysisData.skills && Array.isArray(analysisData.skills) && analysisData.skills.length > 0) {
      user.skills = [...new Set([...(user.skills || []), ...analysisData.skills])];
    }
    if (analysisData.detectedRole) {
      user.detectedRole = analysisData.detectedRole;
      if (!user.selectedRole || user.selectedRole === 'Software Engineer') {
        user.selectedRole = analysisData.detectedRole;
      }
    }

    user.resumeUploaded = true;
    const updatedUser = await user.save();
    console.log('[RESUME] MySQL profile updated successfully for candidate:', updatedUser.fullName);

    const resumeDetectedInformation = {
      fullName: isValidCandidateName(analysisData.fullName) ? analysisData.fullName.trim() : user.fullName,
      phone: analysisData.phone || user.phone,
      college: analysisData.college || user.college,
      branch: analysisData.branch || user.branch,
      graduationYear: analysisData.graduationYear || user.graduationYear,
      skills: analysisData.skills || user.skills,
      detectedRole: analysisData.detectedRole || user.detectedRole
    };

    res.status(200).json({
      success: true,
      message: 'Resume analyzed successfully',
      user: updatedUser,
      analysis,
      resumeDetectedInformation
    });

  } catch (error) {
    console.error('[RESUME ERROR]', error.message);
    next(error);
  }
};

const getResumeAnalysis = async (req, res, next) => {
  try {
    const analysis = await ResumeAnalysis.findOne({ userId: req.user._id });
    if (!analysis) {
      return res.status(200).json({
        success: true,
        analysis: null
      });
    }
    res.status(200).json({
      success: true,
      analysis
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  analyzeResume,
  getResumeAnalysis,
  isValidCandidateName
};
