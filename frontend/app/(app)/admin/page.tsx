'use client';

import Link from 'next/link';
import { Users, DollarSign, Activity, GraduationCap, CreditCard, BookCheck, TrendingUp, UserCog, BookOpen, ClipboardList, Library, LifeBuoy, ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi } from '@/lib/use-api';
import { useAuth } from '@/lib/auth';
import { formatBdt } from '@/lib/utils';

interface Overview {
  users: { total: number; students: number; teachers: number; newLast30Days: number };
  revenue: { totalBdt: number; successfulPayments: number };
  engagement: { activeSubscriptions: number; examAttempts: number };
}

interface RevenuePoint { day: string; revenueBdt: number; }

const MANAGE = [
  { href: '/admin/users', icon: UserCog, label: 'Users' },
  { href: '/admin/courses', icon: BookOpen, label: 'Courses' },
  { href: '/admin/exams', icon: ClipboardList, label: 'Exams' },
  { href: '/admin/payments', icon: CreditCard, label: 'Payments' },
  { href: '/admin/content', icon: Library, label: 'Content' },
  { href: '/admin/support', icon: LifeBuoy, label: 'Support' },
];

export default function AdminPage() {
  const { user } = useAuth();
  const { data, loading } = useApi<Overview>('/admin/analytics/overview');
  const { data: revenue } = useApi<RevenuePoint[]>('/admin/analytics/revenue');

  const kpis = data
    ? [
        { icon: Users, label: 'Total users', value: data.users.total.toLocaleString(), tint: 'text-primary bg-primary/10' },
        { icon: DollarSign, label: 'Revenue', value: formatBdt(data.revenue.totalBdt), tint: 'text-success bg-success/10' },
        { icon: BookCheck, label: 'Active subscriptions', value: data.engagement.activeSubscriptions.toLocaleString(), tint: 'text-accent bg-accent/10' },
        { icon: Activity, label: 'Exam attempts', value: data.engagement.examAttempts.toLocaleString(), tint: 'text-primary bg-primary/10' },
      ]
    : [];

  return (
    <div>
      <PageHeader title="Admin Overview" subtitle={`Welcome, ${user?.name}. Platform health at a glance.`} />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((k) => (
              <Card key={k.label}>
                <CardContent className="flex items-center gap-4 p-5">
                  <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${k.tint}`}><k.icon className="h-6 w-6" /></span>
                  <div>
                    <div className="text-2xl font-bold">{k.value}</div>
                    <div className="text-xs text-muted-foreground">{k.label}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader><CardTitle>User breakdown</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Row icon={GraduationCap} label="Students" value={data?.users.students ?? 0} />
                <Row icon={Users} label="Teachers" value={data?.users.teachers ?? 0} />
                <Row icon={TrendingUp} label="New (30 days)" value={data?.users.newLast30Days ?? 0} highlight />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Payments</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Row icon={CreditCard} label="Successful payments" value={data?.revenue.successfulPayments ?? 0} />
                <div className="rounded-lg border bg-secondary/30 p-4">
                  <div className="text-xs text-muted-foreground">Total revenue</div>
                  <div className="mt-1 text-2xl font-bold text-success">{formatBdt(data?.revenue.totalBdt ?? 0)}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Engagement</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Row icon={BookCheck} label="Active subscriptions" value={data?.engagement.activeSubscriptions ?? 0} />
                <Row icon={Activity} label="Exam attempts" value={data?.engagement.examAttempts ?? 0} />
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader><CardTitle>Revenue (last 30 days)</CardTitle></CardHeader>
            <CardContent>
              <RevenueChart points={revenue ?? []} />
            </CardContent>
          </Card>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {MANAGE.map((m) => (
              <Link key={m.href} href={m.href}>
                <Card className="group transition-all hover:-translate-y-1 hover:shadow-md">
                  <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground"><m.icon className="h-5 w-5" /></span>
                    <span className="text-sm font-medium">{m.label}</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function RevenueChart({ points }: { points: RevenuePoint[] }) {
  if (points.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No revenue recorded in this period yet.</p>;
  }
  const max = Math.max(...points.map((p) => p.revenueBdt), 1);
  return (
    <div className="flex h-44 items-end gap-1.5">
      {points.map((p) => (
        <div key={p.day} className="group relative flex flex-1 flex-col items-center justify-end">
          <div className="w-full rounded-t bg-primary/80 transition-colors group-hover:bg-primary" style={{ height: `${Math.max(4, (p.revenueBdt / max) * 100)}%` }} />
          <div className="pointer-events-none absolute -top-7 hidden whitespace-nowrap rounded bg-foreground px-2 py-1 text-xs text-background group-hover:block">
            {formatBdt(p.revenueBdt)}
          </div>
        </div>
      ))}
    </div>
  );
}

function Row({ icon: Icon, label, value, highlight }: { icon: React.ElementType; label: string; value: number; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-muted-foreground"><Icon className="h-4 w-4" /> {label}</div>
      <span className={`font-semibold ${highlight ? 'text-success' : ''}`}>{value.toLocaleString()}</span>
    </div>
  );
}
