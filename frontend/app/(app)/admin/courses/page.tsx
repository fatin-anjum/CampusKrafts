'use client';

import { useState } from 'react';
import { BookOpen, CheckCircle2, Layers, Users, Tag, Plus } from 'lucide-react';
import { PageHeader, EmptyState } from '@/components/app/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { useApi } from '@/lib/use-api';
import { apiPost } from '@/lib/api';
import { formatBdt } from '@/lib/utils';
import type { AdminCourse } from '@/lib/types';

interface Category { id: string; name: string; }

const statusVariant: Record<string, 'success' | 'accent' | 'muted'> = {
  PUBLISHED: 'success', PENDING_REVIEW: 'accent', DRAFT: 'muted', ARCHIVED: 'muted',
};

export default function AdminCoursesPage() {
  const { data, loading, refetch } = useApi<AdminCourse[]>('/courses/all');
  const { toast } = useToast();
  const [approving, setApproving] = useState<string | null>(null);

  async function approve(id: string) {
    setApproving(id);
    try {
      await apiPost(`/courses/${id}/approve`, {});
      toast('Course approved & published', 'success');
      refetch();
    } catch (e: any) {
      toast(e?.message || 'Approval failed', 'error');
    } finally {
      setApproving(null);
    }
  }

  const pending = data?.filter((c) => c.status === 'PENDING_REVIEW') ?? [];

  return (
    <div>
      <PageHeader title="Course Management" subtitle="Review, approve, and oversee every course on the platform." />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {pending.length > 0 && (
            <Card className="mb-6 border-accent/40 bg-accent/5">
              <CardHeader><CardTitle className="text-base">Awaiting approval ({pending.length})</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {pending.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
                    <div>
                      <p className="text-sm font-medium">{c.title}</p>
                      <p className="text-xs text-muted-foreground">by {c.createdBy?.name ?? 'Unknown'} · {c._count?.modules ?? 0} modules</p>
                    </div>
                    <Button size="sm" onClick={() => approve(c.id)} disabled={approving === c.id}>
                      {approving === c.id ? <Spinner /> : <><CheckCircle2 className="h-4 w-4" /> Approve</>}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">All courses</CardTitle></CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-2 p-5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
              ) : data && data.length > 0 ? (
                data.map((c) => (
                  <div key={c.id} className="flex items-center justify-between border-b px-5 py-3 text-sm last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><BookOpen className="h-4 w-4" /></span>
                      <div>
                        <p className="font-medium">{c.title}</p>
                        <p className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Layers className="h-3 w-3" /> {c._count?.modules ?? 0}</span>
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {c._count?.subscriptions ?? 0}</span>
                          <span>{formatBdt(c.priceBdt)}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusVariant[c.status] ?? 'muted'}>{c.status.replace('_', ' ')}</Badge>
                      {c.status === 'PENDING_REVIEW' && (
                        <Button size="sm" variant="outline" onClick={() => approve(c.id)} disabled={approving === c.id}>
                          {approving === c.id ? <Spinner /> : 'Approve'}
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-5"><EmptyState icon={BookOpen} title="No courses" desc="Courses created by teachers appear here for review." /></div>
              )}
            </CardContent>
          </Card>
        </div>

        <CategoriesCard />
      </div>
    </div>
  );
}

function CategoriesCard() {
  const { data, loading, refetch } = useApi<Category[]>('/resource-categories');
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  async function add() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await apiPost('/resource-categories', { name });
      setName('');
      toast('Category added', 'success');
      refetch();
    } catch (e: any) {
      toast(e?.message || 'Could not add category', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="h-fit">
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Tag className="h-4 w-4" /> Categories</CardTitle></CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category…" onKeyDown={(e) => e.key === 'Enter' && add()} />
          <Button onClick={add} disabled={saving}>{saving ? <Spinner /> : <Plus className="h-4 w-4" />}</Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {loading ? <Skeleton className="h-8 w-full" /> : data && data.length > 0 ? (
            data.map((c) => <Badge key={c.id} variant="muted">{c.name}</Badge>)
          ) : (
            <p className="text-sm text-muted-foreground">No categories yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
