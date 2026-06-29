'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Radio, Video, FileText, Lock, PlayCircle, CheckCircle2, ShieldCheck, Clock, Award,
} from 'lucide-react';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EnrollDialog } from '@/components/app/enroll-dialog';
import { useApi } from '@/lib/use-api';
import { useAuth } from '@/lib/auth';
import { formatBdt } from '@/lib/utils';
import type { CourseDetail } from '@/lib/types';

const typeIcon = { LIVE: Radio, RECORDED: Video, SHEET: FileText } as const;

export default function CourseDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const { data, loading, refetch } = useApi<CourseDetail>(slug ? `/courses/${slug}` : null);
  const [enrollOpen, setEnrollOpen] = useState(false);

  const lessonCount = data?.modules.reduce((a, m) => a + m.lessons.length, 0) ?? 0;

  function handleEnrollClick() {
    if (!user) return router.push('/login');
    setEnrollOpen(true);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        {loading ? (
          <div className="container py-12"><Skeleton className="h-96" /></div>
        ) : data ? (
          <>
            {/* Hero */}
            <section className="gradient-hero border-b">
              <div className="container grid gap-8 py-12 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <Badge variant="success" className="mb-4">Published</Badge>
                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{data.title}</h1>
                  <p className="mt-4 max-w-2xl text-muted-foreground">{data.description}</p>
                  <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Video className="h-4 w-4 text-primary" /> {lessonCount} lessons</span>
                    <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-primary" /> Lifetime access</span>
                    <span className="flex items-center gap-1.5"><Award className="h-4 w-4 text-primary" /> Mock tests + ranking</span>
                  </div>
                </div>

                {/* Enroll card */}
                <div>
                  <Card className="overflow-hidden shadow-xl">
                    <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      <PlayCircle className="h-14 w-14 text-primary/50" />
                    </div>
                    <CardContent className="p-6">
                      <div className="text-3xl font-extrabold">{formatBdt(data.priceBdt)}</div>
                      {data.enrolled ? (
                        <>
                          <Badge variant="success" className="mt-4"><CheckCircle2 className="h-3.5 w-3.5" /> You&apos;re enrolled</Badge>
                          <Button className="mt-4 w-full" onClick={() => document.getElementById('curriculum')?.scrollIntoView({ behavior: 'smooth' })}>
                            Go to content
                          </Button>
                        </>
                      ) : (
                        <Button className="mt-4 w-full" size="lg" onClick={handleEnrollClick}>
                          {user ? 'Enroll now' : 'Log in to enroll'}
                        </Button>
                      )}
                      <ul className="mt-5 space-y-2.5 text-sm">
                        {['All live & recorded classes', 'Lecture & formula sheets', 'Exams, mocks & ranking', 'Adaptive practice'].map((f) => (
                          <li key={f} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> {f}</li>
                        ))}
                      </ul>
                      <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                        <ShieldCheck className="h-3.5 w-3.5" /> Secure payment · bKash, Nagad, Card
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </section>

            {/* Curriculum */}
            <section id="curriculum" className="container py-12">
              <h2 className="text-2xl font-bold tracking-tight">Curriculum</h2>
              <p className="mt-1 text-sm text-muted-foreground">{data.modules.length} modules · {lessonCount} lessons</p>
              <div className="mt-6 space-y-4">
                {data.modules.map((m) => (
                  <Card key={m.id}>
                    <CardContent className="p-0">
                      <div className="flex items-center justify-between border-b bg-secondary/30 px-5 py-3">
                        <h3 className="font-semibold">{m.title}</h3>
                        <span className="text-xs text-muted-foreground">{m.lessons.length} lessons</span>
                      </div>
                      <ul className="divide-y">
                        {m.lessons.map((l) => {
                          const Icon = typeIcon[l.type];
                          const locked = !l.isFreePreview && !data.enrolled;
                          return (
                            <li key={l.id} className="flex items-center justify-between px-5 py-3">
                              <div className="flex items-center gap-3">
                                <Icon className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{l.title}</span>
                                {l.isFreePreview && <Badge variant="accent">Free preview</Badge>}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                {l.durationSec ? <span>{Math.round(l.durationSec / 60)} min</span> : null}
                                {locked ? <Lock className="h-4 w-4" /> : <PlayCircle className="h-4 w-4 text-primary" />}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <EnrollDialog
              open={enrollOpen}
              onClose={() => setEnrollOpen(false)}
              courseId={data.id}
              priceBdt={data.priceBdt}
              onEnrolled={refetch}
            />
          </>
        ) : (
          <p className="container py-20 text-center text-muted-foreground">Course not found.</p>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
