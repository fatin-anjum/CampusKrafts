'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronUp, ChevronDown, CheckCircle2, EyeOff, Send, Eye, MessagesSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { useApi } from '@/lib/use-api';
import { apiPost } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { fromNow } from '@/lib/utils';

interface Post {
  id: string; body: string; isAnswer: boolean; createdAt: string;
  author: { name: string; role: string }; _count: { votes: number };
}
interface ThreadDetail {
  id: string; title: string; body: string; viewCount: number; createdAt: string;
  author: { name: string; role: string }; posts: Post[];
}

export default function ThreadPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { user } = useAuth();
  const { toast } = useToast();
  const { data, loading, refetch } = useApi<ThreadDetail>(`/forum/threads/${id}`);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const canMark = user?.role === 'TEACHER' || user?.role === 'ADMIN';
  const canHide = user?.role === 'MODERATOR' || user?.role === 'ADMIN';

  async function reply() {
    if (!body.trim()) return;
    setSending(true);
    try {
      await apiPost(`/forum/threads/${id}/posts`, { body });
      setBody('');
      refetch();
    } catch (e: any) {
      toast(e?.message || 'Could not post reply', 'error');
    } finally {
      setSending(false);
    }
  }

  async function act(path: string, ok: string) {
    try {
      await apiPost(path, {});
      toast(ok, 'success');
      refetch();
    } catch (e: any) {
      toast(e?.message || 'Action failed', 'error');
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/forum" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to forum
      </Link>

      {loading ? (
        <Skeleton className="h-96" />
      ) : data ? (
        <>
          <Card className="mb-4">
            <CardContent className="p-5">
              <h1 className="text-xl font-bold">{data.title}</h1>
              <p className="mt-3 whitespace-pre-wrap text-sm">{data.body}</p>
              <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><Avatar name={data.author.name} className="h-6 w-6" /> {data.author.name}</span>
                <span>{fromNow(data.createdAt)}</span>
                <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {data.viewCount}</span>
                <span className="flex items-center gap-1"><MessagesSquare className="h-3.5 w-3.5" /> {data.posts.length}</span>
              </div>
            </CardContent>
          </Card>

          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">{data.posts.length} repl{data.posts.length === 1 ? 'y' : 'ies'}</h2>
          <div className="space-y-3">
            {data.posts.map((p) => (
              <Card key={p.id} className={p.isAnswer ? 'border-success/40 bg-success/5' : ''}>
                <CardContent className="flex gap-4 p-4">
                  <Voter postId={p.id} initial={p._count.votes} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{p.author.name}</span>
                      {(p.author.role === 'TEACHER' || p.author.role === 'ADMIN') && <Badge variant="success">{p.author.role === 'TEACHER' ? 'Teacher' : 'Staff'}</Badge>}
                      <span>· {fromNow(p.createdAt)}</span>
                      {p.isAnswer && <Badge variant="success"><CheckCircle2 className="h-3 w-3" /> Verified answer</Badge>}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm">{p.body}</p>
                    {(canMark || canHide) && (
                      <div className="mt-3 flex gap-2">
                        {canMark && !p.isAnswer && (
                          <Button variant="outline" size="sm" onClick={() => act(`/forum/posts/${p.id}/mark-answer`, 'Marked as answer')}><CheckCircle2 className="h-4 w-4" /> Mark answer</Button>
                        )}
                        {canHide && (
                          <Button variant="ghost" size="sm" onClick={() => act(`/forum/posts/${p.id}/hide`, 'Post hidden')}><EyeOff className="h-4 w-4" /> Hide</Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {data.posts.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No replies yet. Be the first to help.</p>}
          </div>

          <Card className="mt-4">
            <CardContent className="p-4">
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a reply…" />
              <div className="mt-3 flex justify-end">
                <Button onClick={reply} disabled={sending}>{sending ? <Spinner /> : <><Send className="h-4 w-4" /> Post reply</>}</Button>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <p className="text-center text-sm text-muted-foreground">Thread not found.</p>
      )}
    </div>
  );
}

function Voter({ postId, initial }: { postId: string; initial: number }) {
  const { toast } = useToast();
  const [score, setScore] = useState(initial);

  async function vote(value: 1 | -1) {
    try {
      const res = await apiPost<{ score: number }>(`/forum/posts/${postId}/vote`, { value });
      setScore(res.score);
    } catch (e: any) {
      toast(e?.message || 'Vote failed', 'error');
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button onClick={() => vote(1)} className="text-muted-foreground hover:text-primary" aria-label="Upvote"><ChevronUp className="h-5 w-5" /></button>
      <span className="text-sm font-semibold">{score}</span>
      <button onClick={() => vote(-1)} className="text-muted-foreground hover:text-destructive" aria-label="Downvote"><ChevronDown className="h-5 w-5" /></button>
    </div>
  );
}
