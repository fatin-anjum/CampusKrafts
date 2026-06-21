const { User, Course, Enrollment, Setting, sequelize } = require('../models');

// Fetch dashboard statistics
exports.getStats = async (req, res) => {
  try {
    const studentCount = await User.count({ where: { role: 'student' } });
    const instructorCount = await User.count({ where: { role: 'instructor' } });
    const courseCount = await Course.count();
    const activeEnrollments = await Enrollment.count({ where: { status: 'active' } });
    
    // Calculate total revenue from active enrollments
    const revenueResult = await Enrollment.sum('paidAmount', { where: { status: 'active' } });
    const totalRevenue = revenueResult || 0;

    // Fetch batch breakdown
    const onlineCount = await Enrollment.count({ where: { batch: 'online', status: 'active' } });
    const liveCount = await Enrollment.count({ where: { batch: 'live', status: 'active' } });

    res.status(200).json({
      metrics: {
        studentCount,
        instructorCount,
        courseCount,
        activeEnrollments,
        totalRevenue
      },
      batches: {
        online: onlineCount,
        live: liveCount
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to compile system metrics', error: error.message });
  }
};

// List all users
exports.getUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'role', 'isVerified', 'createdAt']
    });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve users', error: error.message });
  }
};

// Update user details (Role or verification state)
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, isVerified } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (role) user.role = role;
    if (isVerified !== undefined) user.isVerified = isVerified;

    await user.save();

    res.status(200).json({ message: 'User updated successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update user', error: error.message });
  }
};

// Delete user account
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Cannot delete admin accounts' });
    }

    await user.destroy();
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete user', error: error.message });
  }
};

// Approve Course
exports.approveCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findByPk(id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    course.status = 'approved';
    await course.save();

    res.status(200).json({ message: 'Course approved successfully', course });
  } catch (error) {
    res.status(500).json({ message: 'Failed to approve course', error: error.message });
  }
};

// Get settings
exports.getSettings = async (req, res) => {
  try {
    const settings = await Setting.findAll();
    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve settings', error: error.message });
  }
};

// Update site setting
exports.updateSetting = async (req, res) => {
  try {
    const { key, value } = req.body;

    if (!key || value === undefined) {
      return res.status(400).json({ message: 'Key and value are required' });
    }

    const [setting, created] = await Setting.findOrCreate({
      where: { key },
      defaults: { value }
    });

    if (!created) {
      setting.value = value;
      await setting.save();
    }

    res.status(200).json({ message: 'Setting updated successfully', setting });
  } catch (error) {
    res.status(500).json({ message: 'Failed to save site setting', error: error.message });
  }
};
