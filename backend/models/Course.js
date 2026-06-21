const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Course = sequelize.define('Course', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved'),
    defaultValue: 'pending',
  },
  departments: {
    type: DataTypes.STRING, // e.g. "CS, CSE, ECE, EEE"
    allowNull: false,
  },
  sections: {
    type: DataTypes.TEXT, // JSON String: e.g. ["A", "B", "C", "D"]
    defaultValue: '[]',
  },
  image: {
    type: DataTypes.STRING, // Image filename or placeholder URL
    allowNull: true,
  }
});

module.exports = Course;
