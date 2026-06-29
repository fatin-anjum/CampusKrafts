'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Trophy, Medal, Crown, RefreshCw } from 'lucide-react';
import { PageHeader, EmptyState } from '@/components/app/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useApi } from '@/lib/use-api';
import { apiPost } from '@/lib/api';
import { cn } from '@/lib/utils';

interface LeaderRow { rank: number; name: string; score: number; userId?: string }
interface MyResult { score: number; rank?: number; percentile?: number }

export default function MockDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const lb = useApi<LeaderRow[]>(id ? `/mocks/${id}/leaderboard` : null);
  const mine = useApi<MyResult>(id ? `/mocks/${id}/my-result` : null);
  const [recording, setRecording] = useState(false);

  async function record() {
    setRecording(true);
    try {
      await apiPost(`/mocks/${id}/record`, {});
      toast('Result recorded — leaderboard updated!', 'success');
      lb.refetch();
      mine.refetch();
    } catch (e: any) {
      toast(e?.message || 'Take the mock exam first, then record.', 'error');
    } finally {
      setRecording(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Mock Leaderboard"
        subtitle="Live national ranking — updated the moment results are recorded."
        action={
          <Button onClick={record} disabled={recording}>
            <RefreshCw className={cn('h-4 w-4', recording && 'animate-spin')} /> Record my result
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* My result */}
        <Card className="lg:col-span-1">
          <CardContent className="p-6">
            <h3 className="font-semibold">Your result</h3>
            {mine.loading ? (
              <Skeleton className="mt-4 h-24" />
            ) : mine.data ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border bg-secondary/30 p-5 text-center">
                  <div className="text-3xl font-extrabold text-primary">{mine.data.score}</div>
                  <div className="text-xs text-muted-foreground">your score</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border p-3 text-center">
                    <div className="text-xl font-bold">#{mine.data.rank ?? '—'}</div>
                    <div className="text-xs text-muted-foreground">Rank</div>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <div className="text-xl font-bold">{mine.data.percentile != null ? `${mine.data.percentile}` : '—'}</div>
                    <div className="text-xs text-muted-foreground">Percentile</div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                No result yet. Take the mock exam, then click <span className="font-medium text-foreground">Record my result</span>.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Card className="lg:col-span-2">
          <CardContent className="p-0">
            <div className="flex items-center gap-2 border-b px-6 py-4">
              <Trophy className="h-4 w-4 text-accent" />
              <h3 className="font-semibold">Top performers</h3>
            </div>
            {lb.loading ? (
              <div className="space-y-2 p-6">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : lb.data && lb.data.length > 0 ? (
              <ul className="divide-y">
                {lb.data.map((row) => (
                  <li key={row.rank} className="flex items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-3">
                      <RankBadge rank={row.rank} />
                      <span className="text-sm font-medium">{row.name}</span>
                    </div>
                    <Badge variant="muted">{row.score} pts</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={Trophy} title="No results yet" desc="Be the first to record a score on this mock." />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500/15 text-yellow-600"><Crown className="h-4 w-4" /></span>;
  if (rank === 2) return <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-400/15 text-slate-500"><Medal className="h-4 w-4" /></span>;
  if (rank === 3) return <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-700/15 text-amber-700"><Medal className="h-4 w-4" /></span>;
  return <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-muted-foreground">{rank}</span>;
}
