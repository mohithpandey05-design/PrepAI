const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminMiddleware');
const {
  getAllUsers,
  getUserDetails,
  getPlatformStats,
  exportData,
} = require('../controllers/adminController');

router.use(protect, adminOnly);

router.get('/users', getAllUsers);
router.get('/users/:userId', getUserDetails);
router.get('/stats', getPlatformStats);
router.get('/export', exportData);

module.exports = router;
