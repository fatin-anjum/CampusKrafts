import Link from 'next/link';
import {
  Radio, Video, FileText, ClipboardCheck, Trophy, Brain, MessageSquare, BarChart3,
  CheckCircle2, ArrowRight, Star, Clock, Users, ShieldCheck,
} from 'lucide-react';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatBdt } from '@/lib/utils';
import { fetchLanding } from '@/lib/landing';

const STAT_ICONS = [Users, Video, Trophy, Star];

const features = [
  { icon: Radio, title: 'Live Classes', desc: 'Interactive built-in classroom with whiteboard, screen share, chat, and raise-hand — plus Zoom & Meet support.' },
  { icon: Video, title: 'Recorded Lectures', desc: 'Watch anytime, resume where you left off, at adaptive bitrate tuned for 3G/4G.' },
  { icon: FileText, title: 'Lecture Sheets', desc: 'Topic & chapter-wise PDFs, handouts, and formula sheets — download instantly.' },
  { icon: ClipboardCheck, title: 'Online Exams', desc: 'MCQ & written exams with negative marking, shuffling, auto-submit, and secure mode.' },
  { icon: Trophy, title: 'Mock Tests & Ranking', desc: 'Weekly mocks and grand tests with live national leaderboards and percentile.' },
  { icon: Brain, title: 'Adaptive Practice', desc: 'AI-tuned practice that targets your weak topics and schedules smart revision.' },
  { icon: MessageSquare, title: 'Discussion Forum', desc: 'Ask doubts, get teacher-verified answers, and learn together.' },
  { icon: BarChart3, title: 'Progress Tracking', desc: 'See completion, mastery per topic, and exactly what to study next.' },
];

const curriculum = [
  { subject: 'Physics', topics: ['Vectors', 'Newtonian Mechanics', 'Thermodynamics', 'Electromagnetism', 'Modern Physics'] },
  { subject: 'Chemistry', topics: ['Periodic Table', 'Chemical Bonding', 'Organic Basics', 'Reaction Kinetics', 'Electrochemistry'] },
  { subject: 'Mathematics', topics: ['Calculus', 'Trigonometry', 'Coordinate Geometry', 'Vectors & Matrices', 'Probability'] },
  { subject: 'English & GK', topics: ['Grammar', 'Vocabulary', 'Comprehension', 'Current Affairs', 'Bangladesh Studies'] },
];

const steps = [
  { n: '01', title: 'Enroll in the Crash Course', desc: 'Pay securely with bKash, Nagad, Rocket, SSLCommerz, or card — access unlocks instantly.' },
  { n: '02', title: 'Learn live & on-demand', desc: 'Attend live classes, watch recordings, and download sheets at your own pace.' },
  { n: '03', title: 'Test, rank & improve', desc: 'Sit mock tests, track your national rank, and let adaptive practice fix your weak spots.' },
];

const testimonials = [
  { name: 'Tasnim A.', result: 'DU — A Unit', quote: 'The weekly mocks felt exactly like the real exam. Watching my rank climb kept me motivated every single week.' },
  { name: 'Rafiul H.', result: 'BUET', quote: 'Adaptive practice knew my weak topics better than I did. The formula sheets alone were worth it.' },
  { name: 'Nusrat J.', result: 'Medical (DMC)', quote: 'Live classes with raise-hand made it feel personal. Teachers actually answered my doubts in the forum.' },
];

export default async function LandingPage() {
  const content = await fetchLanding();
  const PRICE = content.priceBdt;
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="gradient-hero relative overflow-hidden">
          <div className="absolute inset-0 ring-grid opacity-[0.4] [mask-image:radial-gradient(60%_50%_at_50%_0%,black,transparent)]" />
          <div className="container relative grid gap-12 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
            <div className="animate-fade-up">
              <Badge variant="accent" className="mb-5">
                {content.announcement}
              </Badge>
              <h1 className="text-balance text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                {content.heroTitle} <span className="gradient-text">{content.heroHighlight}</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg text-muted-foreground">
                {content.heroSubtitle}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/register">
                  <Button size="lg" className="w-full sm:w-auto">
                    {content.primaryCta} — {formatBdt(PRICE)} <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/courses">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    Explore the course
                  </Button>
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" /> No prior experience needed</span>
                <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-success" /> Secure payments</span>
                <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-success" /> Lifetime access</span>
              </div>
            </div>

            {/* Hero card */}
            <div className="animate-fade-up [animation-delay:120ms]">
              <Card className="overflow-hidden border-border/60 shadow-xl">
                <div className="flex items-center justify-between border-b bg-secondary/40 px-5 py-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
                    Live now · Physics: Vectors
                  </div>
                  <Badge variant="destructive">REC</Badge>
                </div>
                <CardContent className="space-y-4 p-5">
                  <div className="aspect-video rounded-lg bg-gradient-to-br from-primary/15 to-accent/15 ring-1 ring-border flex items-center justify-center">
                    <Radio className="h-10 w-10 text-primary/60" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[['Rank', '#142'], ['Percentile', '92nd'], ['Progress', '62%']].map(([k, v]) => (
                      <div key={k} className="rounded-lg border bg-background p-3 text-center">
                        <div className="text-lg font-bold">{v}</div>
                        <div className="text-xs text-muted-foreground">{k}</div>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-lg border bg-background p-4">
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium">Weekly Mock #7</span>
                      <Badge variant="success">Open</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" /> 5,310 competing · ends Fri 9:00 PM
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="border-y bg-secondary/30">
          <div className="container grid grid-cols-2 gap-8 py-10 md:grid-cols-4">
            {content.stats.map((s, i) => {
              const Icon = STAT_ICONS[i] ?? Users;
              return (
                <div key={s.label + i} className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-xl font-bold">{s.value}</div>
                    <div className="text-sm text-muted-foreground">{s.label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="container py-20">
          <div className="mx-auto max-w-2xl text-center">
            <Badge className="mb-4">Everything in one place</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Built to get you admitted</h2>
            <p className="mt-4 text-muted-foreground">
              A complete admission-prep toolkit — from your first live class to your final mock test.
            </p>
          </div>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <Card key={f.title} className="group transition-all hover:-translate-y-1 hover:shadow-md">
                <CardContent className="p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <f.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="border-y bg-secondary/30">
          <div className="container py-20">
            <div className="mx-auto max-w-2xl text-center">
              <Badge variant="accent" className="mb-4">How it works</Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Three steps to your seat</h2>
            </div>
            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {steps.map((s) => (
                <div key={s.n} className="relative rounded-xl border bg-card p-7">
                  <div className="text-4xl font-extrabold text-primary/20">{s.n}</div>
                  <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Curriculum */}
        <section id="curriculum" className="container py-20">
          <div className="mx-auto max-w-2xl text-center">
            <Badge className="mb-4">Curriculum</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">What you&apos;ll master</h2>
            <p className="mt-4 text-muted-foreground">Full coverage across every admission subject, taught by top instructors.</p>
          </div>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {curriculum.map((c) => (
              <Card key={c.subject}>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-primary">{c.subject}</h3>
                  <ul className="mt-4 space-y-2.5">
                    {c.topics.map((t) => (
                      <li key={t} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-success" /> {t}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section className="border-y bg-secondary/30">
          <div className="container py-20">
            <div className="mx-auto max-w-2xl text-center">
              <Badge variant="accent" className="mb-4">Results</Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Students who got in</h2>
            </div>
            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {testimonials.map((t) => (
                <Card key={t.name}>
                  <CardContent className="p-6">
                    <div className="flex gap-0.5 text-yellow-500">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-current" />
                      ))}
                    </div>
                    <p className="mt-4 text-sm leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                    <div className="mt-5 flex items-center justify-between">
                      <span className="font-semibold">{t.name}</span>
                      <Badge variant="success">{t.result}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="container py-20">
          <div className="mx-auto max-w-2xl text-center">
            <Badge className="mb-4">Pricing</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">One course. Everything included.</h2>
          </div>
          <div className="mx-auto mt-14 max-w-lg">
            <Card className="relative overflow-hidden border-primary/30 shadow-xl">
              <div className="absolute right-0 top-0 rounded-bl-xl bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">
                Most popular
              </div>
              <CardContent className="p-8">
                <h3 className="text-lg font-semibold">Admission Crash Course 2026</h3>
                <div className="mt-4 flex items-end gap-2">
                  <span className="text-5xl font-extrabold">{formatBdt(PRICE)}</span>
                  <span className="mb-1 text-muted-foreground">one-time</span>
                </div>
                <ul className="mt-6 space-y-3">
                  {[
                    'All live classes + recordings',
                    'Every lecture sheet & formula sheet',
                    'Unlimited online exams & practice',
                    'Weekly mocks + grand tests with ranking',
                    'Adaptive practice & revision scheduler',
                    'Discussion forum with teacher answers',
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm">
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-success" /> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="mt-8 block">
                  <Button size="lg" className="w-full">
                    Enroll now <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Pay with bKash · Nagad · Rocket · SSLCommerz · Card
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Final CTA */}
        <section id="contact" className="container pb-20">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-accent px-8 py-14 text-center text-white">
            <div className="absolute inset-0 ring-grid opacity-20" />
            <div className="relative">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{content.finalCtaTitle}</h2>
              <p className="mx-auto mt-4 max-w-xl text-white/90">
                {content.finalCtaSubtitle}
              </p>
              <Link href="/register" className="mt-8 inline-block">
                <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90">
                  Get started for {formatBdt(PRICE)}
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
