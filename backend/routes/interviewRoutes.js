const express = require('express');
const router = express.Router();
const {
  getInterviewIntro,
  startInterview,
  submitVideoAnswer,
  endInterview,
  getReport
} = require('../controllers/interviewController');
const { protect } = require('../middleware/authMiddleware');

router.get('/intro', protect, getInterviewIntro);
router.post('/start', protect, startInterview);
router.post('/answer', protect, submitVideoAnswer);
router.post('/end', protect, endInterview);
router.get('/report', protect, getReport);

module.exports = router;
