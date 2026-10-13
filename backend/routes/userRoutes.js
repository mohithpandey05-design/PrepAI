const express = require('express');
const router = express.Router();
const { getUserProfile, updateUserProfile, getAvailableRoles, updateUserRole, applyResumeData } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.get('/roles', getAvailableRoles);
router.put('/role', protect, updateUserRole);
router.post('/apply-resume-data', protect, applyResumeData);
router.get('/me', protect, getUserProfile);
router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

module.exports = router;
