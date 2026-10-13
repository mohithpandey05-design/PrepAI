const User = require('../models/User');
const ResumeAnalysis = require('../models/ResumeAnalysis');
const fs = require('fs');
const path = require('path');
const { isValidCandidateName } = require('../utils/candidateNameValidator');

const { analyzeResumeWithGemini } = require('../services/geminiService');

const uploadResume = async (req, res, next) => {
  try {
    console.log('[RESUME] Upload received');
    if (!req.file) {
      res.status(400);
      throw new Error('Please upload a file');
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    if (user.resumeFileName) {
      const oldFilePath = path.join(__dirname, '..', 'uploads', 'resumes', user.resumeFileName);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    user.resumeUrl = `/uploads/resumes/${req.file.filename}`;
    user.resumeFileName = req.file.filename;
    user.resumeUploadedAt = new Date();
    user.resumeUploaded = true;

    const resumePath = path.join(__dirname, '..', 'uploads', 'resumes', req.file.filename);
    console.log('[RESUME] File path:', resumePath);

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
    if (resumeText && resumeText.trim().length >= 20) {
      console.log('[RESUME] Candidate text detected');
    }

    let analysis = null;
    if (resumeText && resumeText.trim().length >= 20) {
      console.log('[RESUME] Gemini extraction started');
      const analysisData = await analyzeResumeWithGemini(resumeText);
      console.log('[RESUME] Gemini extraction completed');

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

      analysis = await ResumeAnalysis.findOne({ userId: user._id });
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

      console.log('[RESUME] Updating MySQL profile for user ID:', user.id);

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
      if (analysisData.phone) {
        user.phone = analysisData.phone;
      }
      if (analysisData.college) {
        user.college = analysisData.college;
      }
      if (analysisData.branch) {
        user.branch = analysisData.branch;
      }
      if (analysisData.graduationYear) {
        user.graduationYear = parseInt(analysisData.graduationYear, 10) || user.graduationYear;
      }
      if (analysisData.skills && Array.isArray(analysisData.skills) && analysisData.skills.length > 0) {
        user.skills = [...new Set([...(user.skills || []), ...analysisData.skills])];
      }
      if (analysisData.detectedRole) {
        user.detectedRole = analysisData.detectedRole;
      }
    }

    const updatedUser = await user.save();
    console.log('[RESUME] MySQL profile updated successfully for candidate:', updatedUser.fullName);

    res.status(200).json({
      success: true,
      message: 'Resume uploaded, auto-parsed & profile updated successfully',
      user: updatedUser,
      analysis,
      resume: {
        url: updatedUser.resumeUrl,
        fileName: updatedUser.resumeFileName,
        uploadedAt: updatedUser.resumeUploadedAt
      }
    });
  } catch (error) {
    console.error('[RESUME ERROR]', error.message);
    next(error);
  }
};

const getResume = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    res.status(200).json({
      success: true,
      resume: {
        url: user.resumeUrl,
        fileName: user.resumeFileName,
        uploadedAt: user.resumeUploadedAt,
        status: user.resumeUploaded ? 'Resume Uploaded Successfully' : 'No Resume Uploaded'
      }
    });
  } catch (error) {
    next(error);
  }
};

const deleteResume = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    if (user.resumeFileName) {
      const filePath = path.join(__dirname, '..', 'uploads', 'resumes', user.resumeFileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    user.resumeUrl = '';
    user.resumeFileName = '';
    user.resumeUploadedAt = null;
    user.resumeUploaded = false;

    await user.save();
    await ResumeAnalysis.findOneAndDelete({ userId: req.user._id });

    res.status(200).json({
      success: true,
      message: 'Resume deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadResume,
  getResume,
  deleteResume
};
