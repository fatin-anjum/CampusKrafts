const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ForumPost = sequelize.define('ForumPost', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: true, // Only for main threads
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  parentId: {
    type: DataTypes.INTEGER, // For nesting comments/replies
    allowNull: true,
    defaultValue: null,
  },
  recipientId: {
    type: DataTypes.INTEGER, // For direct messages (student <-> teacher)
    allowNull: true,
    defaultValue: null,
  }
});

module.exports = ForumPost;
