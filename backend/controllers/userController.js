const User = require('../models/User');
const { isValidCandidateName } = require('../utils/candidateNameValidator');

const AVAILABLE_ROLES = [
  'Software Engineer',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'MERN Stack Developer',
  'Python Developer',
  'Java Developer',
  'C++ Developer',
  'Data Analyst',
  'Data Scientist',
  'AI/ML Engineer',
  'DevOps Engineer',
  'Cloud Engineer',
  'Mobile Developer',
  'QA / Test Engineer',
  'Cybersecurity Engineer'
];

function buildUserResponse(user) {
  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    college: user.college,
    branch: user.branch,
    graduationYear: user.graduationYear,
    skills: user.skills,
    linkedin: user.linkedin,
    github: user.github,
    profileImage: user.profileImage,
    detectedRole: user.detectedRole || 'Software Engineer',
    selectedRole: user.selectedRole || user.detectedRole || 'Software Engineer',
    isResumeDerivedName: Boolean(user.isResumeDerivedName),
    manualProfileData: user.manualProfileData || {},
    manuallyEditedFields: user.manuallyEditedFields || [],
    dataSource: user.dataSource || 'resume',
    role: user.role,
    isVerified: user.isVerified,
    resumeUploaded: user.resumeUploaded,
    resumeUrl: user.resumeUrl,
    resumeFileName: user.resumeFileName,
    aptitudeCompleted: user.aptitudeCompleted,
    codingCompleted: user.codingCompleted,
    interviewCompleted: user.interviewCompleted,
  };
}

const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      res.status(200).json({
        success: true,
        user: buildUserResponse(user),
      });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};

const getAvailableRoles = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      roles: AVAILABLE_ROLES
    });
  } catch (error) {
    next(error);
  }
};

const updateUserRole = async (req, res, next) => {
  try {
    const { selectedRole } = req.body;
    if (!selectedRole || !AVAILABLE_ROLES.includes(selectedRole)) {
      res.status(400);
      throw new Error(`Invalid role. Available roles: ${AVAILABLE_ROLES.join(', ')}`);
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    user.selectedRole = selectedRole;
    const updatedUser = await user.save();
    console.log(`[USER ROLE] Updated selected_role for ${user.email} to: ${selectedRole}`);

    res.status(200).json({
      success: true,
      message: 'Selected role updated successfully',
      user: buildUserResponse(updatedUser)
    });
  } catch (error) {
    next(error);
  }
};

const updateUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    const edited = new Set(Array.isArray(user.manuallyEditedFields) ? user.manuallyEditedFields : []);

    if (req.body.fullName && typeof req.body.fullName === 'string' && req.body.fullName.trim()) {
      const candidateName = req.body.fullName.trim();
      if (!isValidCandidateName(candidateName)) {
        res.status(400);
        throw new Error('Invalid candidate name. Name must contain valid alphabetic characters and cannot be an email, phone, URL, file name, or resume heading.');
      }
      user.fullName = candidateName;
      user.isResumeDerivedName = false;
      edited.add('fullName');
    }

    if (req.body.phone !== undefined) {
      user.phone = req.body.phone;
      edited.add('phone');
    }
    if (req.body.college !== undefined) {
      user.college = req.body.college;
      edited.add('college');
    }
    if (req.body.branch !== undefined) {
      user.branch = req.body.branch;
      edited.add('branch');
    }
    if (req.body.graduationYear !== undefined) {
      user.graduationYear = req.body.graduationYear ? parseInt(req.body.graduationYear, 10) : null;
      edited.add('graduationYear');
    }
    if (req.body.linkedin !== undefined) {
      user.linkedin = req.body.linkedin;
      edited.add('linkedin');
    }
    if (req.body.github !== undefined) {
      user.github = req.body.github;
      edited.add('github');
    }

    if (req.body.selectedRole && AVAILABLE_ROLES.includes(req.body.selectedRole)) {
      user.selectedRole = req.body.selectedRole;
      edited.add('selectedRole');
    }

    if (req.body.skills) {
      if (Array.isArray(req.body.skills)) {
        user.skills = req.body.skills;
      } else if (typeof req.body.skills === 'string') {
        user.skills = req.body.skills.split(',').map(skill => skill.trim()).filter(s => s);
      }
      edited.add('skills');
    }

    if (req.body.manualProfileData && typeof req.body.manualProfileData === 'object') {
      user.manualProfileData = {
        ...(user.manualProfileData || {}),
        ...req.body.manualProfileData
      };
    }

    user.manuallyEditedFields = Array.from(edited);
    user.dataSource = 'manual';

    const updatedUser = await user.save();
    console.log('[PROFILE MANUAL] Successfully saved manual profile to MySQL for candidate:', updatedUser.fullName);

    res.status(200).json({
      success: true,
      message: 'Manual profile saved successfully to MySQL',
      user: buildUserResponse(updatedUser),
    });
  } catch (error) {
    next(error);
  }
};

const applyResumeData = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    const { fullName, phone, college, branch, graduationYear, skills, selectedRole } = req.body;
    if (fullName && isValidCandidateName(fullName)) {
      user.fullName = fullName.trim();
      user.isResumeDerivedName = true;
    }
    if (phone) user.phone = phone;
    if (college) user.college = college;
    if (branch) user.branch = branch;
    if (graduationYear) user.graduationYear = parseInt(graduationYear, 10) || user.graduationYear;
    if (skills && Array.isArray(skills)) user.skills = skills;
    if (selectedRole && AVAILABLE_ROLES.includes(selectedRole)) user.selectedRole = selectedRole;

    user.dataSource = 'resume';
    const updatedUser = await user.save();

    res.status(200).json({
      success: true,
      message: 'Resume data applied to candidate profile successfully',
      user: buildUserResponse(updatedUser)
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserProfile,
  getAvailableRoles,
  updateUserRole,
  updateUserProfile,
  applyResumeData,
  AVAILABLE_ROLES
};
