'use client';

import { useState } from 'react';
import { FileText, Calendar, Hash, CheckCircle2, Clock, MessageSquare } from 'lucide-react';
import { PageHeader, EmptyState } from '@/components/app/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { useApi } from '@/lib/use-api';
import { apiPost } from '@/lib/api';
import { fromNow } from '@/lib/utils';
import type { Assignment, Submission } from '@/lib/types';

const statusBadge: Record<string, { label: string; variant: 'success' | 'accent' | 'muted' }> = {
  GRADED: { label: 'Graded', variant: 'success' },
  SUBMITTED: { label: 'Submitted', variant: 'accent' },
  RETURNED: { label: 'Returned', variant: 'muted' },
};

export default function AssignmentsPage() {
  const { data, loading } = useApi<Assignment[]>('/assignments');
  const [active, setActive] = useState<Assignment | null>(null);

  return (
    <div>
      <PageHeader title="Assignments" subtitle="Submit your work and review feedback from your teachers." />
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44" />)}
        </div>
      ) : data && data.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((a) => (
            <Card key={a.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col p-5">
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><FileText className="h-5 w-5" /></span>
                  {a.autoGrade && <Badge variant="muted">Auto-graded</Badge>}
                </div>
                <h3 className="mt-4 font-semibold">{a.title}</h3>
                {a.instructions && <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted-foreground">{a.instructions}</p>}
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Hash className="h-3.5 w-3.5" /> {a.maxMarks} marks</span>
                  {a.dueAt && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> due {fromNow(a.dueAt)}</span>}
                </div>
                <Button className="mt-4" size="sm" onClick={() => setActive(a)}>Open assignment</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={FileText} title="No assignments yet" desc="Assignments set by your teachers will appear here." />
      )}

      {active && <SubmitDialog assignment={active} onClose={() => setActive(null)} />}
    </div>
  );
}

function SubmitDialog({ assignment, onClose }: { assignment: Assignment; onClose: () => void }) {
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { data: submission, loading, refetch, setData } = useApi<Submission | null>(`/assignments/${assignment.id}/my-submission`);

  async function submit() {
    if (!text.trim()) return toast('Write your answer first', 'error');
    setSubmitting(true);
    try {
      const res = await apiPost<Submission>(`/assignments/${assignment.id}/submissions`, { text });
      setData(res);
      setText('');
      toast(res.status === 'GRADED' ? 'Submitted and auto-graded!' : 'Submitted for grading', 'success');
      refetch();
    } catch (e: any) {
      toast(e?.message || 'Submission failed', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  const badge = submission ? statusBadge[submission.status] : null;

  return (
    <Dialog open onClose={onClose} className="max-w-lg">
      <h2 className="pr-6 text-lg font-semibold">{assignment.title}</h2>
      {assignment.instructions && <p className="mt-1 text-sm text-muted-foreground">{assignment.instructions}</p>}
      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Hash className="h-3.5 w-3.5" /> {assignment.maxMarks} marks</span>
        {assignment.dueAt && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> due {fromNow(assignment.dueAt)}</span>}
      </div>

      {loading ? (
        <Skeleton className="mt-5 h-24" />
      ) : submission ? (
        <div className="mt-5 rounded-lg border bg-secondary/30 p-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-medium">
              {submission.status === 'GRADED' ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Clock className="h-4 w-4 text-accent" />}
              Your submission
            </span>
            {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
          </div>
          {submission.text && <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{submission.text}</p>}
          {submission.status === 'GRADED' && (
            <div className="mt-3 border-t pt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-success">{submission.marks}</span>
                <span className="text-sm text-muted-foreground">/ {assignment.maxMarks}</span>
              </div>
              {submission.feedback && (
                <p className="mt-2 flex items-start gap-2 text-sm">
                  <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>{submission.feedback}</span>
                </p>
              )}
            </div>
          )}
          <button onClick={() => setData(null)} className="mt-3 text-xs font-medium text-primary hover:underline">Resubmit →</button>
        </div>
      ) : (
        <div className="mt-5">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your answer here…" className="min-h-[140px]" />
          <Button className="mt-4 w-full" onClick={submit} disabled={submitting}>
            {submitting ? <Spinner /> : 'Submit assignment'}
          </Button>
        </div>
      )}
    </Dialog>
  );
}
