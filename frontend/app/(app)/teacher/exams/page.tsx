'use client';

import { useState } from 'react';
import { ClipboardList, Plus, Database, Hash, Clock, Link2, CheckCircle2 } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import type { Question, Course } from '@/lib/types';

interface ExamRow { id: string; title: string; type: string; mode: string; durationSec: number; totalMarks: number; }

export default function TeacherExamsPage() {
  const [tab, setTab] = useState<'exams' | 'bank'>('exams');

  return (
    <div>
      <PageHeader title="Exams & Question Bank" subtitle="Author questions, assemble exams, and attach marks." />
      <div className="mb-6 inline-flex rounded-lg border bg-card p-1">
        {(['exams', 'bank'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('rounded-md px-4 py-1.5 text-sm font-medium transition-colors', tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
            {t === 'exams' ? 'Exams' : 'Question Bank'}
          </button>
        ))}
      </div>
      {tab === 'exams' ? <ExamsTab /> : <BankTab />}
    </div>
  );
}

function ExamsTab() {
  const { data, loading, refetch } = useApi<ExamRow[]>('/exams');
  const [creating, setCreating] = useState(false);
  const [attaching, setAttaching] = useState<ExamRow | null>(null);

  return (
    <div>
      <div className="mb-4 flex justify-end"><Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New exam</Button></div>
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40" />)}</div>
      ) : data && data.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((e) => (
            <Card key={e.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col p-5">
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><ClipboardList className="h-5 w-5" /></span>
                  <Badge variant={e.mode === 'MOCK' ? 'accent' : e.mode === 'GRADED' ? 'default' : 'muted'}>{e.mode}</Badge>
                </div>
                <h3 className="mt-4 font-semibold">{e.title}</h3>
                <div className="mt-3 flex flex-1 items-end gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {Math.round(e.durationSec / 60)} min</span>
                  <span className="flex items-center gap-1"><Hash className="h-3.5 w-3.5" /> {e.totalMarks} marks</span>
                  <span>{e.type}</span>
                </div>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setAttaching(e)}><Link2 className="h-4 w-4" /> Attach questions</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={ClipboardList} title="No exams yet" desc="Create an exam, then attach questions from the bank." action={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New exam</Button>} />
      )}

      {creating && <CreateExamDialog onClose={() => setCreating(false)} onCreated={() => { setCreating(false); refetch(); }} />}
      {attaching && <AttachDialog exam={attaching} onClose={() => setAttaching(null)} onAttached={() => { setAttaching(null); refetch(); }} />}
    </div>
  );
}

function CreateExamDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { toast } = useToast();
  const { data: courses } = useApi<Course[]>('/courses');
  const [form, setForm] = useState({ title: '', type: 'MCQ', mode: 'PRACTICE', durationMin: 30, courseId: '', secureMode: false, negativeMarkRatio: 0 });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.title.trim()) return toast('Title is required', 'error');
    setSaving(true);
    try {
      await apiPost('/exams', {
        title: form.title, type: form.type, mode: form.mode,
        durationSec: Math.max(60, Number(form.durationMin) * 60),
        courseId: form.courseId || undefined,
        secureMode: form.secureMode,
        negativeMarkRatio: Number(form.negativeMarkRatio),
      });
      toast('Exam created', 'success');
      onCreated();
    } catch (e: any) {
      toast(e?.message || 'Could not create exam', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onClose={onClose} className="max-w-lg">
      <h2 className="text-lg font-semibold">New exam</h2>
      <div className="mt-5 space-y-4">
        <div><Label>Title</Label><Input className="mt-1.5" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Physics Chapter 5 Test" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Type</Label>
            <Select className="mt-1.5" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="MCQ">MCQ</option><option value="WRITTEN">Written</option><option value="MIXED">Mixed</option>
            </Select>
          </div>
          <div><Label>Mode</Label>
            <Select className="mt-1.5" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
              <option value="PRACTICE">Practice</option><option value="GRADED">Graded</option><option value="MOCK">Mock</option>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Duration (min)</Label><Input type="number" className="mt-1.5" value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })} /></div>
          <div><Label>Negative mark ratio</Label><Input type="number" step="0.25" min="0" max="1" className="mt-1.5" value={form.negativeMarkRatio} onChange={(e) => setForm({ ...form, negativeMarkRatio: Number(e.target.value) })} /></div>
        </div>
        <div><Label>Course (optional)</Label>
          <Select className="mt-1.5" value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })}>
            <option value="">None — standalone</option>
            {courses?.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </Select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.secureMode} onChange={(e) => setForm({ ...form, secureMode: e.target.checked })} className="h-4 w-4 rounded border-input" />
          Secure mode (tab-switch detection)
        </label>
      </div>
      <Button className="mt-6 w-full" onClick={save} disabled={saving}>{saving ? <Spinner /> : 'Create exam'}</Button>
    </Dialog>
  );
}

function AttachDialog({ exam, onClose, onAttached }: { exam: ExamRow; onClose: () => void; onAttached: () => void }) {
  const { toast } = useToast();
  const { data, loading } = useApi<Question[]>('/questions');
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  function toggle(id: string) {
    setSelected((s) => {
      const next = { ...s };
      if (id in next) delete next[id]; else next[id] = 1;
      return next;
    });
  }

  async function attach() {
    const questions = Object.entries(selected).map(([questionId, marks]) => ({ questionId, marks: Number(marks) || 1 }));
    if (questions.length === 0) return toast('Select at least one question', 'error');
    setSaving(true);
    try {
      const res = await apiPost<{ added: number; totalMarks: number }>(`/exams/${exam.id}/questions`, { questions });
      toast(`Attached ${res.added} question(s) · ${res.totalMarks} marks`, 'success');
      onAttached();
    } catch (e: any) {
      toast(e?.message || 'Could not attach', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onClose={onClose} className="max-w-2xl">
      <h2 className="pr-6 text-lg font-semibold">Attach questions · {exam.title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">Select questions and set marks each.</p>
      <div className="mt-5 max-h-[55vh] space-y-2 overflow-y-auto pr-1">
        {loading ? <Skeleton className="h-32" /> : data && data.length > 0 ? data.map((q) => {
          const on = q.id in selected;
          return (
            <div key={q.id} className={cn('rounded-lg border p-3 transition-colors', on && 'border-primary bg-primary/5')}>
              <div className="flex items-start gap-3">
                <input type="checkbox" checked={on} onChange={() => toggle(q.id)} className="mt-1 h-4 w-4 rounded border-input" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{q.stem}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="muted">{q.type}</Badge>
                    <span>{q.subject} · {q.topic}</span>
                    <span>difficulty {q.difficulty}</span>
                  </div>
                </div>
                {on && (
                  <div className="w-20 shrink-0">
                    <Input type="number" className="h-8" value={selected[q.id]} onChange={(e) => setSelected((s) => ({ ...s, [q.id]: Number(e.target.value) }))} aria-label="marks" />
                  </div>
                )}
              </div>
            </div>
          );
        }) : <p className="py-8 text-center text-sm text-muted-foreground">No questions in the bank yet. Add some in the Question Bank tab.</p>}
      </div>
      <Button className="mt-4 w-full" onClick={attach} disabled={saving}>{saving ? <Spinner /> : `Attach ${Object.keys(selected).length || ''} question(s)`}</Button>
    </Dialog>
  );
}

function BankTab() {
  const [subject, setSubject] = useState('');
  const path = subject ? `/questions?subject=${encodeURIComponent(subject)}` : '/questions';
  const { data, loading, refetch } = useApi<Question[]>(path);
  const [creating, setCreating] = useState(false);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Filter by subject…" className="sm:max-w-xs" />
        <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New question</Button>
      </div>
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : data && data.length > 0 ? (
        <div className="space-y-3">
          {data.map((q) => (
            <Card key={q.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium">{q.stem}</p>
                  <Badge variant="muted">{q.type}</Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{q.subject} · {q.topic} · difficulty {q.difficulty}</div>
                {q.options?.length > 0 && (
                  <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                    {q.options.map((o) => (
                      <div key={o.id} className={cn('flex items-center gap-2 rounded-md px-2 py-1 text-sm', o.isCorrect ? 'bg-success/10 text-success' : 'bg-secondary/40')}>
                        {o.isCorrect && <CheckCircle2 className="h-3.5 w-3.5" />}<span className="font-medium">{o.label}.</span> {o.text}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={Database} title="No questions yet" desc="Build your question bank to assemble exams." action={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New question</Button>} />
      )}

      {creating && <CreateQuestionDialog onClose={() => setCreating(false)} onCreated={() => { setCreating(false); refetch(); }} />}
    </div>
  );
}

function CreateQuestionDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ subject: '', topic: '', difficulty: 3, stem: '', type: 'MCQ', explanation: '', correctText: '' });
  const [options, setOptions] = useState([
    { label: 'A', text: '', isCorrect: true },
    { label: 'B', text: '', isCorrect: false },
    { label: 'C', text: '', isCorrect: false },
    { label: 'D', text: '', isCorrect: false },
  ]);
  const [saving, setSaving] = useState(false);

  function setCorrect(idx: number) {
    setOptions((o) => o.map((opt, i) => ({ ...opt, isCorrect: i === idx })));
  }
  function setText(idx: number, text: string) {
    setOptions((o) => o.map((opt, i) => (i === idx ? { ...opt, text } : opt)));
  }

  async function save() {
    if (!form.subject.trim() || !form.topic.trim() || !form.stem.trim()) return toast('Subject, topic, and question are required', 'error');
    setSaving(true);
    try {
      const body: any = {
        subject: form.subject, topic: form.topic, difficulty: Number(form.difficulty),
        stem: form.stem, type: form.type, explanation: form.explanation || undefined,
      };
      if (form.type === 'MCQ') {
        const filled = options.filter((o) => o.text.trim());
        if (filled.length < 2) { toast('Add at least two options', 'error'); setSaving(false); return; }
        body.options = filled;
      } else {
        body.correctText = form.correctText || undefined;
      }
      await apiPost('/questions', body);
      toast('Question added', 'success');
      onCreated();
    } catch (e: any) {
      toast(e?.message || 'Could not add question', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onClose={onClose} className="max-w-lg">
      <h2 className="text-lg font-semibold">New question</h2>
      <div className="mt-5 max-h-[60vh] space-y-4 overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Subject</Label><Input className="mt-1.5" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Physics" /></div>
          <div><Label>Topic</Label><Input className="mt-1.5" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="Kinematics" /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Type</Label>
            <Select className="mt-1.5" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="MCQ">MCQ</option><option value="WRITTEN">Written</option>
            </Select>
          </div>
          <div><Label>Difficulty (1–5)</Label><Input type="number" min="1" max="5" className="mt-1.5" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: Number(e.target.value) })} /></div>
        </div>
        <div><Label>Question</Label><Textarea className="mt-1.5" value={form.stem} onChange={(e) => setForm({ ...form, stem: e.target.value })} /></div>

        {form.type === 'MCQ' ? (
          <div>
            <Label>Options (select the correct one)</Label>
            <div className="mt-1.5 space-y-2">
              {options.map((o, i) => (
                <div key={o.label} className="flex items-center gap-2">
                  <input type="radio" name="correct" checked={o.isCorrect} onChange={() => setCorrect(i)} className="h-4 w-4" />
                  <span className="w-5 text-sm font-medium text-muted-foreground">{o.label}</span>
                  <Input className="h-9" value={o.text} onChange={(e) => setText(i, e.target.value)} placeholder={`Option ${o.label}`} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div><Label>Model answer (optional)</Label><Textarea className="mt-1.5" value={form.correctText} onChange={(e) => setForm({ ...form, correctText: e.target.value })} /></div>
        )}

        <div><Label>Explanation (optional)</Label><Textarea className="mt-1.5" value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} /></div>
      </div>
      <Button className="mt-6 w-full" onClick={save} disabled={saving}>{saving ? <Spinner /> : 'Add question'}</Button>
    </Dialog>
  );
}
