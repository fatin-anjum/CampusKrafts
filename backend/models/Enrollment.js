const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Enrollment = sequelize.define('Enrollment', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  batch: {
    type: DataTypes.ENUM('online', 'live'),
    defaultValue: 'online',
  },
  status: {
    type: DataTypes.ENUM('pending_payment', 'active'),
    defaultValue: 'pending_payment',
  },
  bkashTrxId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  paidAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
  }
});

module.exports = Enrollment;
