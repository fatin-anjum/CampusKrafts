const { Test, Question, TestAttempt, User, Enrollment, Course } = require('../models');

// Fetch tests accessible to user
exports.getTests = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    if (role === 'admin') {
      const allTests = await Test.findAll({ include: [{ model: Course, as: 'course', attributes: ['title'] }] });
      return res.status(200).json(allTests);
    }

    if (role === 'instructor') {
      // Instructors see tests they created or all tests
      const tests = await Test.findAll({ include: [{ model: Course, as: 'course', attributes: ['title'] }] });
      return res.status(200).json(tests);
    }

    // Student: gets all free tests AND tests from courses they are active in
    const freeTests = await Test.findAll({ where: { isFree: true } });

    const enrollments = await Enrollment.findAll({
      where: { studentId: userId, status: 'active' },
      attributes: ['courseId']
    });
    const enrolledCourseIds = enrollments.map(e => e.courseId);

    let enrolledTests = [];
    if (enrolledCourseIds.length > 0) {
      enrolledTests = await Test.findAll({
        where: { courseId: enrolledCourseIds, isFree: false },
        include: [{ model: Course, as: 'course', attributes: ['title'] }]
      });
    }

    res.status(200).json({
      freeTests,
      enrolledTests
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch tests', error: error.message });
  }
};

// Create a new Test
exports.createTest = async (req, res) => {
  try {
    const { title, topic, timeLimit, isFree, courseId } = req.body;

    if (!title || !topic) {
      return res.status(400).json({ message: 'Title and topic are required' });
    }

    const test = await Test.create({
      title,
      topic,
      timeLimit: timeLimit || 30,
      isFree: isFree || false,
      courseId: courseId || null
    });

    res.status(201).json({ message: 'Test created successfully', test });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create test', error: error.message });
  }
};

// Add Question to Test
exports.addQuestion = async (req, res) => {
  try {
    const { testId } = req.params;
    const { questionText, optionA, optionB, optionC, optionD, correctAnswer, explanation, section } = req.body;

    if (!questionText || !optionA || !optionB || !optionC || !optionD || !correctAnswer || !section) {
      return res.status(400).json({ message: 'All question details and section name are required' });
    }

    const test = await Test.findByPk(testId);
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    const question = await Question.create({
      testId,
      questionText,
      optionA,
      optionB,
      optionC,
      optionD,
      correctAnswer,
      explanation,
      section
    });

    res.status(201).json({ message: 'Question added successfully', question });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add question', error: error.message });
  }
};

// Fetch questions for taking a test (hides correct answers)
exports.getTestForTaking = async (req, res) => {
  try {
    const { id } = req.params;
    const test = await Test.findByPk(id, {
      include: [
        {
          model: Question,
          as: 'questions',
          attributes: ['id', 'questionText', 'optionA', 'optionB', 'optionC', 'optionD', 'section']
        }
      ]
    });

    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    // Verify access
    if (!test.isFree) {
      const studentId = req.user.id;
      const role = req.user.role;
      if (role !== 'admin' && role !== 'instructor') {
        const enrollment = await Enrollment.findOne({
          where: { studentId, courseId: test.courseId, status: 'active' }
        });
        if (!enrollment) {
          return res.status(403).json({ message: 'You must buy the course to access this test' });
        }
      }
    }

    res.status(200).json(test);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load test details', error: error.message });
  }
};

// Submit test answers and autograde
exports.submitTest = async (req, res) => {
  try {
    const { id } = req.params;
    const { answers, timeTaken } = req.body; // answers is an object: { questionId: selectedOption }
    const studentId = req.user.id;

    const test = await Test.findByPk(id, {
      include: [{ model: Question, as: 'questions' }]
    });

    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    const questions = test.questions;
    let correctCount = 0;
    const totalQuestions = questions.length;
    const sectionsPerformance = {}; // track score per section, e.g. { Mathematics: { correct: 1, total: 2 } }

    const results = questions.map(q => {
      const userAnswer = answers[q.id.toString()] || '';
      const isCorrect = userAnswer === q.correctAnswer;
      
      if (isCorrect) {
        correctCount++;
      }

      // Track section metrics
      const sec = q.section;
      if (!sectionsPerformance[sec]) {
        sectionsPerformance[sec] = { correct: 0, total: 0 };
      }
      sectionsPerformance[sec].total++;
      if (isCorrect) {
        sectionsPerformance[sec].correct++;
      }

      return {
        questionId: q.id,
        questionText: q.questionText,
        userAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect,
        explanation: q.explanation
      };
    });

    const score = totalQuestions > 0 ? parseFloat(((correctCount / totalQuestions) * 100).toFixed(2)) : 0;

    // Create TestAttempt
    const attempt = await TestAttempt.create({
      studentId,
      testId: id,
      score,
      answers: JSON.stringify(answers),
      timeTaken: timeTaken || 0
    });

    // Personalization: Identify weak topics (sections with scores < 60%)
    const weakTopicsList = [];
    Object.keys(sectionsPerformance).forEach(sec => {
      const rate = (sectionsPerformance[sec].correct / sectionsPerformance[sec].total) * 100;
      if (rate < 60) {
        weakTopicsList.push(sec);
      }
    });

    // Save weak topics back to user profile
    const student = await User.findByPk(studentId);
    let existingWeakTopics = [];
    try {
      existingWeakTopics = JSON.parse(student.weakTopics || '[]');
    } catch (e) {
      existingWeakTopics = [];
    }

    // Merge & Deduplicate
    const mergedWeakTopics = Array.from(new Set([...existingWeakTopics, ...weakTopicsList]));
    student.weakTopics = JSON.stringify(mergedWeakTopics);
    await student.save();

    res.status(200).json({
      message: 'Test submitted and graded successfully',
      attemptId: attempt.id,
      score,
      correctCount,
      totalQuestions,
      results,
      weakTopicsIdentified: weakTopicsList,
      sectionsPerformance
    });
  } catch (error) {
    res.status(500).json({ message: 'Submission failed', error: error.message });
  }
};

// Get attempts history
exports.getAttempts = async (req, res) => {
  try {
    const studentId = req.user.id;
    const attempts = await TestAttempt.findAll({
      where: { studentId },
      include: [{ model: Test, as: 'test', attributes: ['title', 'topic', 'isFree'] }],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json(attempts);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve test history', error: error.message });
  }
};

// Get leaderboard for a test
exports.getLeaderboard = async (req, res) => {
  try {
    const { testId } = req.params;
    const leaderboard = await TestAttempt.findAll({
      where: { testId },
      include: [{ model: User, as: 'student', attributes: ['name', 'email'] }],
      order: [
        ['score', 'DESC'],
        ['timeTaken', 'ASC']
      ],
      limit: 10
    });

    res.status(200).json(leaderboard);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch leaderboard', error: error.message });
  }
};

// Get Questions for admin/instructor view
exports.getTestQuestions = async (req, res) => {
  try {
    const { id } = req.params;
    const test = await Test.findByPk(id, {
      include: [{ model: Question, as: 'questions' }]
    });

    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    res.status(200).json(test.questions);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch test questions', error: error.message });
  }
};

// Fetch all student test attempts (Instructor/Admin Gradebook view)
exports.getAllAttempts = async (req, res) => {
  try {
    const attempts = await TestAttempt.findAll({
      include: [
        { model: User, as: 'student', attributes: ['name', 'email'] },
        { model: Test, as: 'test', attributes: ['title', 'topic'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.status(200).json(attempts);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch student attempts', error: error.message });
  }
};

