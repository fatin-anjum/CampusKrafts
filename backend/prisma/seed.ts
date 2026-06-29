/**
 * Seed script — creates the baseline data CampusKrafts needs to run:
 *   • Admin, Teacher, Moderator, and a demo Student
 *   • The single flagship "Crash Course" (PUBLISHED) with modules & lessons
 *   • A small question bank + one ready-to-take MCQ exam
 *
 * Run with:  npm run seed   (after `prisma migrate dev`)
 * Idempotent: uses upserts keyed on unique fields, safe to re-run.
 */
import { PrismaClient, Role, CourseStatus, LessonType, ExamType, ExamMode, QuestionType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@campuskrafts.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';
  const coursePrice = Number(process.env.CRASH_COURSE_PRICE_BDT || 2500);

  // ── Users ────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const demoHash = await bcrypt.hash('Student@123', 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: Role.ADMIN, isVerified: true },
    create: { name: 'Platform Admin', email: adminEmail, passwordHash, role: Role.ADMIN, isVerified: true },
  });

  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@campuskrafts.com' },
    update: { role: Role.TEACHER, isVerified: true },
    create: { name: 'Rahim Sir', email: 'teacher@campuskrafts.com', passwordHash, role: Role.TEACHER, isVerified: true },
  });

  await prisma.user.upsert({
    where: { email: 'moderator@campuskrafts.com' },
    update: { role: Role.MODERATOR, isVerified: true },
    create: { name: 'Community Mod', email: 'moderator@campuskrafts.com', passwordHash, role: Role.MODERATOR, isVerified: true },
  });

  await prisma.user.upsert({
    where: { email: 'student@campuskrafts.com' },
    update: {},
    create: { name: 'Demo Student', email: 'student@campuskrafts.com', passwordHash: demoHash, role: Role.STUDENT, isVerified: true },
  });

  // ── The single flagship Crash Course ──────────────────────────────────────
  const course = await prisma.course.upsert({
    where: { slug: 'admission-crash-course' },
    update: { status: CourseStatus.PUBLISHED, priceBdt: coursePrice },
    create: {
      title: 'University Admission Crash Course 2026',
      slug: 'admission-crash-course',
      description:
        'The complete crash course for Bangladeshi university admission: live classes, recorded lectures, lecture sheets, weekly & grand mock tests, and adaptive practice.',
      priceBdt: coursePrice,
      status: CourseStatus.PUBLISHED,
      createdById: admin.id,
    },
  });

  // Modules + lessons (only create if course has none yet)
  const existingModules = await prisma.courseModule.count({ where: { courseId: course.id } });
  if (existingModules === 0) {
    const physics = await prisma.courseModule.create({
      data: { courseId: course.id, title: 'Physics — Foundations', order: 1 },
    });
    const chemistry = await prisma.courseModule.create({
      data: { courseId: course.id, title: 'Chemistry — Core', order: 2 },
    });
    await prisma.lesson.createMany({
      data: [
        { moduleId: physics.id, title: 'Vectors (Live Class)', type: LessonType.LIVE, order: 1 },
        { moduleId: physics.id, title: 'Newtonian Mechanics (Recorded)', type: LessonType.RECORDED, order: 2, durationSec: 2700, isFreePreview: true },
        { moduleId: physics.id, title: 'Mechanics Formula Sheet', type: LessonType.SHEET, order: 3 },
        { moduleId: chemistry.id, title: 'Periodic Table (Recorded)', type: LessonType.RECORDED, order: 1, durationSec: 2400 },
        { moduleId: chemistry.id, title: 'Organic Basics (Recorded)', type: LessonType.RECORDED, order: 2, durationSec: 3000 },
      ],
    });
  }

  // ── Question bank + one MCQ exam ──────────────────────────────────────────
  const existingQuestions = await prisma.question.count();
  if (existingQuestions === 0) {
    const seedQuestions = [
      {
        subject: 'Physics', topic: 'Vectors', difficulty: 2,
        stem: 'The resultant of two equal vectors of magnitude F acting at 90° is:',
        options: [
          { label: 'A', text: 'F', isCorrect: false },
          { label: 'B', text: '√2·F', isCorrect: true },
          { label: 'C', text: '2F', isCorrect: false },
          { label: 'D', text: 'F/√2', isCorrect: false },
        ],
        explanation: 'Resultant = √(F²+F²) = √2·F.',
      },
      {
        subject: 'Chemistry', topic: 'Periodic Table', difficulty: 2,
        stem: 'Which element has the highest electronegativity?',
        options: [
          { label: 'A', text: 'Oxygen', isCorrect: false },
          { label: 'B', text: 'Fluorine', isCorrect: true },
          { label: 'C', text: 'Chlorine', isCorrect: false },
          { label: 'D', text: 'Nitrogen', isCorrect: false },
        ],
        explanation: 'Fluorine is the most electronegative element (3.98 Pauling).',
      },
      {
        subject: 'Physics', topic: 'Mechanics', difficulty: 3,
        stem: 'A body in uniform circular motion has constant:',
        options: [
          { label: 'A', text: 'Velocity', isCorrect: false },
          { label: 'B', text: 'Acceleration', isCorrect: false },
          { label: 'C', text: 'Speed', isCorrect: true },
          { label: 'D', text: 'Momentum', isCorrect: false },
        ],
        explanation: 'Direction changes continuously, so only speed (magnitude) is constant.',
      },
    ];

    const exam = await prisma.exam.create({
      data: {
        courseId: course.id,
        createdById: teacher.id,
        title: 'Diagnostic MCQ Test',
        type: ExamType.MCQ,
        mode: ExamMode.GRADED,
        durationSec: 1800,
        negativeMarkRatio: 0.25,
        shuffleQuestions: true,
        shuffleOptions: true,
        totalMarks: seedQuestions.length,
      },
    });

    let order = 1;
    for (const q of seedQuestions) {
      const question = await prisma.question.create({
        data: {
          subject: q.subject,
          topic: q.topic,
          difficulty: q.difficulty,
          stem: q.stem,
          type: QuestionType.MCQ,
          explanation: q.explanation,
          createdById: teacher.id,
          options: { create: q.options },
        },
      });
      await prisma.examQuestion.create({
        data: { examId: exam.id, questionId: question.id, marks: 1, order: order++ },
      });
    }
  }

  console.log('✅ Seed complete.');
  console.log(`   Admin     : ${adminEmail} / ${adminPassword}`);
  console.log('   Teacher   : teacher@campuskrafts.com / ' + adminPassword);
  console.log('   Moderator : moderator@campuskrafts.com / ' + adminPassword);
  console.log('   Student   : student@campuskrafts.com / Student@123');
  console.log(`   Course    : "${course.title}" (BDT ${coursePrice})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
