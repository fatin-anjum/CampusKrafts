const { Course, Enrollment, Lecture, User } = require('../models');

// Get all courses
exports.getCourses = async (req, res) => {
  try {
    const { status } = req.query;
    const whereClause = {};
    if (status) {
      whereClause.status = status;
    } else {
      // By default, non-admins see only approved courses
      if (!req.user || req.user.role !== 'admin') {
        whereClause.status = 'approved';
      }
    }

    const courses = await Course.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'instructor',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.status(200).json(courses);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve courses', error: error.message });
  }
};

// Get single course details
exports.getCourseDetails = async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'instructor',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.status(200).json(course);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve course details', error: error.message });
  }
};

// Create Course
exports.createCourse = async (req, res) => {
  try {
    const { title, description, price, departments, sections, image } = req.body;

    if (!title || !description || !departments) {
      return res.status(400).json({ message: 'Title, description, and departments are required' });
    }

    const instructorId = req.user.id;
    // Admins' courses are auto-approved, instructors are pending
    const status = req.user.role === 'admin' ? 'approved' : 'pending';

    const course = await Course.create({
      title,
      description,
      price: price || 0.00,
      departments,
      sections: typeof sections === 'string' ? sections : JSON.stringify(sections || []),
      image: image || '',
      instructorId,
      status
    });

    res.status(201).json({ message: 'Course created successfully', course });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create course', error: error.message });
  }
};

// Enroll in course (with bKash payment simulation)
exports.enroll = async (req, res) => {
  try {
    const { courseId, batch, bkashTrxId, paidAmount } = req.body;
    const studentId = req.user.id;

    if (!courseId || !batch) {
      return res.status(400).json({ message: 'Course ID and batch selection are required' });
    }

    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({ where: { studentId, courseId } });
    if (existingEnrollment) {
      return res.status(400).json({ message: 'You are already enrolled in this course' });
    }

    const isFree = parseFloat(course.price) === 0;

    let enrollmentStatus = 'active';
    if (!isFree) {
      if (!bkashTrxId) {
        return res.status(400).json({ message: 'bKash Transaction ID is required for paid courses' });
      }
      // In production, we'd verify the TrxId. Here we auto-approve for testing.
      enrollmentStatus = 'active';
    }

    const enrollment = await Enrollment.create({
      studentId,
      courseId,
      batch,
      status: enrollmentStatus,
      bkashTrxId: isFree ? 'FREE' : bkashTrxId,
      paidAmount: isFree ? 0.00 : paidAmount || course.price,
    });

    res.status(201).json({
      message: isFree ? 'Enrolled successfully!' : 'Enrollment activated. Payment verified via simulated bKash gateway.',
      enrollment
    });
  } catch (error) {
    res.status(500).json({ message: 'Enrollment failed', error: error.message });
  }
};

// Get student enrollments
exports.getStudentEnrollments = async (req, res) => {
  try {
    const studentId = req.user.id;
    const enrollments = await Enrollment.findAll({
      where: { studentId },
      include: [
        {
          model: Course,
          as: 'course',
          include: [
            {
              model: User,
              as: 'instructor',
              attributes: ['name', 'email']
            }
          ]
        }
      ]
    });
    res.status(200).json(enrollments);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch enrollment history', error: error.message });
  }
};

// Create Lecture
exports.createLecture = async (req, res) => {
  try {
    const { courseId, title, videoUrl, materialsUrl, scheduleTime, duration, isLive } = req.body;

    if (!courseId || !title || !scheduleTime) {
      return res.status(400).json({ message: 'Course ID, title, and schedule time are required' });
    }

    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Verify instructor owns the course, or is admin
    if (req.user.role !== 'admin' && course.instructorId !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized to add lectures to this course' });
    }

    const lecture = await Lecture.create({
      courseId,
      title,
      videoUrl: videoUrl || '',
      materialsUrl: materialsUrl || '',
      scheduleTime,
      duration: duration || 60,
      isLive: isLive || false,
      attendance: '[]'
    });

    res.status(201).json({ message: 'Lecture scheduled/uploaded successfully', lecture });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create lecture', error: error.message });
  }
};

// Get lectures for a course
exports.getLectures = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findByPk(courseId);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Verify permissions: admin, instructor of the course, or enrolled student
    let canAccess = false;

    if (req.user.role === 'admin') {
      canAccess = true;
    } else if (req.user.role === 'instructor' && course.instructorId === req.user.id) {
      canAccess = true;
    } else if (req.user.role === 'student') {
      const enrollment = await Enrollment.findOne({
        where: { studentId: req.user.id, courseId, status: 'active' }
      });
      if (enrollment) canAccess = true;
    }

    if (!canAccess) {
      return res.status(403).json({ message: 'You do not have access to this course content' });
    }

    const lectures = await Lecture.findAll({
      where: { courseId },
      order: [['scheduleTime', 'ASC']]
    });

    res.status(200).json(lectures);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch lectures', error: error.message });
  }
};

// Mark Attendance
exports.trackAttendance = async (req, res) => {
  try {
    const { lectureId } = req.params;
    const studentId = req.user.id;

    const lecture = await Lecture.findByPk(lectureId);
    if (!lecture) {
      return res.status(404).json({ message: 'Lecture not found' });
    }

    // Verify student is enrolled in the course that includes this lecture
    const enrollment = await Enrollment.findOne({
      where: { studentId, courseId: lecture.courseId, status: 'active' }
    });

    if (!enrollment) {
      return res.status(403).json({ message: 'You are not enrolled in this course' });
    }

    let attendanceList = JSON.parse(lecture.attendance || '[]');
    if (!attendanceList.includes(studentId)) {
      attendanceList.push(studentId);
      lecture.attendance = JSON.stringify(attendanceList);
      await lecture.save();
    }

    res.status(200).json({ message: 'Attendance tracked successfully', attendance: attendanceList });
  } catch (error) {
    res.status(500).json({ message: 'Failed to record attendance', error: error.message });
  }
};
