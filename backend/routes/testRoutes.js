const express = require('express');
const router = express.Router();
const testController = require('../controllers/testController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, testController.getTests);
router.post('/', protect, authorize('instructor', 'admin'), testController.createTest);
router.get('/:id/take', protect, testController.getTestForTaking);
router.post('/:id/submit', protect, authorize('student'), testController.submitTest);
router.get('/attempts', protect, authorize('student'), testController.getAttempts);
router.get('/attempts/all', protect, authorize('instructor', 'admin'), testController.getAllAttempts);
router.get('/:testId/leaderboard', protect, testController.getLeaderboard);
router.get('/:id/questions', protect, authorize('instructor', 'admin'), testController.getTestQuestions);
router.post('/:testId/questions', protect, authorize('instructor', 'admin'), testController.addQuestion);

module.exports = router;
