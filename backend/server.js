const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const sequelize = require('./config/db');
const {
  User,
  Course,
  Test,
  Question,
  Setting
} = require('./models');

// Import routes
const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const testRoutes = require('./routes/testRoutes');
const forumRoutes = require('./routes/forumRoutes');
const adminRoutes = require('./routes/adminRoutes');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/admin', adminRoutes);

// Fallback to index.html for SPA router on client side if needed
app.get('*', (req, res, next) => {
  // If requesting api, let it pass (it will 404 naturally if unregistered)
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Database Sync and Seeding
const seedDatabase = async () => {
  try {
    // Check if database already has users
    const userCount = await User.count();
    if (userCount > 0) {
      console.log('Database already initialized. Skipping seeding.');
      return;
    }

    console.log('Database empty. Seeding initial data...');

    // 1. Seed Users (Admin, Instructor, Student)
    const salt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash('AdminPass123', salt);
    const instructorPassword = await bcrypt.hash('InstructorPass123', salt);
    const studentPassword = await bcrypt.hash('StudentPass123', salt);

    const adminUser = await User.create({
      name: 'Platform Administrator',
      email: 'admin@campuskrafts.com',
      password: adminPassword,
      role: 'admin',
      isVerified: true
    });

    const instructorUser = await User.create({
      name: 'Professor BRACU Prep',
      email: 'instructor@campuskrafts.com',
      password: instructorPassword,
      role: 'instructor',
      isVerified: true
    });

    const studentUser = await User.create({
      name: 'John Doe',
      email: 'student@campuskrafts.com',
      password: studentPassword,
      role: 'student',
      isVerified: true
    });

    console.log('Users seeded successfully.');

    // 2. Seed Default Courses
    const coursesData = [
      {
        title: 'Anthropology, English, and LLB Course',
        description: 'Comprehensive preparation for social sciences and law departments. Focuses heavily on English Language (Section A) and English Composition (Section B). Includes previous years questions, interactive lectures, and worksheets.',
        price: 2500.00,
        departments: 'Anthropology, English, LLB',
        sections: JSON.stringify(['A', 'B']),
        status: 'approved',
        instructorId: instructorUser.id,
        image: 'https://images.unsplash.com/photo-1505664194779-8bebcb95c557?q=80&w=400&auto=format&fit=crop'
      },
      {
        title: 'BBA & Economics Admission Prep',
        description: 'Master business concepts and quantitative metrics. Covering English Language (Section A), English Composition (Section B), and General Mathematics (Section C). Practice mock tests and analytical questions.',
        price: 3000.00,
        departments: 'BBA, Economics',
        sections: JSON.stringify(['A', 'B', 'C']),
        status: 'approved',
        instructorId: instructorUser.id,
        image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=400&auto=format&fit=crop'
      },
      {
        title: 'STEM Admission Program (CSE, EEE, Physics)',
        description: 'Complete syllabus for Science and Technology disciplines. Covering English (Section A/B), Core Math (Section C), and Higher Mathematics and Physics (Section D). Recommended for CS, CSE, ECE, EEE, APE, Math, and Physics applicants.',
        price: 4500.00,
        departments: 'CS, CSE, ECE, EEE, APE, Mathematics, Physics',
        sections: JSON.stringify(['A', 'B', 'C', 'D']),
        status: 'approved',
        instructorId: instructorUser.id,
        image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=400&auto=format&fit=crop'
      },
      {
        title: 'Pharmacy & Bioscience Prep Program',
        description: 'Targeted preparation for Pharmacy, Microbiology, and Biotechnology. In addition to general sections, this course provides intensive guidance on Biology and Chemistry (Section E) topic-wise question analysis.',
        price: 4000.00,
        departments: 'Pharmacy, Biotechnology, Microbiology',
        sections: JSON.stringify(['A', 'B', 'C', 'E']),
        status: 'approved',
        instructorId: instructorUser.id,
        image: 'https://images.unsplash.com/photo-1532187643603-ba119ca4109e?q=80&w=400&auto=format&fit=crop'
      },
      {
        title: 'Architecture & Drawing Admission Course',
        description: 'Specialized course for prospective Architecture students. Includes sections A, B, C, and a specialized modules for Drawing (Section F) including perspective sketches, basic design principles, and previous test analysis.',
        price: 3500.00,
        departments: 'Architecture',
        sections: JSON.stringify(['A', 'B', 'C', 'F']),
        status: 'approved',
        instructorId: instructorUser.id,
        image: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=400&auto=format&fit=crop'
      }
    ];

    for (const c of coursesData) {
      await Course.create(c);
    }
    console.log('Courses seeded successfully.');

    // 3. Seed Free Tests (English, Mathematics, Higher Math & Physics, Biology & Chemistry)
    const englishTest = await Test.create({
      title: 'Free English Language Mock Assessment',
      topic: 'English language',
      timeLimit: 15,
      isFree: true
    });

    const mathTest = await Test.create({
      title: 'Free General Mathematics Mock Assessment',
      topic: 'Mathematics',
      timeLimit: 20,
      isFree: true
    });

    const higherMathPhysTest = await Test.create({
      title: 'Free Higher Mathematics & Physics Assessment',
      topic: 'Higher mathematics and physics',
      timeLimit: 20,
      isFree: true
    });

    const bioChemTest = await Test.create({
      title: 'Free Biology & Chemistry Mock Assessment',
      topic: 'Biology and chemistry',
      timeLimit: 15,
      isFree: true
    });

    console.log('Tests seeded successfully.');

    // 4. Seed Questions for Free Tests
    const questionsData = [
      // English Questions
      {
        testId: englishTest.id,
        questionText: 'Select the correct synonym for the word "ABUNDANT".',
        optionA: 'Scarce',
        optionB: 'Plentiful',
        optionC: 'Sparse',
        optionD: 'Lacking',
        correctAnswer: 'B',
        explanation: '"Abundant" means existing or available in large quantities; overflowing. Therefore, "Plentiful" is the correct synonym.',
        section: 'English language'
      },
      {
        testId: englishTest.id,
        questionText: 'Fill in the blank: Neither the teacher nor the students ______ present in the meeting yesterday.',
        optionA: 'was',
        optionB: 'were',
        optionC: 'are',
        optionD: 'is',
        correctAnswer: 'B',
        explanation: 'According to subject-verb agreement rules, when using "neither/nor", the verb agrees with the subject closest to it ("the students", which is plural, so we use "were" for the past tense).',
        section: 'English language'
      },
      // Mathematics Questions
      {
        testId: mathTest.id,
        questionText: 'If 3x + 7 = 22, what is the value of 2x - 3?',
        optionA: '7',
        optionB: '9',
        optionC: '5',
        optionD: '11',
        correctAnswer: 'A',
        explanation: 'First, solve 3x + 7 = 22: subtract 7 to get 3x = 15, meaning x = 5. Plug x = 5 into 2x - 3: 2(5) - 3 = 10 - 3 = 7.',
        section: 'Mathematics'
      },
      {
        testId: mathTest.id,
        questionText: 'What is the sum of the interior angles of a regular hexagon?',
        optionA: '360 degrees',
        optionB: '540 degrees',
        optionC: '720 degrees',
        optionD: '900 degrees',
        correctAnswer: 'C',
        explanation: 'The formula for the sum of interior angles is (n - 2) * 180. For a hexagon, n = 6. Thus, (6 - 2) * 180 = 4 * 180 = 720 degrees.',
        section: 'Mathematics'
      },
      // Higher Mathematics and Physics Questions
      {
        testId: higherMathPhysTest.id,
        questionText: 'What is the derivative of f(x) = x^2 * sin(x) with respect to x?',
        optionA: '2x * cos(x)',
        optionB: '2x * sin(x) + x^2 * cos(x)',
        optionC: '2x * sin(x) - x^2 * cos(x)',
        optionD: 'x^2 * cos(x)',
        correctAnswer: 'B',
        explanation: 'Apply the product rule: d/dx[u*v] = u\'*v + u*v\'. Here, u = x^2 (derivative is 2x) and v = sin(x) (derivative is cos(x)). Resulting in 2x * sin(x) + x^2 * cos(x).',
        section: 'Higher mathematics and physics'
      },
      {
        testId: higherMathPhysTest.id,
        questionText: 'An object travels at a constant velocity of 15 m/s. What is its acceleration?',
        optionA: '9.8 m/s^2',
        optionB: '15 m/s^2',
        optionC: '0 m/s^2',
        optionD: '1.5 m/s^2',
        correctAnswer: 'C',
        explanation: 'Acceleration is defined as the rate of change of velocity. If velocity is constant, there is no change, meaning acceleration is 0.',
        section: 'Higher mathematics and physics'
      },
      // Biology and Chemistry Questions
      {
        testId: bioChemTest.id,
        questionText: 'Which organelle is known as the powerhouse of the cell?',
        optionA: 'Nucleus',
        optionB: 'Ribosome',
        optionC: 'Mitochondrion',
        optionD: 'Golgi apparatus',
        correctAnswer: 'C',
        explanation: 'Mitochondria are known as powerhouses because they generate most of the cell\'s supply of adenosine triphosphate (ATP), used as a source of chemical energy.',
        section: 'Biology and chemistry'
      },
      {
        testId: bioChemTest.id,
        questionText: 'What is the chemical formula of Table Salt?',
        optionA: 'HCl',
        optionB: 'NaOH',
        optionC: 'NaCl',
        optionD: 'NaHCO3',
        correctAnswer: 'C',
        explanation: 'Table salt is chemically known as Sodium Chloride, which has the formula NaCl.',
        section: 'Biology and chemistry'
      }
    ];

    for (const q of questionsData) {
      await Question.create(q);
    }
    console.log('Free test questions seeded successfully.');

    // 5. Seed Homepage Settings
    const settingsData = [
      {
        key: 'homepage_banner_title',
        value: 'Shape Your Future at BRAC University'
      },
      {
        key: 'homepage_banner_subtitle',
        value: 'CampusKrafts is the premier admission prep portal designed exclusively for BRACU applicants. Access free mock tests, interactive online/live coaching batches, and study resource banks curated by specialists.'
      },
      {
        key: 'admission_updates',
        value: JSON.stringify([
          { date: 'June 25, 2026', title: 'Summer 2026 Admission Circular Published', link: '#' },
          { date: 'July 10, 2026', title: 'CampusKrafts Live Bootcamp Registration Deadline', link: '#' },
          { date: 'August 01, 2026', title: 'Official BRACU Mock Exam Schedule Released', link: '#' }
        ])
      },
      {
        key: 'homepage_faqs',
        value: JSON.stringify([
          { q: 'How many sections are there in the BRACU admission test?', a: 'There are total 6 sections (a to f): English language, English composition, Mathematics, Higher mathematics & physics, Biology & chemistry, and Drawing. Different courses require different sections.' },
          { q: 'Can I choose my batch type for the preparation course?', a: 'Yes! CampusKrafts offers both Online (Recorded self-paced) and Live (Interactive classes with direct consultations) batches during course enrollment.' },
          { q: 'How is payment verified?', a: 'You can buy any premium course using bKash. Just copy the platform Bkash merchant number, pay from your mobile app, and input the transaction ID (TrxID) in the prompt to activate your enrollment instantly.' },
          { q: 'Are there any free resources?', a: 'Yes! Everyone who registers gets immediate access to 4 free assessments covering English language, General Mathematics, STEM Math/Physics, and Bio-Chemistry.' }
        ])
      }
    ];

    for (const s of settingsData) {
      await Setting.create(s);
    }
    console.log('Homepage settings seeded successfully.');

  } catch (err) {
    console.error('Error seeding database:', err);
  }
};

// Database Connection and Server Startup
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connected to database successfully.');

    // Sync database models
    await sequelize.sync({ force: false });
    console.log('Database synced.');

    // Seed database with sample data if empty
    await seedDatabase();

    app.listen(PORT, () => {
      console.log(`\n======================================================`);
      console.log(`   CampusKrafts Server listening on port ${PORT}`);
      console.log(`   Local URL: http://localhost:${PORT}`);
      console.log(`======================================================\n`);
    });
  } catch (error) {
    console.error('Unable to connect to database or start server:', error);
  }
};

startServer();
