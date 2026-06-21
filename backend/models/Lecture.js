const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Lecture = sequelize.define('Lecture', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  videoUrl: {
    type: DataTypes.STRING, // Recorded lecture or Live URL
    allowNull: true,
  },
  materialsUrl: {
    type: DataTypes.STRING, // Path or link to slides, PDFs, notes
    allowNull: true,
  },
  scheduleTime: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  duration: {
    type: DataTypes.INTEGER, // in minutes
    defaultValue: 60,
  },
  isLive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  attendance: {
    type: DataTypes.TEXT, // JSON array of User IDs: e.g. [1, 5, 12]
    defaultValue: '[]',
  }
});

module.exports = Lecture;
