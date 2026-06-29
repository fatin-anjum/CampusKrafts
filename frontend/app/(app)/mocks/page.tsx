'use client';

import Link from 'next/link';
import { Trophy, Calendar, Clock, ArrowRight } from 'lucide-react';
import { PageHeader, EmptyState } from '@/components/app/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi } from '@/lib/use-api';
import { fromNow } from '@/lib/utils';

interface MockRow {
  id: string; scope: string; university?: string; scheduledAt: string; closeAt: string;
  exam: { title: string; totalMarks: number; durationSec: number };
}

const scopeLabel: Record<string, string> = {
  FULL: 'Full Mock', UNIVERSITY: 'University', WEEKLY: 'Weekly', MONTHLY_GRAND: 'Grand Test',
};

export default function MocksPage() {
  const { data, loading } = useApi<MockRow[]>('/mocks');

  return (
    <div>
      <PageHeader title="Mock Tests" subtitle="Compete on the national leaderboard and track your percentile." />
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : data && data.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((m) => (
            <Card key={m.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col p-5">
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent"><Trophy className="h-5 w-5" /></span>
                  <Badge variant="accent">{scopeLabel[m.scope] ?? m.scope}</Badge>
                </div>
                <h3 className="mt-4 font-semibold">{m.exam.title}</h3>
                {m.university && <p className="text-sm text-muted-foreground">{m.university}</p>}
                <div className="mt-3 flex flex-1 items-end gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {fromNow(m.scheduledAt)}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {Math.round(m.exam.durationSec / 60)} min</span>
                </div>
                <Link href={`/mocks/${m.id}`} className="mt-4">
                  <Button className="w-full">View mock <ArrowRight className="h-4 w-4" /></Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={Trophy} title="No mock tests scheduled" desc="Weekly mocks and grand tests will appear here." />
      )}
    </div>
  );
}
