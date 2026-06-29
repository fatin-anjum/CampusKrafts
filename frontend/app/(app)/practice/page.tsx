'use client';

import { useMemo, useState } from 'react';
import { Brain, Search, CheckCircle2, XCircle, Lightbulb } from 'lucide-react';
import { PageHeader, EmptyState } from '@/components/app/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi } from '@/lib/use-api';
import { apiPost } from '@/lib/api';
import { cn } from '@/lib/utils';

interface PracticeQuestion {
  id: string; subject: string; topic: string; difficulty: number; stem: string;
  options: { id: string; label: string; text: string }[];
}
interface CheckResult { correct: boolean; correctOptionId: string | null; explanation: string | null; }

export default function PracticePage() {
  const [subject, setSubject] = useState('');
  const [query, setQuery] = useState('');
  const path = useMemo(() => (query ? `/questions/practice?subject=${encodeURIComponent(query)}` : '/questions/practice'), [query]);
  const { data, loading } = useApi<PracticeQuestion[]>(path);

  return (
    <div>
      <PageHeader title="Practice" subtitle="Sharpen up with questions from the bank — instant answers and explanations." />

      <form
        className="mb-6 flex gap-2"
        onSubmit={(e) => { e.preventDefault(); setQuery(subject.trim()); }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Filter by subject (e.g. Physics)…" className="pl-9" />
        </div>
        <Button type="submit" variant="outline">Search</Button>
      </form>

      {loading ? (
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48" />)}</div>
      ) : data && data.length > 0 ? (
        <div className="space-y-4">
          {data.map((q, i) => <PracticeCard key={q.id} q={q} index={i} />)}
        </div>
      ) : (
        <EmptyState icon={Brain} title="No practice questions yet" desc="Questions added to the bank by your teachers will appear here." />
      )}
    </div>
  );
}

function PracticeCard({ q, index }: { q: PracticeQuestion; index: number }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [checking, setChecking] = useState(false);

  async function check() {
    if (!selected) return;
    setChecking(true);
    try {
      const res = await apiPost<CheckResult>('/questions/check', { questionId: q.id, selectedOptionId: selected });
      setResult(res);
    } catch {
      /* ignore */
    } finally {
      setChecking(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Question {index + 1}</span>
          <div className="flex items-center gap-2">
            <Badge variant="muted">{q.subject}</Badge>
            <Badge variant="outline">{q.topic}</Badge>
            <Badge variant="outline">difficulty {q.difficulty}</Badge>
          </div>
        </div>
        <p className="mt-4 text-base font-medium leading-relaxed">{q.stem}</p>

        <div className="mt-5 space-y-2.5">
          {q.options.map((o) => {
            const isSelected = selected === o.id;
            const isCorrect = result && result.correctOptionId === o.id;
            const isWrongPick = result && isSelected && !result.correct;
            return (
              <button
                key={o.id}
                disabled={!!result}
                onClick={() => setSelected(o.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg border p-3.5 text-left text-sm transition-colors disabled:cursor-default',
                  !result && isSelected && 'border-primary bg-primary/5 ring-1 ring-primary',
                  !result && !isSelected && 'hover:bg-secondary',
                  isCorrect && 'border-success/50 bg-success/10',
                  isWrongPick && 'border-destructive/50 bg-destructive/10',
                )}
              >
                <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                  isSelected && !result ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground')}>
                  {o.label}
                </span>
                <span className="flex-1">{o.text}</span>
                {isCorrect && <CheckCircle2 className="h-4 w-4 text-success" />}
                {isWrongPick && <XCircle className="h-4 w-4 text-destructive" />}
              </button>
            );
          })}
        </div>

        {result ? (
          <div className={cn('mt-4 rounded-lg border p-4 text-sm', result.correct ? 'border-success/40 bg-success/5' : 'border-destructive/40 bg-destructive/5')}>
            <p className={cn('flex items-center gap-2 font-medium', result.correct ? 'text-success' : 'text-destructive')}>
              {result.correct ? <><CheckCircle2 className="h-4 w-4" /> Correct!</> : <><XCircle className="h-4 w-4" /> Not quite.</>}
            </p>
            {result.explanation && (
              <p className="mt-2 flex items-start gap-2 text-muted-foreground">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" /> {result.explanation}
              </p>
            )}
          </div>
        ) : (
          <Button className="mt-4" size="sm" onClick={check} disabled={!selected || checking}>
            {checking ? 'Checking…' : 'Check answer'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
