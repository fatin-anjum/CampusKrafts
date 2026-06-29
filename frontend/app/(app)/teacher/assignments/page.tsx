'use client';

import { useState } from 'react';
import { FileText, Plus, Users, Hash, Calendar, CheckCircle2 } from 'lucide-react';
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
import { apiPost, apiPatch } from '@/lib/api';
import { fromNow } from '@/lib/utils';
import type { Assignment, Submission, Course } from '@/lib/types';

export default function TeacherAssignmentsPage() {
  const { data, loading, refetch } = useApi<Assignment[]>('/assignments');
  const [creating, setCreating] = useState(false);
  const [active, setActive] = useState<Assignment | null>(null);

  return (
    <div>
      <PageHeader
        title="Assignments"
        subtitle="Create assignments, review submissions, and grade with feedback."
        action={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New assignment</Button>}
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : data && data.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((a) => (
            <Card key={a.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col p-5">
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><FileText className="h-5 w-5" /></span>
                  <Badge variant={a.autoGrade ? 'muted' : 'default'}>{a.autoGrade ? 'Auto' : 'Manual'}</Badge>
                </div>
                <h3 className="mt-4 font-semibold">{a.title}</h3>
                <div className="mt-3 flex flex-1 items-end gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Hash className="h-3.5 w-3.5" /> {a.maxMarks} marks</span>
                  {a.dueAt && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {fromNow(a.dueAt)}</span>}
                </div>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setActive(a)}>
                  <Users className="h-4 w-4" /> Submissions
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={FileText} title="No assignments yet" desc="Create your first assignment to collect student work." action={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New assignment</Button>} />
      )}

      {creating && <CreateDialog onClose={() => setCreating(false)} onCreated={() => { setCreating(false); refetch(); }} />}
      {active && <SubmissionsDialog assignment={active} onClose={() => setActive(null)} />}
    </div>
  );
}

function CreateDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { toast } = useToast();
  const { data: courses } = useApi<Course[]>('/courses');
  const [form, setForm] = useState({ courseId: '', title: '', instructions: '', dueAt: '', maxMarks: 100, autoGrade: false });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.courseId || !form.title.trim()) return toast('Course and title are required', 'error');
    setSaving(true);
    try {
      await apiPost('/assignments', {
        courseId: form.courseId,
        title: form.title,
        instructions: form.instructions || undefined,
        dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : undefined,
        maxMarks: Number(form.maxMarks),
        autoGrade: form.autoGrade,
      });
      toast('Assignment created', 'success');
      onCreated();
    } catch (e: any) {
      toast(e?.message || 'Could not create assignment', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onClose={onClose} className="max-w-lg">
      <h2 className="text-lg font-semibold">New assignment</h2>
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
          <Input className="mt-1.5" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Algebra Problem Set 3" />
        </div>
        <div>
          <Label>Instructions</Label>
          <Textarea className="mt-1.5" value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} placeholder="What should students do?" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Due date</Label>
            <Input type="datetime-local" className="mt-1.5" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} />
          </div>
          <div>
            <Label>Max marks</Label>
            <Input type="number" className="mt-1.5" value={form.maxMarks} onChange={(e) => setForm({ ...form, maxMarks: Number(e.target.value) })} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.autoGrade} onChange={(e) => setForm({ ...form, autoGrade: e.target.checked })} className="h-4 w-4 rounded border-input" />
          Auto-grade text submissions
        </label>
      </div>
      <Button className="mt-6 w-full" onClick={save} disabled={saving}>{saving ? <Spinner /> : 'Create assignment'}</Button>
    </Dialog>
  );
}

function SubmissionsDialog({ assignment, onClose }: { assignment: Assignment; onClose: () => void }) {
  const { data, loading, refetch } = useApi<Submission[]>(`/assignments/${assignment.id}/submissions`);

  return (
    <Dialog open onClose={onClose} className="max-w-2xl">
      <h2 className="pr-6 text-lg font-semibold">{assignment.title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{data?.length ?? 0} submission(s) · {assignment.maxMarks} marks</p>
      <div className="mt-5 max-h-[60vh] space-y-3 overflow-y-auto pr-1">
        {loading ? (
          <Skeleton className="h-24" />
        ) : data && data.length > 0 ? (
          data.map((s) => <SubmissionRow key={s.id} submission={s} maxMarks={assignment.maxMarks} onGraded={refetch} />)
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">No submissions yet.</p>
        )}
      </div>
    </Dialog>
  );
}

function SubmissionRow({ submission, maxMarks, onGraded }: { submission: Submission; maxMarks: number; onGraded: () => void }) {
  const { toast } = useToast();
  const [marks, setMarks] = useState<number | string>(submission.marks ?? '');
  const [feedback, setFeedback] = useState(submission.feedback ?? '');
  const [saving, setSaving] = useState(false);

  async function grade() {
    if (marks === '' || isNaN(Number(marks))) return toast('Enter a mark', 'error');
    setSaving(true);
    try {
      await apiPatch(`/submissions/${submission.id}/grade`, { marks: Number(marks), feedback: feedback || undefined });
      toast('Graded', 'success');
      onGraded();
    } catch (e: any) {
      toast(e?.message || 'Grading failed', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{submission.user?.name ?? 'Student'}</p>
        <Badge variant={submission.status === 'GRADED' ? 'success' : 'accent'}>
          {submission.status === 'GRADED' ? <><CheckCircle2 className="h-3 w-3" /> Graded</> : 'Submitted'}
        </Badge>
      </div>
      {submission.text && <p className="mt-2 whitespace-pre-wrap rounded-md bg-secondary/40 p-3 text-sm text-muted-foreground">{submission.text}</p>}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="w-28">
          <Label className="text-xs">Marks / {maxMarks}</Label>
          <Input type="number" className="mt-1 h-9" value={marks} onChange={(e) => setMarks(e.target.value)} />
        </div>
        <div className="flex-1">
          <Label className="text-xs">Feedback</Label>
          <Input className="mt-1 h-9" value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Optional feedback…" />
        </div>
        <Button size="sm" onClick={grade} disabled={saving}>{saving ? <Spinner /> : 'Save grade'}</Button>
      </div>
    </div>
  );
}
