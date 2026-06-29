'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Clock, ShieldAlert, Flag, ChevronLeft, ChevronRight, CheckCircle2, XCircle, MinusCircle, AlertTriangle,
} from 'lucide-react';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/lib/auth';
import { apiPost, apiPatch } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { AttemptState } from '@/lib/types';

interface ResultData {
  exam: { title: string; totalMarks: number };
  status: string;
  score: number;
  result?: { correct: number; wrong: number; skipped: number; score: number; percentile?: number };
}

export default function ExamRunnerPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [phase, setPhase] = useState<'loading' | 'active' | 'submitted' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [attempt, setAttempt] = useState<AttemptState | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<ResultData | null>(null);
  const submittingRef = useRef(false);

  // ── Auth guard ──
  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  // ── Start / resume attempt ──
  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      try {
        const state = await apiPost<AttemptState>(`/exams/${id}/attempts`, {});
        setAttempt(state);
        setAnswers(Object.fromEntries(Object.entries(state.savedAnswers).map(([q, a]) => [q, a.selectedOptionId ?? ''])));
        setRemaining(state.remainingSec);
        setPhase('active');
      } catch (e: any) {
        setErrorMsg(e?.message || 'Could not start the exam.');
        setPhase('error');
      }
    })();
  }, [user, id]);

  const submit = useCallback(async (auto = false) => {
    if (submittingRef.current || !attempt) return;
    submittingRef.current = true;
    try {
      const res = await apiPost<ResultData>(`/attempts/${attempt.attemptId}/submit`, {});
      setResult(res);
      setPhase('submitted');
      if (auto) toast('Time is up — your exam was submitted automatically.', 'info');
    } catch (e: any) {
      toast(e?.message || 'Submit failed', 'error');
      submittingRef.current = false;
    }
  }, [attempt, toast]);

  // ── Countdown ──
  useEffect(() => {
    if (phase !== 'active') return;
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(t);
          submit(true);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase, submit]);

  // ── Secure mode: report tab switches ──
  useEffect(() => {
    if (phase !== 'active' || !attempt?.secureMode) return;
    const onHide = () => {
      if (document.visibilityState === 'hidden') {
        apiPost(`/attempts/${attempt.attemptId}/violations`, {}).catch(() => {});
        toast('Leaving the exam tab is recorded in secure mode.', 'error');
      }
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [phase, attempt, toast]);

  async function selectOption(questionId: string, optionId: string) {
    setAnswers((a) => ({ ...a, [questionId]: optionId }));
    try {
      await apiPatch(`/attempts/${attempt!.attemptId}/answers`, { questionId, selectedOptionId: optionId });
    } catch {
      /* answer kept locally; will retry on next change */
    }
  }

  function toggleMark(questionId: string) {
    setMarked((m) => {
      const next = new Set(m);
      next.has(questionId) ? next.delete(questionId) : next.add(questionId);
      return next;
    });
  }

  // ── Render states ──
  if (phase === 'loading' || authLoading) {
    return <CenterMessage><Spinner className="h-6 w-6 text-primary" /> <span className="ml-2">Preparing your exam…</span></CenterMessage>;
  }
  if (phase === 'error') {
    return (
      <CenterMessage>
        <Card className="max-w-sm text-center">
          <CardContent className="p-8">
            <AlertTriangle className="mx-auto h-10 w-10 text-destructive" />
            <h2 className="mt-4 font-semibold">Can&apos;t start this exam</h2>
            <p className="mt-2 text-sm text-muted-foreground">{errorMsg}</p>
            <Button className="mt-5" onClick={() => router.push('/exams')}>Back to exams</Button>
          </CardContent>
        </Card>
      </CenterMessage>
    );
  }
  if (phase === 'submitted' && result) {
    return <ResultView result={result} onDone={() => router.push('/exams')} />;
  }
  if (!attempt) return null;

  if (attempt.questions.length === 0) {
    return (
      <CenterMessage>
        <Card className="max-w-sm text-center">
          <CardContent className="p-8">
            <AlertTriangle className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="mt-4 font-semibold">No questions yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">This exam has no questions attached. Your teacher needs to add questions from the bank before it can be taken.</p>
            <Button className="mt-5" onClick={() => router.push('/exams')}>Back to exams</Button>
          </CardContent>
        </Card>
      </CenterMessage>
    );
  }

  const q = attempt.questions[Math.min(index, attempt.questions.length - 1)];
  const answeredCount = Object.values(answers).filter(Boolean).length;
  const low = remaining < 120;

  return (
    <div className="min-h-screen bg-secondary/20">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-4 sm:px-6">
        <Logo />
        <div className="flex items-center gap-3">
          {attempt.secureMode && <Badge variant="destructive"><ShieldAlert className="h-3.5 w-3.5" /> Secure mode</Badge>}
          <div className={cn('flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-sm font-semibold tabular-nums',
            low ? 'border-destructive/40 bg-destructive/10 text-destructive animate-pulse' : 'bg-background')}>
            <Clock className="h-4 w-4" /> {fmtTime(remaining)}
          </div>
          <Button size="sm" onClick={() => setConfirmOpen(true)}>Submit</Button>
        </div>
      </header>

      <div className="container grid gap-6 py-6 lg:grid-cols-[1fr_280px]">
        {/* Question */}
        <Card>
          <CardContent className="p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Question {index + 1} of {attempt.questions.length}</span>
              <div className="flex items-center gap-2">
                <Badge variant="muted">{q.subject}</Badge>
                <Badge variant="outline">{q.marks} mark{q.marks > 1 ? 's' : ''}</Badge>
                <button onClick={() => toggleMark(q.questionId)}
                  className={cn('flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium',
                    marked.has(q.questionId) ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-600' : 'text-muted-foreground hover:bg-secondary')}>
                  <Flag className="h-3.5 w-3.5" /> {marked.has(q.questionId) ? 'Marked' : 'Mark'}
                </button>
              </div>
            </div>

            <p className="mt-5 text-lg font-medium leading-relaxed">{q.stem}</p>

            <div className="mt-6 space-y-3">
              {q.options.map((o) => {
                const selected = answers[q.questionId] === o.id;
                return (
                  <button key={o.id} onClick={() => selectOption(q.questionId, o.id)}
                    className={cn('flex w-full items-center gap-3 rounded-lg border p-4 text-left text-sm transition-colors',
                      selected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-secondary')}>
                    <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                      selected ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground')}>
                      {o.label}
                    </span>
                    {o.text}
                  </button>
                );
              })}
            </div>

            <div className="mt-8 flex items-center justify-between">
              <Button variant="outline" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <span className="text-xs text-muted-foreground">Autosaved ✓</span>
              {index < attempt.questions.length - 1 ? (
                <Button onClick={() => setIndex((i) => Math.min(attempt.questions.length - 1, i + 1))}>
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button variant="accent" onClick={() => setConfirmOpen(true)}>Finish</Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Palette */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Questions</span>
                <span className="text-muted-foreground">{answeredCount}/{attempt.questions.length}</span>
              </div>
              <div className="mt-4 grid grid-cols-6 gap-2 lg:grid-cols-5">
                {attempt.questions.map((qq, i) => {
                  const ans = !!answers[qq.questionId];
                  const mk = marked.has(qq.questionId);
                  return (
                    <button key={qq.questionId} onClick={() => setIndex(i)}
                      className={cn('flex h-9 w-9 items-center justify-center rounded-md border text-xs font-semibold transition-colors',
                        i === index && 'ring-2 ring-primary ring-offset-1',
                        mk ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-600'
                          : ans ? 'border-success/40 bg-success/10 text-success'
                          : 'text-muted-foreground hover:bg-secondary')}>
                      {i + 1}
                    </button>
                  );
                })}
              </div>
              <div className="mt-5 space-y-1.5 text-xs text-muted-foreground">
                <Legend className="bg-success/10 text-success border-success/40" label="Answered" />
                <Legend className="bg-yellow-500/10 text-yellow-600 border-yellow-500/40" label="Marked" />
                <Legend className="text-muted-foreground" label="Not answered" />
              </div>
              <Button className="mt-5 w-full" onClick={() => setConfirmOpen(true)}>Submit exam</Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <h2 className="text-lg font-semibold">Submit your exam?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          You&apos;ve answered <span className="font-semibold text-foreground">{answeredCount}</span> of {attempt.questions.length} questions.
          {answeredCount < attempt.questions.length && ' Unanswered questions will be marked as skipped.'}
        </p>
        <div className="mt-6 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => setConfirmOpen(false)}>Keep working</Button>
          <Button className="flex-1" onClick={() => { setConfirmOpen(false); submit(false); }}>Submit now</Button>
        </div>
      </Dialog>
    </div>
  );
}

function ResultView({ result, onDone }: { result: ResultData; onDone: () => void }) {
  const r = result.result;
  const total = result.exam.totalMarks || 1;
  const pct = Math.round((result.score / total) * 100);
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/20 p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="mt-5 text-2xl font-bold">Exam submitted!</h1>
          <p className="mt-1 text-sm text-muted-foreground">{result.exam.title}</p>

          <div className="mt-6 rounded-xl border bg-secondary/30 p-6">
            <div className="text-4xl font-extrabold text-primary">{result.score}<span className="text-xl text-muted-foreground">/{result.exam.totalMarks}</span></div>
            <div className="mt-1 text-sm text-muted-foreground">{pct}% score</div>
          </div>

          {r && (
            <div className="mt-5 grid grid-cols-3 gap-3">
              <Stat icon={CheckCircle2} className="text-success" label="Correct" value={r.correct} />
              <Stat icon={XCircle} className="text-destructive" label="Wrong" value={r.wrong} />
              <Stat icon={MinusCircle} className="text-muted-foreground" label="Skipped" value={r.skipped} />
            </div>
          )}

          <Button className="mt-7 w-full" onClick={onDone}>Back to exams</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ icon: Icon, className, label, value }: { icon: React.ElementType; className: string; label: string; value: number }) {
  return (
    <div className="rounded-lg border p-3">
      <Icon className={cn('mx-auto h-5 w-5', className)} />
      <div className="mt-1 text-lg font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function Legend({ className, label }: { className?: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn('h-4 w-4 rounded border', className)} />
      {label}
    </div>
  );
}

function CenterMessage({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">{children}</div>;
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
