const express = require('express');
const router = express.Router();
const { uploadResume, getResume, deleteResume } = require('../controllers/resumeController');
const { analyzeResume, getResumeAnalysis } = require('../controllers/resumeAnalysisController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.route('/')
  .get(protect, getResume)
  .delete(protect, deleteResume);

router.post('/upload', protect, (req, res, next) => {
  const multerUpload = upload.single('resume');
  multerUpload(req, res, function (err) {
    if (err) {
      res.status(400);
      return next(new Error(err.message));
    }
    next();
  });
}, uploadResume);

router.post('/analyze', protect, analyzeResume);
router.get('/analysis', protect, getResumeAnalysis);

module.exports = router;
