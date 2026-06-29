'use client';

import Link from 'next/link';
import { Radio, Trophy, Bell, BookOpen, ArrowRight, Calendar, CheckCircle2, FileText } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi } from '@/lib/use-api';
import { useAuth } from '@/lib/auth';
import { fromNow } from '@/lib/utils';
import type { DashboardData, Assignment } from '@/lib/types';

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, loading } = useApi<DashboardData>('/dashboard/student');
  const { data: assignments } = useApi<Assignment[]>('/assignments');

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.name?.split(' ')[0] ?? 'student'} 👋`}
        subtitle="Here's what's happening with your preparation today."
      />

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Progress + enrolled course */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Course progress</CardTitle>
              <Badge variant={data?.subscriptionStatus === 'ACTIVE' ? 'success' : 'muted'}>
                {data?.subscriptionStatus === 'ACTIVE' ? 'Active' : 'Not enrolled'}
              </Badge>
            </CardHeader>
            <CardContent>
              {data?.enrolledCourse ? (
                <>
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{data.enrolledCourse.title}</p>
                    <span className="text-sm font-semibold text-primary">{data.progress.percent}%</span>
                  </div>
                  <Progress value={data.progress.percent} className="mt-3" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    {data.progress.completed} of {data.progress.totalLessons} lessons completed
                  </p>
                  <Link href={`/courses/${data.enrolledCourse.slug}`} className="mt-4 inline-block">
                    <Button size="sm">Continue learning <ArrowRight className="h-4 w-4" /></Button>
                  </Link>
                </>
              ) : (
                <div className="flex flex-col items-start gap-3">
                  <p className="text-sm text-muted-foreground">You haven&apos;t enrolled yet. Unlock the full Crash Course.</p>
                  <Link href="/courses"><Button size="sm"><BookOpen className="h-4 w-4" /> Browse the course</Button></Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
            <StatCard icon={Radio} label="Upcoming classes" value={data?.upcomingClasses.length ?? 0} tint="text-primary bg-primary/10" />
            <StatCard icon={Trophy} label="Upcoming mocks" value={data?.upcomingMocks.length ?? 0} tint="text-accent bg-accent/10" />
            <Link href="/assignments" className="col-span-2 lg:col-span-1">
              <StatCard icon={FileText} label="Assignments" value={assignments?.length ?? 0} tint="text-success bg-success/10" />
            </Link>
          </div>

          {/* Upcoming classes */}
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Upcoming live classes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {data && data.upcomingClasses.length > 0 ? (
                data.upcomingClasses.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><Radio className="h-4 w-4" /></span>
                      <div>
                        <p className="text-sm font-medium">{c.title}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> {fromNow(c.startAt)}</p>
                      </div>
                    </div>
                    <Badge variant="outline">{c.provider.replace('_', ' ')}</Badge>
                  </div>
                ))
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">No classes scheduled. Check back soon.</p>
              )}
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader className="flex-row items-center gap-2 space-y-0"><Bell className="h-4 w-4 text-muted-foreground" /><CardTitle>Recent activity</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {data && data.recentNotifications.length > 0 ? (
                data.recentNotifications.slice(0, 5).map((n) => (
                  <div key={n.id} className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-muted-foreground">{fromNow(n.createdAt)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">Nothing new yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Mocks */}
          <Card className="lg:col-span-3">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Upcoming mock tests</CardTitle>
              <Link href="/mocks"><Button variant="ghost" size="sm">View all <ArrowRight className="h-4 w-4" /></Button></Link>
            </CardHeader>
            <CardContent>
              {data && data.upcomingMocks.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {data.upcomingMocks.map((m) => (
                    <div key={m.id} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <Badge variant="accent">Mock</Badge>
                        <span className="text-xs text-muted-foreground">{fromNow(m.scheduledAt)}</span>
                      </div>
                      <p className="mt-3 text-sm font-medium">{m.exam?.title ?? 'Mock test'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">No mocks scheduled right now.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tint }: { icon: React.ElementType; label: string; value: number; tint: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tint}`}><Icon className="h-5 w-5" /></span>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Skeleton className="h-44 lg:col-span-2" />
      <Skeleton className="h-44" />
      <Skeleton className="h-60 lg:col-span-2" />
      <Skeleton className="h-60" />
    </div>
  );
}
