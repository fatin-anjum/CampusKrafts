'use client';

import { useEffect, useState } from 'react';
import { Users, FileText, CheckCircle2, Clock } from 'lucide-react';
import { PageHeader, EmptyState } from '@/components/app/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { apiGet } from '@/lib/api';
import type { Assignment, Submission } from '@/lib/types';

interface StudentRow {
  userId: string;
  name: string;
  submitted: number;
  graded: number;
  avgMarks: number | null;
}

export default function TeacherStudentsPage() {
  const [rows, setRows] = useState<StudentRow[] | null>(null);
  const [totals, setTotals] = useState({ assignments: 0, submissions: 0, graded: 0 });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const assignments = await apiGet<Assignment[]>('/assignments');
        const slice = assignments.slice(0, 25); // bound the fan-out
        const lists = await Promise.all(
          slice.map((a) => apiGet<Submission[]>(`/assignments/${a.id}/submissions`).catch(() => [] as Submission[])),
        );
        if (cancelled) return;

        const byStudent = new Map<string, { name: string; submitted: number; graded: number; marksSum: number; gradedWithMarks: number }>();
        let submissions = 0, graded = 0;
        for (const list of lists) {
          for (const s of list) {
            submissions++;
            const cur = byStudent.get(s.userId) ?? { name: s.user?.name ?? 'Student', submitted: 0, graded: 0, marksSum: 0, gradedWithMarks: 0 };
            cur.submitted++;
            if (s.status === 'GRADED') {
              cur.graded++; graded++;
              if (typeof s.marks === 'number') { cur.marksSum += s.marks; cur.gradedWithMarks++; }
            }
            byStudent.set(s.userId, cur);
          }
        }
        const result: StudentRow[] = [...byStudent.entries()]
          .map(([userId, v]) => ({ userId, name: v.name, submitted: v.submitted, graded: v.graded, avgMarks: v.gradedWithMarks ? Math.round(v.marksSum / v.gradedWithMarks) : null }))
          .sort((a, b) => b.submitted - a.submitted);

        setTotals({ assignments: assignments.length, submissions, graded });
        setRows(result);
      } catch {
        if (!cancelled) setRows([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const loading = rows === null;

  return (
    <div>
      <PageHeader title="Monitor Students" subtitle="Submission activity and grading progress across your assignments." />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat icon={FileText} label="Assignments" value={totals.assignments} tint="text-primary bg-primary/10" />
        <Stat icon={Clock} label="Submissions" value={totals.submissions} tint="text-accent bg-accent/10" />
        <Stat icon={CheckCircle2} label="Graded" value={totals.graded} tint="text-success bg-success/10" />
      </div>

      {loading ? (
        <Skeleton className="h-64" />
      ) : rows && rows.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 border-b px-5 py-3 text-xs font-medium text-muted-foreground">
              <span>Student</span><span className="text-right">Submitted</span><span className="text-right">Graded</span><span className="text-right">Avg marks</span>
            </div>
            {rows.map((r) => (
              <div key={r.userId} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 border-b px-5 py-3 text-sm last:border-0">
                <div className="flex items-center gap-3">
                  <Avatar name={r.name} />
                  <span className="font-medium">{r.name}</span>
                </div>
                <span className="text-right">{r.submitted}</span>
                <span className="text-right">
                  {r.graded === r.submitted ? <Badge variant="success">{r.graded}</Badge> : <Badge variant="muted">{r.graded}/{r.submitted}</Badge>}
                </span>
                <span className="text-right font-semibold">{r.avgMarks ?? '—'}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <EmptyState icon={Users} title="No student activity yet" desc="Once students submit assignments, their activity shows here." />
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, tint }: { icon: React.ElementType; label: string; value: number; tint: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tint}`}><Icon className="h-5 w-5" /></span>
        <div><div className="text-2xl font-bold">{value}</div><div className="text-xs text-muted-foreground">{label}</div></div>
      </CardContent>
    </Card>
  );
}
