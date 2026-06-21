const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const TestAttempt = sequelize.define('TestAttempt', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  score: {
    type: DataTypes.DECIMAL(5, 2), // e.g. percentage or raw score
    allowNull: false,
  },
  answers: {
    type: DataTypes.TEXT, // JSON string mapping: { "questionId": "A", ... }
    allowNull: false,
  },
  timeTaken: {
    type: DataTypes.INTEGER, // in seconds
    allowNull: false,
  }
});

module.exports = TestAttempt;
