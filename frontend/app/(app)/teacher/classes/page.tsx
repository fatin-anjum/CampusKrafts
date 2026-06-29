'use client';

import { useState } from 'react';
import { Radio, Plus, Calendar, Video, StopCircle } from 'lucide-react';
import { PageHeader, EmptyState } from '@/components/app/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Dialog } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { useApi } from '@/lib/use-api';
import { apiPost } from '@/lib/api';
import { fromNow } from '@/lib/utils';
import type { LiveClassRow, Course } from '@/lib/types';

const PROVIDERS = [
  { id: 'BUILT_IN', label: 'Built-in room' },
  { id: 'ZOOM', label: 'Zoom' },
  { id: 'GOOGLE_MEET', label: 'Google Meet' },
];

const statusVariant: Record<string, 'success' | 'accent' | 'muted' | 'destructive'> = {
  LIVE: 'success', SCHEDULED: 'accent', ENDED: 'muted', CANCELLED: 'destructive',
};

export default function TeacherClassesPage() {
  const { data, loading, refetch } = useApi<LiveClassRow[]>('/live-classes');
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);

  async function endClass(id: string) {
    try {
      await apiPost(`/live-classes/${id}/end`, {});
      toast('Class ended', 'success');
      refetch();
    } catch (e: any) {
      toast(e?.message || 'Could not end class', 'error');
    }
  }

  return (
    <div>
      <PageHeader
        title="Manage Classes"
        subtitle="Schedule live sessions and wrap them up with recordings."
        action={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Schedule class</Button>}
      />

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : data && data.length > 0 ? (
        <div className="space-y-3">
          {data.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Radio className="h-5 w-5" /></span>
                  <div>
                    <p className="font-medium">{c.title}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" /> {fromNow(c.startAt)} · {c.provider.replace('_', ' ')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={statusVariant[c.status] ?? 'muted'}>{c.status}</Badge>
                  {c.joinUrl && <a href={c.joinUrl} target="_blank" rel="noreferrer"><Button variant="outline" size="sm"><Video className="h-4 w-4" /> Join</Button></a>}
                  {c.status !== 'ENDED' && <Button variant="ghost" size="sm" onClick={() => endClass(c.id)}><StopCircle className="h-4 w-4" /> End</Button>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={Radio} title="No classes scheduled" desc="Schedule your first live class to get started." action={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Schedule class</Button>} />
      )}

      {creating && <ScheduleDialog onClose={() => setCreating(false)} onCreated={() => { setCreating(false); refetch(); }} />}
    </div>
  );
}

function ScheduleDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { toast } = useToast();
  const { data: courses } = useApi<Course[]>('/courses');
  const [form, setForm] = useState({ courseId: '', title: '', provider: 'BUILT_IN', startAt: '', endAt: '', joinUrl: '' });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.courseId || !form.title.trim() || !form.startAt || !form.endAt) return toast('Fill course, title, and times', 'error');
    setSaving(true);
    try {
      await apiPost('/live-classes', {
        courseId: form.courseId,
        title: form.title,
        provider: form.provider,
        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),
        joinUrl: form.provider !== 'BUILT_IN' ? form.joinUrl || undefined : undefined,
      });
      toast('Class scheduled', 'success');
      onCreated();
    } catch (e: any) {
      toast(e?.message || 'Could not schedule class', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onClose={onClose} className="max-w-lg">
      <h2 className="text-lg font-semibold">Schedule a live class</h2>
      <div className="mt-5 space-y-4">
        <div>
          <Label>Course</Label>
          <Select className="mt-1.5" value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })}>
            <option value="">Select a course…</option>
            {courses?.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </Select>
        </div>
        <div>
          <Label>Title</Label>
          <Input className="mt-1.5" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Live Doubt Solving — Physics" />
        </div>
        <div>
          <Label>Provider</Label>
          <Select className="mt-1.5" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}>
            {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </Select>
        </div>
        {form.provider !== 'BUILT_IN' && (
          <div>
            <Label>Join URL</Label>
            <Input className="mt-1.5" value={form.joinUrl} onChange={(e) => setForm({ ...form, joinUrl: e.target.value })} placeholder="https://zoom.us/j/…" />
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Starts</Label>
            <Input type="datetime-local" className="mt-1.5" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} />
          </div>
          <div>
            <Label>Ends</Label>
            <Input type="datetime-local" className="mt-1.5" value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} />
          </div>
        </div>
      </div>
      <Button className="mt-6 w-full" onClick={save} disabled={saving}>{saving ? <Spinner /> : 'Schedule class'}</Button>
    </Dialog>
  );
}
