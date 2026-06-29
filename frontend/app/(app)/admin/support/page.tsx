'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { LifeBuoy, ChevronRight, ShieldCheck } from 'lucide-react';
import { PageHeader, EmptyState } from '@/components/app/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi } from '@/lib/use-api';
import { cn, fromNow } from '@/lib/utils';
import { ticketStatusVariant } from '@/lib/support';
import type { Ticket } from '@/lib/types';

const FILTERS = ['ALL', 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

export default function AdminSupportPage() {
  const { data, loading } = useApi<Ticket[]>('/support/tickets');
  const [filter, setFilter] = useState('ALL');

  const filtered = useMemo(() => {
    if (!data) return [];
    return filter === 'ALL' ? data : data.filter((t) => t.status === filter);
  }, [data, filter]);

  const counts = useMemo(() => {
    const open = data?.filter((t) => t.status === 'OPEN').length ?? 0;
    const active = data?.filter((t) => t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS').length ?? 0;
    const resolved = data?.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length ?? 0;
    return { open, active, resolved };
  }, [data]);

  return (
    <div>
      <PageHeader title="Support Tickets" subtitle="Triage, assign, and resolve user requests." />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Open" value={counts.open} tint="text-accent bg-accent/10" />
        <Stat label="In progress" value={counts.active} tint="text-primary bg-primary/10" />
        <Stat label="Resolved" value={counts.resolved} tint="text-success bg-success/10" />
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn('rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors', filter === f ? 'border-primary bg-primary/5 text-primary' : 'hover:bg-secondary')}>
            {f === 'ALL' ? 'All' : f.replace('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((t) => (
            <Link key={t.id} href={`/support/${t.id}`}>
              <Card className="transition-colors hover:border-primary/40">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{t.subject}</p>
                    <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="muted">{t.category}</Badge>
                      <span>{t.priority.toLowerCase()} priority</span>
                      {t.assignee?.name && <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> {t.assignee.name}</span>}
                      <span>· {fromNow(t.createdAt)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={ticketStatusVariant[t.status] ?? 'muted'}>{t.status.replace('_', ' ')}</Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState icon={LifeBuoy} title="No tickets" desc="Tickets matching this filter will appear here." />
      )}
    </div>
  );
}

function Stat({ label, value, tint }: { label: string; value: number; tint: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-lg font-bold ${tint}`}>{value}</span>
        <div className="text-sm font-medium text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}
