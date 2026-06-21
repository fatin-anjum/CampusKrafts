const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

router.get('/stats', protect, authorize('admin'), adminController.getStats);
router.get('/users', protect, authorize('admin'), adminController.getUsers);
router.put('/users/:id', protect, authorize('admin'), adminController.updateUser);
router.delete('/users/:id', protect, authorize('admin'), adminController.deleteUser);
router.put('/courses/:id/approve', protect, authorize('admin'), adminController.approveCourse);
router.get('/settings', adminController.getSettings);
router.put('/settings', protect, authorize('admin'), adminController.updateSetting);

module.exports = router;
