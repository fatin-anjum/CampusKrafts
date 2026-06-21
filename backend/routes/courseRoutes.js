const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', courseController.getCourses);
router.get('/:id', courseController.getCourseDetails);
router.post('/', protect, authorize('instructor', 'admin'), courseController.createCourse);
router.post('/enroll', protect, authorize('student'), courseController.enroll);
router.get('/student/history', protect, authorize('student'), courseController.getStudentEnrollments);
router.post('/lectures', protect, authorize('instructor', 'admin'), courseController.createLecture);
router.get('/:courseId/lectures', protect, courseController.getLectures);
router.post('/lectures/:lectureId/attendance', protect, authorize('student'), courseController.trackAttendance);

module.exports = router;
