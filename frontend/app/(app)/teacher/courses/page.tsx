'use client';

import { useState } from 'react';
import { BookOpen, Plus, Layers, Users, Send, ChevronRight } from 'lucide-react';
import { PageHeader, EmptyState } from '@/components/app/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { uploadFile } from '@/lib/upload';
import { formatBdt } from '@/lib/utils';
import type { AdminCourse, CourseDetail } from '@/lib/types';

const statusVariant: Record<string, 'success' | 'accent' | 'muted'> = {
  PUBLISHED: 'success', PENDING_REVIEW: 'accent', DRAFT: 'muted', ARCHIVED: 'muted',
};

export default function TeacherCoursesPage() {
  const { data, loading, refetch } = useApi<AdminCourse[]>('/courses/mine');
  const [creating, setCreating] = useState(false);
  const [active, setActive] = useState<AdminCourse | null>(null);

  return (
    <div>
      <PageHeader
        title="Course Builder"
        subtitle="Create courses, structure modules, and upload video lessons."
        action={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New course</Button>}
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40" />)}</div>
      ) : data && data.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((c) => (
            <Card key={c.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col p-5">
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><BookOpen className="h-5 w-5" /></span>
                  <Badge variant={statusVariant[c.status] ?? 'muted'}>{c.status.replace('_', ' ')}</Badge>
                </div>
                <h3 className="mt-4 font-semibold">{c.title}</h3>
                <div className="mt-3 flex flex-1 items-end gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Layers className="h-3.5 w-3.5" /> {c._count?.modules ?? 0} modules</span>
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {c._count?.subscriptions ?? 0} enrolled</span>
                  <span>{formatBdt(c.priceBdt)}</span>
                </div>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setActive(c)}>Manage content <ChevronRight className="h-4 w-4" /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={BookOpen} title="No courses yet" desc="Create a course, then add modules and lessons." action={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New course</Button>} />
      )}

      {creating && <CreateCourseDialog onClose={() => setCreating(false)} onCreated={() => { setCreating(false); refetch(); }} />}
      {active && <BuilderDialog course={active} onClose={() => setActive(null)} onChange={refetch} />}
    </div>
  );
}

function CreateCourseDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ title: '', description: '', priceBdt: 2500 });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (form.title.trim().length < 3) return toast('Title must be at least 3 characters', 'error');
    setSaving(true);
    try {
      await apiPost('/courses', { title: form.title, description: form.description || undefined, priceBdt: Number(form.priceBdt) });
      toast('Course created as draft', 'success');
      onCreated();
    } catch (e: any) {
      toast(e?.message || 'Could not create course', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onClose={onClose} className="max-w-lg">
      <h2 className="text-lg font-semibold">New course</h2>
      <div className="mt-5 space-y-4">
        <div><Label>Title</Label><Input className="mt-1.5" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Engineering Admission Crash Course" /></div>
        <div><Label>Description</Label><Textarea className="mt-1.5" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div><Label>Price (BDT)</Label><Input type="number" className="mt-1.5" value={form.priceBdt} onChange={(e) => setForm({ ...form, priceBdt: Number(e.target.value) })} /></div>
      </div>
      <Button className="mt-6 w-full" onClick={save} disabled={saving}>{saving ? <Spinner /> : 'Create course'}</Button>
    </Dialog>
  );
}

function BuilderDialog({ course, onClose, onChange }: { course: AdminCourse; onClose: () => void; onChange: () => void }) {
  const { toast } = useToast();
  const { data, loading, refetch } = useApi<CourseDetail>(`/courses/${course.slug}`);
  const [moduleTitle, setModuleTitle] = useState('');
  const [busy, setBusy] = useState(false);

  async function addModule() {
    if (!moduleTitle.trim()) return;
    setBusy(true);
    try {
      await apiPost(`/courses/${course.id}/modules`, { title: moduleTitle });
      setModuleTitle('');
      refetch();
    } catch (e: any) {
      toast(e?.message || 'Could not add module', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function submitReview() {
    try {
      await apiPost(`/courses/${course.id}/submit-review`, {});
      toast('Submitted for review', 'success');
      onChange();
      refetch();
    } catch (e: any) {
      toast(e?.message || 'Could not submit', 'error');
    }
  }

  return (
    <Dialog open onClose={onClose} className="max-w-2xl">
      <div className="flex items-center justify-between pr-6">
        <h2 className="text-lg font-semibold">{course.title}</h2>
        <Badge variant={statusVariant[data?.status ?? course.status] ?? 'muted'}>{(data?.status ?? course.status).replace('_', ' ')}</Badge>
      </div>

      <div className="mt-5 max-h-[55vh] space-y-4 overflow-y-auto pr-1">
        {loading ? <Skeleton className="h-32" /> : (
          <>
            {data?.modules.map((m) => (
              <div key={m.id} className="rounded-lg border p-4">
                <p className="font-medium">{m.title}</p>
                <div className="mt-2 space-y-1.5">
                  {m.lessons.map((l) => (
                    <div key={l.id} className="flex items-center justify-between rounded-md bg-secondary/40 px-3 py-1.5 text-sm">
                      <span>{l.title}</span>
                      <Badge variant="muted">{l.type}</Badge>
                    </div>
                  ))}
                  {m.lessons.length === 0 && <p className="text-xs text-muted-foreground">No lessons yet.</p>}
                </div>
                <AddLesson moduleId={m.id} onAdded={refetch} />
              </div>
            ))}
            {data && data.modules.length === 0 && <p className="text-sm text-muted-foreground">No modules yet. Add one below.</p>}
          </>
        )}
      </div>

      <div className="mt-4 flex gap-2 border-t pt-4">
        <Input value={moduleTitle} onChange={(e) => setModuleTitle(e.target.value)} placeholder="New module title…" onKeyDown={(e) => e.key === 'Enter' && addModule()} />
        <Button onClick={addModule} disabled={busy}>{busy ? <Spinner /> : <Plus className="h-4 w-4" />}</Button>
      </div>

      {(data?.status ?? course.status) === 'DRAFT' && (
        <Button variant="accent" className="mt-3 w-full" onClick={submitReview}><Send className="h-4 w-4" /> Submit for review</Button>
      )}
    </Dialog>
  );
}

function AddLesson({ moduleId, onAdded }: { moduleId: string; onAdded: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('RECORDED');
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [freePreview, setFreePreview] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim()) return toast('Lesson title required', 'error');
    setSaving(true);
    try {
      let videoUrl: string | undefined;
      if (type === 'RECORDED') {
        if (videoUrlInput.trim()) {
          videoUrl = videoUrlInput.trim();
        } else if (file) {
          const { s3Key } = await uploadFile(file);
          videoUrl = s3Key;
        } else {
          toast('Paste a video link or choose a file', 'error');
          setSaving(false);
          return;
        }
      }
      await apiPost(`/modules/${moduleId}/lessons`, { title, type, videoUrl, isFreePreview: freePreview });
      toast('Lesson added', 'success');
      setOpen(false); setTitle(''); setVideoUrlInput(''); setFile(null); setFreePreview(false);
      onAdded();
    } catch (e: any) {
      toast(e?.message || 'Could not add lesson', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return <button onClick={() => setOpen(true)} className="mt-2 text-xs font-medium text-primary hover:underline">+ Add lesson</button>;

  return (
    <div className="mt-3 space-y-2 rounded-md border border-dashed p-3">
      <Input className="h-9" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Lesson title" />
      <Select className="h-9" value={type} onChange={(e) => setType(e.target.value)}>
        <option value="RECORDED">Recorded video</option>
        <option value="LIVE">Live</option>
        <option value="SHEET">Sheet</option>
      </Select>
      {type === 'RECORDED' && (
        <div className="space-y-2 rounded-md bg-secondary/30 p-2">
          <Input className="h-9" value={videoUrlInput} onChange={(e) => setVideoUrlInput(e.target.value)} placeholder="Paste YouTube, Vimeo, or MP4 link" />
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" /> or upload a file <span className="h-px flex-1 bg-border" /></div>
          <Input type="file" accept="video/*" className="h-9 cursor-pointer" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={freePreview} onChange={(e) => setFreePreview(e.target.checked)} className="h-3.5 w-3.5 rounded border-input" />
            Free preview (visible without enrolling)
          </label>
        </div>
      )}
      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={saving}>{saving ? <Spinner /> : 'Save lesson'}</Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}
