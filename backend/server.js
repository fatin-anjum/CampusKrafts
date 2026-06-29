const Exam = require('./models/Exam');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Class = require('./models/Class');
const Material = require('./models/Material'); 
const Announcement = require('./models/Announcement');

const app = express();
app.use(cors());
app.use(express.json());
const multer = require('multer');
const path = require('path');

// Serve the uploads folder so frontend can display submission images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure Multer Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Make sure to create an 'uploads' folder in your backend directory
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

const JWT_SECRET = 'your_super_secret_jwt_key';

// Database Connection
mongoose.connect('mongodb://localhost:27017/mern-classroom')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));
// Middleware to verify JWT and attach user data
// Middleware to check if user is an Admin
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ message: 'Access denied. Administrator privileges required.' });
  }
};
const authenticate = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Failed to authenticate token' });
    req.user = decoded;
    next();
  });
};

// 1. Auth Routes
app.post('/api/register', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email, password }); 
  if (!user) return res.status(400).json({ message: 'Invalid credentials' });

  const token = jwt.sign({ id: user._id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ token, role: user.role, name: user.name, id: user._id }); // Included id response fallback payload wrapper
});

// --- Exam / Assessment Routes ---

// 1. Post a new exam (Teacher only)
app.post('/api/exams', authenticate, async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Access denied' });
  
  const { title, description, formLink } = req.body;
  
  try {
    const newExam = new Exam({
      title,
      description,
      formLink,
      createdBy: req.user.id
    });
    await newExam.save();
    res.status(201).json(newExam);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 2. Get all exams
app.get('/api/exams', authenticate, async (req, res) => {
  try {
    const exams = await Exam.find().populate('createdBy', 'name').sort({ createdAt: -1 });
    res.json(exams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Submit handwritten script photo (Student only)
app.post('/api/exams/:id/submit', authenticate, upload.single('answerImage'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image file uploaded' });

    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    // Clean out previous submission history from this individual student to prevent collision entries
    exam.submissions = exam.submissions.filter(sub => sub.studentId.toString() !== req.user.id);

    // Save relative image path route reference
    exam.submissions.push({
      studentId: req.user.id,
      studentName: req.user.name,
      imagePath: `/uploads/${req.file.filename}`
    });

    await exam.save();
    res.json({ message: 'Answer script uploaded successfully!', exam });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Delete an exam (Teacher only)
app.delete('/api/exams/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Access denied' });
  try {
    const deletedExam = await Exam.findByIdAndDelete(req.params.id);
    if (!deletedExam) return res.status(404).json({ message: 'Exam not found' });
    res.json({ message: 'Exam deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Class Link Routes
app.post('/api/classes', authenticate, async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Access denied' });
  
  try {
    const newClass = new Class({
      title: req.body.title,
      link: req.body.link,
      createdBy: req.user.id
    });
    await newClass.save();
    res.status(201).json(newClass);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/classes', authenticate, async (req, res) => {
  try {
    const classes = await Class.find().populate('createdBy', 'name').sort({ createdAt: -1 });
    res.json(classes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Class Materials Routes
app.post('/api/materials', authenticate, async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Access denied' });
  
  try {
    const newMaterial = new Material({
      title: req.body.title,
      link: req.body.link,
      createdBy: req.user.id
    });
    await newMaterial.save();
    res.status(201).json(newMaterial);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/materials', authenticate, async (req, res) => {
  try {
    const materials = await Material.find().populate('createdBy', 'name').sort({ createdAt: -1 });
    res.json(materials);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Announcement / Notification Routes
app.post('/api/announcements', authenticate, async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Access denied' });
  try {
    const newAnnouncement = new Announcement({
      title: req.body.title,
      message: req.body.message,
      createdBy: req.user.id
    });
    await newAnnouncement.save();
    res.status(201).json(newAnnouncement);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/announcements', authenticate, async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/announcements/:id/read', authenticate, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id).populate('createdBy', 'name');
    if (!announcement) return res.status(404).json({ message: 'Announcement not found' });

    if (!announcement.readBy.includes(req.user.id)) {
      announcement.readBy.push(req.user.id);
      await announcement.save();
    }
    res.json(announcement);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Delete Routes (Teacher Only) ---

app.delete('/api/classes/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Access denied' });
  
  try {
    const deletedClass = await Class.findByIdAndDelete(req.params.id);
    if (!deletedClass) return res.status(404).json({ message: 'Class link not found' });
    res.json({ message: 'Class link deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/materials/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Access denied' });
  
  try {
    const deletedMaterial = await Material.findByIdAndDelete(req.params.id);
    if (!deletedMaterial) return res.status(404).json({ message: 'Material not found' });
    res.json({ message: 'Material deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/announcements/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Access denied' });
  try {
    const deletedAnn = await Announcement.findByIdAndDelete(req.params.id);
    if (!deletedAnn) return res.status(404).json({ message: 'Announcement not found' });
    res.json({ message: 'Announcement deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// --- ADMIN MANAGEMENT ROUTES ---

// 1. Get all registered users (Admin only)
app.get('/api/admin/users', authenticate, isAdmin, async (req, res) => {
  try {
    // Exclude passwords from the query for security
    const users = await User.find({}, '-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Update user role (Admin only)
app.put('/api/admin/users/:id/role', authenticate, isAdmin, async (req, res) => {
  const { role } = req.body;
  if (!['student', 'teacher', 'moderator', 'admin'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role assignment target.' });
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id, 
      { role }, 
      { new: true }
    ).select('-password');
    
    if (!updatedUser) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User role updated successfully', user: updatedUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Delete user account completely (Admin only)
app.delete('/api/admin/users/:id', authenticate, isAdmin, async (req, res) => {
  try {
    // Prevent admin from deleting their own account accidentally
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: "Self-destruction safety triggered. You cannot delete your own admin account." });
    }

    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User account purged successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.listen(5000, () => console.log('Server running on port 5000'));