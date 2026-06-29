'use client';

import Link from 'next/link';
import { useState } from 'react';
import { MessageSquare, Plus, MessagesSquare, Eye, CheckCircle2 } from 'lucide-react';
import { PageHeader, EmptyState } from '@/components/app/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/toast';
import { useApi } from '@/lib/use-api';
import { apiPost } from '@/lib/api';
import { fromNow } from '@/lib/utils';

interface Thread {
  id: string; title: string; body: string; viewCount: number; createdAt: string;
  author: { name: string; role: string }; _count: { posts: number };
}

export default function ForumPage() {
  const { data, loading, refetch } = useApi<Thread[]>('/forum/threads');
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', body: '' });
  const [saving, setSaving] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPost('/forum/threads', form);
      toast('Question posted!', 'success');
      setOpen(false);
      setForm({ title: '', body: '' });
      refetch();
    } catch (e: any) {
      toast(e?.message || 'Could not post', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Discussion Forum"
        subtitle="Ask doubts and get teacher-verified answers."
        action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Ask a question</Button>}
      />

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : data && data.length > 0 ? (
        <div className="space-y-3">
          {data.map((t) => (
            <Link key={t.id} href={`/forum/${t.id}`}>
              <Card className="transition-colors hover:border-primary/40">
                <CardContent className="flex items-start gap-4 p-5">
                  <Avatar name={t.author.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-semibold">{t.title}</h3>
                      {(t.author.role === 'TEACHER' || t.author.role === 'ADMIN') && (
                        <Badge variant="success"><CheckCircle2 className="h-3 w-3" /> {t.author.role === 'TEACHER' ? 'Teacher' : 'Staff'}</Badge>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{t.body}</p>
                    <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{t.author.name}</span>
                      <span>{fromNow(t.createdAt)}</span>
                      <span className="flex items-center gap-1"><MessagesSquare className="h-3.5 w-3.5" /> {t._count.posts}</span>
                      <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {t.viewCount}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState icon={MessageSquare} title="No discussions yet" desc="Start the conversation — ask the first question."
          action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Ask a question</Button>} />
      )}

      <Dialog open={open} onClose={() => setOpen(false)}>
        <h2 className="text-lg font-semibold">Ask a question</h2>
        <form onSubmit={create} className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. How to solve projectile range problems?" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="body">Details</Label>
            <Textarea id="body" value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              placeholder="Describe your doubt…" required />
          </div>
          <Button type="submit" className="w-full" disabled={saving}>{saving ? <Spinner /> : 'Post question'}</Button>
        </form>
      </Dialog>
    </div>
  );
}
