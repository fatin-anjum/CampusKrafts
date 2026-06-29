export type Role = 'STUDENT' | 'TEACHER' | 'MODERATOR' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: Role;
  isVerified?: boolean;
  avatarUrl?: string;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  description?: string;
  priceBdt: number;
  status: string;
  thumbnailUrl?: string;
}

export interface Lesson {
  id: string;
  title: string;
  type: 'LIVE' | 'RECORDED' | 'SHEET';
  order: number;
  videoUrl?: string | null;
  durationSec?: number;
  isFreePreview: boolean;
}

export interface CourseModule {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

export interface CourseDetail extends Course {
  modules: CourseModule[];
  enrolled: boolean;
}

export interface DashboardData {
  enrolledCourse: { id: string; title: string; slug: string } | null;
  subscriptionStatus: string;
  progress: { totalLessons: number; completed: number; percent: number };
  upcomingClasses: { id: string; title: string; startAt: string; provider: string }[];
  upcomingMocks: { id: string; scheduledAt: string; exam: { title: string } }[];
  recentNotifications: { id: string; title: string; body?: string; createdAt: string; readAt?: string }[];
}

export interface ExamMeta {
  id: string;
  title: string;
  type: string;
  mode: string;
  durationSec: number;
  totalMarks: number;
  questionCount: number;
  secureMode: boolean;
}

export interface Assignment {
  id: string;
  courseId: string;
  title: string;
  instructions?: string;
  attachmentS3Key?: string;
  dueAt?: string | null;
  maxMarks: number;
  autoGrade: boolean;
  createdAt: string;
}

export type SubmissionStatus = 'SUBMITTED' | 'GRADED' | 'RETURNED';

export interface Submission {
  id: string;
  assignmentId: string;
  userId: string;
  fileS3Key?: string | null;
  text?: string | null;
  marks?: number | null;
  feedback?: string | null;
  status: SubmissionStatus;
  submittedAt: string;
  user?: { name: string; email?: string };
}

export interface AdminUser {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: Role;
  isVerified?: boolean;
  isBanned?: boolean;
  avatarUrl?: string;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages?: number;
}

export interface AdminCourse extends Course {
  createdBy?: { name: string };
  _count?: { modules: number; subscriptions: number };
}

export interface Payment {
  id: string;
  userId: string;
  courseId: string;
  gateway: string;
  amountBdt: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  gatewayRef?: string | null;
  createdAt: string;
}

export interface PendingResource {
  id: string;
  title: string;
  description?: string;
  type: string;
  tags: string[];
  status: string;
  createdAt: string;
  uploader?: { name: string };
  category?: { name: string } | null;
}

export type TicketStatus = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface Ticket {
  id: string;
  requesterId: string;
  category: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  assigneeId?: string | null;
  assignee?: { name: string } | null;
  createdAt: string;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  body: string;
  createdAt: string;
  sender?: { name: string; role: Role };
}

export interface TicketDetail extends Ticket {
  messages: TicketMessage[];
}

export interface Question {
  id: string;
  subject: string;
  topic: string;
  difficulty: number;
  stem: string;
  type: 'MCQ' | 'WRITTEN';
  explanation?: string;
  options: { id: string; label: string; text: string; isCorrect: boolean }[];
}

export interface LiveClassRow {
  id: string;
  courseId: string;
  title: string;
  provider: string;
  status: string;
  startAt: string;
  endAt: string;
  joinUrl?: string | null;
  teacher?: { name: string };
}

export interface AttemptState {
  attemptId: string;
  status: string;
  remainingSec: number;
  secureMode: boolean;
  questions: {
    examQuestionId: string;
    questionId: string;
    marks: number;
    type: string;
    stem: string;
    subject: string;
    options: { id: string; label: string; text: string }[];
  }[];
  savedAnswers: Record<string, { selectedOptionId?: string; answerText?: string }>;
}
