'use client';

import { useState } from 'react';
import { Megaphone, Plus } from 'lucide-react';
import { PageHeader, EmptyState } from '@/components/app/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Dialog } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { useApi } from '@/lib/use-api';
import { apiPost } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { fromNow } from '@/lib/utils';

interface Announcement { id: string; title: string; body: string; publishedAt: string; }

const AUDIENCES = [
  { id: 'all', label: 'Everyone' },
  { id: 'STUDENT', label: 'Students' },
  { id: 'TEACHER', label: 'Teachers' },
  { id: 'MODERATOR', label: 'Moderators' },
];

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const { data, loading, refetch } = useApi<Announcement[]>('/announcements');
  const [creating, setCreating] = useState(false);

  const canPost = user?.role === 'ADMIN' || user?.role === 'TEACHER' || user?.role === 'MODERATOR';

  return (
    <div>
      <PageHeader
        title="Announcements"
        subtitle="Exam notices, class updates, and admission news."
        action={canPost ? <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New announcement</Button> : undefined}
      />

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : data && data.length > 0 ? (
        <div className="space-y-3">
          {data.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex gap-4 p-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent"><Megaphone className="h-5 w-5" /></span>
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold">{a.title}</h3>
                    <span className="shrink-0 text-xs text-muted-foreground">{fromNow(a.publishedAt)}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{a.body}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={Megaphone} title="No announcements yet" desc="Important notices will show up here." />
      )}

      {creating && <CreateDialog onClose={() => setCreating(false)} onCreated={() => { setCreating(false); refetch(); }} />}
    </div>
  );
}

function CreateDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ title: '', body: '', audience: 'all' });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.title.trim() || !form.body.trim()) return toast('Title and body are required', 'error');
    setSaving(true);
    try {
      const audience = form.audience === 'all' ? { all: true } : { roles: [form.audience] };
      await apiPost('/announcements', { title: form.title, body: form.body, audience });
      toast('Announcement published', 'success');
      onCreated();
    } catch (e: any) {
      toast(e?.message || 'Could not publish', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onClose={onClose} className="max-w-lg">
      <h2 className="text-lg font-semibold">New announcement</h2>
      <div className="mt-5 space-y-4">
        <div><Label>Title</Label><Input className="mt-1.5" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
        <div><Label>Message</Label><Textarea className="mt-1.5" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
        <div><Label>Audience</Label>
          <Select className="mt-1.5" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
            {AUDIENCES.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </Select>
        </div>
      </div>
      <Button className="mt-6 w-full" onClick={save} disabled={saving}>{saving ? <Spinner /> : 'Publish announcement'}</Button>
    </Dialog>
  );
}
