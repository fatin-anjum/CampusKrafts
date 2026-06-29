'use client';

import { Bell, CheckCheck, Megaphone, CreditCard, Trophy, Radio, Info } from 'lucide-react';
import { PageHeader, EmptyState } from '@/components/app/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi } from '@/lib/use-api';
import { apiPatch } from '@/lib/api';
import { fromNow, cn } from '@/lib/utils';

interface Notification { id: string; type: string; title: string; body?: string; createdAt: string; readAt?: string | null; }

const iconFor: Record<string, React.ElementType> = {
  ANNOUNCEMENT: Megaphone, PAYMENT: CreditCard, MOCK: Trophy, LIVE_CLASS: Radio,
};

export default function NotificationsPage() {
  const { data, loading, refetch, setData } = useApi<Notification[]>('/notifications');

  async function markRead(id: string) {
    setData((cur) => cur?.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)) ?? cur);
    try { await apiPatch(`/notifications/${id}/read`); } catch { refetch(); }
  }

  async function markAll() {
    const unread = data?.filter((n) => !n.readAt) ?? [];
    setData((cur) => cur?.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })) ?? cur);
    await Promise.all(unread.map((n) => apiPatch(`/notifications/${n.id}/read`).catch(() => {})));
  }

  const unreadCount = data?.filter((n) => !n.readAt).length ?? 0;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up.'}
        action={unreadCount > 0 ? <Button variant="outline" onClick={markAll}><CheckCheck className="h-4 w-4" /> Mark all read</Button> : undefined}
      />

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : data && data.length > 0 ? (
        <div className="space-y-2">
          {data.map((n) => {
            const Icon = iconFor[n.type] ?? Info;
            return (
              <Card key={n.id} className={cn('cursor-pointer transition-colors hover:border-primary/40', !n.readAt && 'border-primary/30 bg-primary/5')}
                onClick={() => !n.readAt && markRead(n.id)}>
                <CardContent className="flex items-start gap-3 p-4">
                  <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', n.readAt ? 'bg-secondary text-muted-foreground' : 'bg-primary/10 text-primary')}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn('truncate text-sm', !n.readAt && 'font-semibold')}>{n.title}</p>
                      {!n.readAt && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                    </div>
                    {n.body && <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">{fromNow(n.createdAt)}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={Bell} title="No notifications" desc="Updates about classes, payments, and mocks will appear here." />
      )}
    </div>
  );
}
