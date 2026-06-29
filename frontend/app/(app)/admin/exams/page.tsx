'use client';

import Link from 'next/link';
import { ClipboardList, Database, Trophy, Clock, Hash, BarChart3, Calendar } from 'lucide-react';
import { PageHeader, EmptyState } from '@/components/app/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi } from '@/lib/use-api';
import { fromNow } from '@/lib/utils';
import type { Question } from '@/lib/types';

interface ExamRow { id: string; title: string; type: string; mode: string; durationSec: number; totalMarks: number; }
interface MockRow { id: string; scope: string; scheduledAt: string; exam: { title: string }; }

export default function AdminExamsPage() {
  const { data: exams, loading: le } = useApi<ExamRow[]>('/exams');
  const { data: mocks, loading: lm } = useApi<MockRow[]>('/mocks');
  const { data: questions } = useApi<Question[]>('/questions');

  return (
    <div>
      <PageHeader title="Exam Management" subtitle="Question bank, scheduled exams, and mock results." />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat icon={Database} label="Question bank" value={questions?.length ?? 0} tint="text-primary bg-primary/10" />
        <Stat icon={ClipboardList} label="Exams" value={exams?.length ?? 0} tint="text-accent bg-accent/10" />
        <Stat icon={Trophy} label="Mock tests" value={mocks?.length ?? 0} tint="text-success bg-success/10" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Exams</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {le ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14" />) :
              exams && exams.length > 0 ? exams.map((e) => (
                <div key={e.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div>
                    <p className="font-medium">{e.title}</p>
                    <p className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {Math.round(e.durationSec / 60)}m</span>
                      <span className="flex items-center gap-1"><Hash className="h-3 w-3" /> {e.totalMarks}</span>
                    </p>
                  </div>
                  <Badge variant={e.mode === 'MOCK' ? 'accent' : e.mode === 'GRADED' ? 'default' : 'muted'}>{e.mode}</Badge>
                </div>
              )) : <EmptyState icon={ClipboardList} title="No exams" />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Mock results</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {lm ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14" />) :
              mocks && mocks.length > 0 ? mocks.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div>
                    <p className="font-medium">{m.exam.title}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground"><Calendar className="h-3 w-3" /> {fromNow(m.scheduledAt)}</p>
                  </div>
                  <Link href={`/mocks/${m.id}`}><Button variant="ghost" size="sm"><BarChart3 className="h-4 w-4" /> Leaderboard</Button></Link>
                </div>
              )) : <EmptyState icon={Trophy} title="No mocks" />}
          </CardContent>
        </Card>
      </div>
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
