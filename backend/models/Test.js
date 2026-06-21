const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Test = sequelize.define('Test', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  topic: {
    type: DataTypes.STRING, // e.g. "English language", "Mathematics", "Drawing", etc.
    allowNull: false,
  },
  timeLimit: {
    type: DataTypes.INTEGER, // limit in minutes
    defaultValue: 30,
  },
  isFree: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  }
});

module.exports = Test;
