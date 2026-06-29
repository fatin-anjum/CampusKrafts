'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send, UserPlus, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { useApi } from '@/lib/use-api';
import { apiPost, apiPatch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { fromNow } from '@/lib/utils';
import { ticketStatusVariant } from '@/lib/support';
import type { TicketDetail } from '@/lib/types';

const STATUSES = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

export default function TicketThreadPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { user } = useAuth();
  const { toast } = useToast();
  const { data, loading, refetch } = useApi<TicketDetail>(`/support/tickets/${id}`);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const isStaff = user?.role === 'ADMIN' || user?.role === 'MODERATOR';
  const backHref = isStaff ? '/admin/support' : '/support';

  async function send() {
    if (!body.trim()) return;
    setSending(true);
    try {
      await apiPost(`/support/tickets/${id}/messages`, { body });
      setBody('');
      refetch();
    } catch (e: any) {
      toast(e?.message || 'Could not send', 'error');
    } finally {
      setSending(false);
    }
  }

  async function setStatus(status: string) {
    try {
      await apiPatch(`/support/tickets/${id}/status`, { status });
      toast('Status updated', 'success');
      refetch();
    } catch (e: any) {
      toast(e?.message || 'Could not update status', 'error');
    }
  }

  async function assignToMe() {
    if (!user) return;
    try {
      await apiPatch(`/support/tickets/${id}/assign`, { assigneeId: user.id });
      toast('Assigned to you', 'success');
      refetch();
    } catch (e: any) {
      toast(e?.message || 'Could not assign', 'error');
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={backHref} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to tickets
      </Link>

      {loading ? (
        <Skeleton className="h-96" />
      ) : data ? (
        <>
          <Card className="mb-4">
            <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-xl font-bold">{data.subject}</h1>
                <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="muted">{data.category}</Badge>
                  <span>{data.priority.toLowerCase()} priority</span>
                  {data.assignee && <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> {data.assignee.name}</span>}
                </p>
              </div>
              <Badge variant={ticketStatusVariant[data.status] ?? 'muted'}>{data.status.replace('_', ' ')}</Badge>
            </CardContent>
          </Card>

          {isStaff && (
            <Card className="mb-4 border-dashed">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <span className="text-sm font-medium">Staff actions:</span>
                <Select className="sm:max-w-[180px]" value={data.status} onChange={(e) => setStatus(e.target.value)}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </Select>
                <Button variant="outline" size="sm" onClick={assignToMe}><UserPlus className="h-4 w-4" /> Assign to me</Button>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {data.messages.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No messages yet. Start the conversation below.</p>}
            {data.messages.map((m) => {
              const mine = m.senderId === user?.id;
              return (
                <div key={m.id} className={`flex gap-3 ${mine ? 'flex-row-reverse' : ''}`}>
                  <Avatar name={m.sender?.name ?? 'User'} />
                  <div className={`max-w-[75%] rounded-xl border p-3 ${mine ? 'bg-primary text-primary-foreground' : 'bg-card'}`}>
                    <div className={`mb-1 flex items-center gap-2 text-xs ${mine ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                      <span className="font-medium">{m.sender?.name ?? 'User'}</span>
                      {m.sender?.role && <span>· {m.sender.role.toLowerCase()}</span>}
                      <span>· {fromNow(m.createdAt)}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm">{m.body}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <Card className="mt-4">
            <CardContent className="p-4">
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a reply…" />
              <div className="mt-3 flex justify-end">
                <Button onClick={send} disabled={sending}>{sending ? <Spinner /> : <><Send className="h-4 w-4" /> Send reply</>}</Button>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <p className="text-center text-sm text-muted-foreground">Ticket not found.</p>
      )}
    </div>
  );
}
