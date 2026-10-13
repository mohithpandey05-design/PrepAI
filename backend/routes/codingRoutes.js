const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { startRound, runCode, submitCode, getResult } = require('../controllers/codingController');
const { protect } = require('../middleware/authMiddleware');

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: 'Too many requests from this IP, please try again after a minute'
});

router.get('/start', protect, startRound);
router.post('/run', protect, apiLimiter, runCode);
router.post('/submit', protect, apiLimiter, submitCode);
router.get('/result', protect, getResult);

module.exports = router;
