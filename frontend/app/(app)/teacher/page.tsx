'use client';

import Link from 'next/link';
import { Radio, BookOpen, FolderOpen, ClipboardList, Trophy, FileText, Users, ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { useApi } from '@/lib/use-api';
import { useAuth } from '@/lib/auth';
import type { Assignment, LiveClassRow } from '@/lib/types';

interface ExamRow { id: string }
interface MockRow { id: string }

const tools = [
  { href: '/teacher/classes', icon: Radio, title: 'Manage Classes', desc: 'Schedule live classes and end sessions with recordings.' },
  { href: '/teacher/courses', icon: BookOpen, title: 'Course Builder', desc: 'Create courses, add modules, upload video lessons.' },
  { href: '/teacher/content', icon: FolderOpen, title: 'Upload Content', desc: 'Publish notes, books, and formula sheets to the library.' },
  { href: '/teacher/exams', icon: ClipboardList, title: 'Exams & Question Bank', desc: 'Build questions, assemble exams, and attach marks.' },
  { href: '/teacher/mocks', icon: Trophy, title: 'Mock Tests', desc: 'Publish mocks from your exams and track leaderboards.' },
  { href: '/teacher/assignments', icon: FileText, title: 'Assignments', desc: 'Set assignments, collect submissions, and grade.' },
  { href: '/teacher/students', icon: Users, title: 'Monitor Students', desc: 'Track submissions, grades, and engagement.' },
];

export default function TeacherPage() {
  const { user } = useAuth();
  const { data: classes } = useApi<LiveClassRow[]>('/live-classes');
  const { data: exams } = useApi<ExamRow[]>('/exams');
  const { data: mocks } = useApi<MockRow[]>('/mocks');
  const { data: assignments } = useApi<Assignment[]>('/assignments');

  const stats = [
    { icon: Radio, label: 'Live classes', value: classes?.length ?? 0, tint: 'text-primary bg-primary/10' },
    { icon: ClipboardList, label: 'Exams', value: exams?.length ?? 0, tint: 'text-accent bg-accent/10' },
    { icon: Trophy, label: 'Mock tests', value: mocks?.length ?? 0, tint: 'text-success bg-success/10' },
    { icon: FileText, label: 'Assignments', value: assignments?.length ?? 0, tint: 'text-primary bg-primary/10' },
  ];

  return (
    <div>
      <PageHeader title="Teacher Dashboard" subtitle={`Welcome, ${user?.name}. Manage your classes and content.`} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${s.tint}`}><s.icon className="h-5 w-5" /></span>
              <div>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((t) => (
          <Link key={t.href} href={t.href}>
            <Card className="group h-full transition-all hover:-translate-y-1 hover:shadow-md">
              <CardContent className="p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <t.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 flex items-center gap-1 font-semibold">{t.title} <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" /></h3>
                <p className="mt-2 text-sm text-muted-foreground">{t.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
