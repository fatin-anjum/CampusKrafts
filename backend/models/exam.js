const mongoose = require('mongoose');

const ExamSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  formLink: { type: String }, // Optional Google Form
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  
  // New: Array to store student image submissions
  submissions: [{
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    studentName: { type: String },
    imagePath: { type: String }, // Path to the uploaded JPG file
    submittedAt: { type: Date, default: Date.now }
  }]
});

module.exports = mongoose.model('Exam', ExamSchema);