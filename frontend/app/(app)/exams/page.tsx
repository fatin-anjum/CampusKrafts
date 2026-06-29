'use client';

import Link from 'next/link';
import { ClipboardList, Clock, Hash, ArrowRight } from 'lucide-react';
import { PageHeader, EmptyState } from '@/components/app/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi } from '@/lib/use-api';

interface ExamRow {
  id: string; title: string; type: string; mode: string; durationSec: number; totalMarks: number;
}

export default function ExamsPage() {
  const { data, loading } = useApi<ExamRow[]>('/exams');

  return (
    <div>
      <PageHeader title="Exams" subtitle="Practice and graded exams. Your timer starts when you begin." />
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44" />)}
        </div>
      ) : data && data.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((e) => (
            <Card key={e.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col p-5">
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><ClipboardList className="h-5 w-5" /></span>
                  <Badge variant={e.mode === 'MOCK' ? 'accent' : e.mode === 'GRADED' ? 'default' : 'muted'}>{e.mode}</Badge>
                </div>
                <h3 className="mt-4 font-semibold">{e.title}</h3>
                <div className="mt-3 flex flex-1 items-end gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {Math.round(e.durationSec / 60)} min</span>
                  <span className="flex items-center gap-1"><Hash className="h-3.5 w-3.5" /> {e.totalMarks} marks</span>
                  <span>{e.type}</span>
                </div>
                <Link href={`/exam/${e.id}`} className="mt-4">
                  <Button className="w-full">Start exam <ArrowRight className="h-4 w-4" /></Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={ClipboardList} title="No exams yet" desc="Exams created by your teachers will appear here." />
      )}
    </div>
  );
}
