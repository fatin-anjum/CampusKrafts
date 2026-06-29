'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Trophy, Plus, Calendar, BarChart3 } from 'lucide-react';
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

interface MockRow { id: string; scope: string; university?: string; scheduledAt: string; closeAt: string; exam: { title: string }; }
interface ExamRow { id: string; title: string; }

const SCOPES = [
  { id: 'FULL', label: 'Full Mock' },
  { id: 'UNIVERSITY', label: 'University' },
  { id: 'WEEKLY', label: 'Weekly' },
  { id: 'MONTHLY_GRAND', label: 'Grand Test' },
];
const scopeLabel = (s: string) => SCOPES.find((x) => x.id === s)?.label ?? s;

export default function TeacherMocksPage() {
  const { data, loading, refetch } = useApi<MockRow[]>('/mocks');
  const [creating, setCreating] = useState(false);

  return (
    <div>
      <PageHeader
        title="Mock Tests"
        subtitle="Publish mocks from your exams and watch the live leaderboard."
        action={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Publish mock</Button>}
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44" />)}</div>
      ) : data && data.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((m) => (
            <Card key={m.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col p-5">
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent"><Trophy className="h-5 w-5" /></span>
                  <Badge variant="accent">{scopeLabel(m.scope)}</Badge>
                </div>
                <h3 className="mt-4 font-semibold">{m.exam.title}</h3>
                {m.university && <p className="text-sm text-muted-foreground">{m.university}</p>}
                <p className="mt-3 flex flex-1 items-end gap-1 text-xs text-muted-foreground"><Calendar className="h-3.5 w-3.5" /> {fromNow(m.scheduledAt)}</p>
                <Link href={`/mocks/${m.id}`} className="mt-4"><Button variant="outline" size="sm" className="w-full"><BarChart3 className="h-4 w-4" /> Leaderboard</Button></Link>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={Trophy} title="No mocks published" desc="Wrap an exam into a scheduled mock test." action={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Publish mock</Button>} />
      )}

      {creating && <PublishDialog onClose={() => setCreating(false)} onCreated={() => { setCreating(false); refetch(); }} />}
    </div>
  );
}

function PublishDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { toast } = useToast();
  const { data: exams } = useApi<ExamRow[]>('/exams');
  const [form, setForm] = useState({ examId: '', scope: 'WEEKLY', university: '', scheduledAt: '', closeAt: '' });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.examId || !form.scheduledAt || !form.closeAt) return toast('Exam and schedule are required', 'error');
    setSaving(true);
    try {
      await apiPost('/mocks', {
        examId: form.examId,
        scope: form.scope,
        university: form.scope === 'UNIVERSITY' ? form.university || undefined : undefined,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        closeAt: new Date(form.closeAt).toISOString(),
      });
      toast('Mock published', 'success');
      onCreated();
    } catch (e: any) {
      toast(e?.message || 'Could not publish mock', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onClose={onClose} className="max-w-lg">
      <h2 className="text-lg font-semibold">Publish a mock test</h2>
      <div className="mt-5 space-y-4">
        <div><Label>Exam</Label>
          <Select className="mt-1.5" value={form.examId} onChange={(e) => setForm({ ...form, examId: e.target.value })}>
            <option value="">Select an exam…</option>
            {exams?.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
          </Select>
        </div>
        <div><Label>Scope</Label>
          <Select className="mt-1.5" value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })}>
            {SCOPES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </Select>
        </div>
        {form.scope === 'UNIVERSITY' && (
          <div><Label>University</Label><Input className="mt-1.5" value={form.university} onChange={(e) => setForm({ ...form, university: e.target.value })} placeholder="e.g. BUET" /></div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Opens</Label><Input type="datetime-local" className="mt-1.5" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} /></div>
          <div><Label>Closes</Label><Input type="datetime-local" className="mt-1.5" value={form.closeAt} onChange={(e) => setForm({ ...form, closeAt: e.target.value })} /></div>
        </div>
      </div>
      <Button className="mt-6 w-full" onClick={save} disabled={saving}>{saving ? <Spinner /> : 'Publish mock'}</Button>
    </Dialog>
  );
}
