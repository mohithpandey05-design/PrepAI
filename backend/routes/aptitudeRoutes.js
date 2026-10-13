const express = require('express');
const router = express.Router();
const { startTest, submitTest, getResult } = require('../controllers/aptitudeController');
const { protect } = require('../middleware/authMiddleware');

router.get('/start', protect, startTest);
router.post('/submit', protect, submitTest);
router.get('/result', protect, getResult);

module.exports = router;
