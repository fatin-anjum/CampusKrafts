'use client';

import Link from 'next/link';
import { Library, LifeBuoy, MessageSquare, ArrowRight, Clock } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { useApi } from '@/lib/use-api';
import { useAuth } from '@/lib/auth';
import type { PendingResource, Ticket } from '@/lib/types';

export default function ModeratorPage() {
  const { user } = useAuth();
  const { data: pending } = useApi<PendingResource[]>('/resources/pending');
  const { data: tickets } = useApi<Ticket[]>('/support/tickets');

  const openTickets = tickets?.filter((t) => t.status === 'OPEN' || t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS').length ?? 0;

  const stats = [
    { icon: Library, label: 'Content awaiting review', value: pending?.length ?? 0, tint: 'text-accent bg-accent/10' },
    { icon: LifeBuoy, label: 'Open support tickets', value: openTickets, tint: 'text-primary bg-primary/10' },
    { icon: Clock, label: 'Total tickets', value: tickets?.length ?? 0, tint: 'text-success bg-success/10' },
  ];

  const tools = [
    { href: '/admin/content', icon: Library, title: 'Content Moderation', desc: 'Approve or reject resources before they go live.' },
    { href: '/admin/support', icon: LifeBuoy, title: 'Support Tickets', desc: 'Triage, assign, and resolve user requests.' },
    { href: '/forum', icon: MessageSquare, title: 'Forum', desc: 'Moderate discussions and hide flagged posts.' },
  ];

  return (
    <div>
      <PageHeader title="Moderator Dashboard" subtitle={`Welcome, ${user?.name}. Keep the platform clean and responsive.`} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${s.tint}`}><s.icon className="h-5 w-5" /></span>
              <div><div className="text-2xl font-bold">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((t) => (
          <Link key={t.href} href={t.href}>
            <Card className="group h-full transition-all hover:-translate-y-1 hover:shadow-md">
              <CardContent className="p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <t.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 flex items-center gap-1 font-semibold">{t.title} <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" /></h3>
                <p className="mt-2 text-sm text-muted-foreground">{t.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
