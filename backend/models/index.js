const sequelize = require('../config/db');
const User = require('./User');
const Course = require('./Course');
const Enrollment = require('./Enrollment');
const Lecture = require('./Lecture');
const Test = require('./Test');
const Question = require('./Question');
const TestAttempt = require('./TestAttempt');
const ForumPost = require('./ForumPost');
const Announcement = require('./Announcement');
const Setting = require('./Setting');

// Associations

// Course <-> User (Instructor)
User.hasMany(Course, { foreignKey: 'instructorId', as: 'instructedCourses', onDelete: 'CASCADE' });
Course.belongsTo(User, { foreignKey: 'instructorId', as: 'instructor' });

// Enrollment Associations
User.hasMany(Enrollment, { foreignKey: 'studentId', as: 'enrollments', onDelete: 'CASCADE' });
Enrollment.belongsTo(User, { foreignKey: 'studentId', as: 'student' });

Course.hasMany(Enrollment, { foreignKey: 'courseId', as: 'enrollments', onDelete: 'CASCADE' });
Enrollment.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });

// Course <-> Lecture
Course.hasMany(Lecture, { foreignKey: 'courseId', as: 'lectures', onDelete: 'CASCADE' });
Lecture.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });

// Course <-> Test
Course.hasMany(Test, { foreignKey: 'courseId', as: 'tests', onDelete: 'CASCADE' });
Test.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });

// Test <-> Question
Test.hasMany(Question, { foreignKey: 'testId', as: 'questions', onDelete: 'CASCADE' });
Question.belongsTo(Test, { foreignKey: 'testId', as: 'test' });

// TestAttempt Associations
User.hasMany(TestAttempt, { foreignKey: 'studentId', as: 'attempts', onDelete: 'CASCADE' });
TestAttempt.belongsTo(User, { foreignKey: 'studentId', as: 'student' });

Test.hasMany(TestAttempt, { foreignKey: 'testId', as: 'attempts', onDelete: 'CASCADE' });
TestAttempt.belongsTo(Test, { foreignKey: 'testId', as: 'test' });

// ForumPost Associations
Course.hasMany(ForumPost, { foreignKey: 'courseId', as: 'forumPosts', onDelete: 'CASCADE' });
ForumPost.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });

User.hasMany(ForumPost, { foreignKey: 'userId', as: 'posts', onDelete: 'CASCADE' });
ForumPost.belongsTo(User, { foreignKey: 'user', as: 'author' });

// Announcement Associations
Course.hasMany(Announcement, { foreignKey: 'courseId', as: 'announcements', onDelete: 'CASCADE' });
Announcement.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });

module.exports = {
  sequelize,
  User,
  Course,
  Enrollment,
  Lecture,
  Test,
  Question,
  TestAttempt,
  ForumPost,
  Announcement,
  Setting,
};
