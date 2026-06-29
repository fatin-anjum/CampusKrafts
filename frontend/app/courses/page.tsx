'use client';

import Link from 'next/link';
import { BookOpen, ArrowRight, Radio, Video, FileText } from 'lucide-react';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi } from '@/lib/use-api';
import { formatBdt } from '@/lib/utils';
import type { Course } from '@/lib/types';

export default function CoursesPage() {
  const { data, loading } = useApi<Course[]>('/courses');

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="gradient-hero border-b">
          <div className="container py-14">
            <Badge className="mb-4">Course catalog</Badge>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">The Admission Crash Course</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Everything you need for university admission — live classes, recorded lectures, lecture sheets, exams, and mock tests with national ranking.
            </p>
          </div>
        </section>

        <section className="container py-12">
          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-72" />)}
            </div>
          ) : data && data.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data.map((c) => (
                <Card key={c.id} className="group flex flex-col overflow-hidden transition-all hover:-translate-y-1 hover:shadow-md">
                  <div className="relative aspect-video bg-gradient-to-br from-primary/15 to-accent/15">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <BookOpen className="h-12 w-12 text-primary/40" />
                    </div>
                    <Badge className="absolute left-3 top-3" variant="success">Published</Badge>
                  </div>
                  <CardContent className="flex flex-1 flex-col p-5">
                    <h3 className="font-semibold">{c.title}</h3>
                    <p className="mt-2 line-clamp-2 flex-1 text-sm text-muted-foreground">{c.description}</p>
                    <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Radio className="h-3.5 w-3.5" /> Live</span>
                      <span className="flex items-center gap-1"><Video className="h-3.5 w-3.5" /> Recorded</span>
                      <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> Sheets</span>
                    </div>
                    <div className="mt-5 flex items-center justify-between">
                      <span className="text-xl font-bold">{formatBdt(c.priceBdt)}</span>
                      <Link href={`/courses/${c.slug}`}>
                        <Button size="sm">View course <ArrowRight className="h-4 w-4" /></Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="py-20 text-center text-muted-foreground">No courses available yet.</p>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
