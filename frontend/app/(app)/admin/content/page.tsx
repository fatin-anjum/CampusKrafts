'use client';

import { useState } from 'react';
import { Library, CheckCircle2, XCircle, FileText, Clock } from 'lucide-react';
import { PageHeader, EmptyState } from '@/components/app/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { useApi } from '@/lib/use-api';
import { apiPost } from '@/lib/api';
import { fromNow } from '@/lib/utils';
import type { PendingResource } from '@/lib/types';

const typeLabel = (t: string) => t.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export default function AdminContentPage() {
  const { data, loading, refetch } = useApi<PendingResource[]>('/resources/pending');
  const { data: approved } = useApi<{ id: string }[]>('/resources');
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  async function moderate(id: string, action: 'approve' | 'reject') {
    setBusy(id);
    try {
      await apiPost(`/resources/${id}/${action}`, {});
      toast(action === 'approve' ? 'Resource approved' : 'Resource rejected', 'success');
      refetch();
    } catch (e: any) {
      toast(e?.message || 'Action failed', 'error');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <PageHeader title="Content Management" subtitle="Review uploads before they reach the public library." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Stat icon={Clock} label="Pending review" value={data?.length ?? 0} tint="text-accent bg-accent/10" />
        <Stat icon={CheckCircle2} label="Approved & live" value={approved?.length ?? 0} tint="text-success bg-success/10" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Moderation queue</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)
          ) : data && data.length > 0 ? (
            data.map((r) => (
              <div key={r.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><FileText className="h-5 w-5" /></span>
                  <div className="min-w-0">
                    <p className="font-medium">{r.title}</p>
                    {r.description && <p className="line-clamp-1 text-sm text-muted-foreground">{r.description}</p>}
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="muted">{typeLabel(r.type)}</Badge>
                      {r.category?.name && <span>{r.category.name}</span>}
                      <span>by {r.uploader?.name ?? 'Unknown'}</span>
                      <span>· {fromNow(r.createdAt)}</span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => moderate(r.id, 'approve')} disabled={busy === r.id}>
                    {busy === r.id ? <Spinner /> : <><CheckCircle2 className="h-4 w-4" /> Approve</>}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => moderate(r.id, 'reject')} disabled={busy === r.id}>
                    <XCircle className="h-4 w-4" /> Reject
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <EmptyState icon={Library} title="Queue is clear" desc="No resources are waiting for moderation." />
          )}
        </CardContent>
      </Card>
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
