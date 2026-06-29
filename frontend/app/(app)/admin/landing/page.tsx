'use client';

import { useEffect, useState } from 'react';
import { Megaphone, Save, RotateCcw, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/app/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { apiGet, apiPut } from '@/lib/api';
import { DEFAULT_LANDING, type LandingContent } from '@/lib/landing';

export default function AdminLandingPage() {
  const { toast } = useToast();
  const [content, setContent] = useState<LandingContent | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const value = await apiGet<Partial<LandingContent> | null>('/site/landing');
        setContent({
          ...DEFAULT_LANDING,
          ...(value || {}),
          stats: value?.stats?.length ? value.stats : DEFAULT_LANDING.stats,
        });
      } catch {
        setContent(DEFAULT_LANDING);
      }
    })();
  }, []);

  function set<K extends keyof LandingContent>(key: K, val: LandingContent[K]) {
    setContent((c) => (c ? { ...c, [key]: val } : c));
  }
  function setStat(i: number, field: 'value' | 'label', val: string) {
    setContent((c) => {
      if (!c) return c;
      const stats = c.stats.map((s, idx) => (idx === i ? { ...s, [field]: val } : s));
      return { ...c, stats };
    });
  }

  async function save() {
    if (!content) return;
    setSaving(true);
    try {
      await apiPut('/site/landing', { value: content });
      toast('Landing page updated — refresh the home page to see it live', 'success');
    } catch (e: any) {
      toast(e?.message || 'Could not save', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (!content) {
    return (
      <div>
        <PageHeader title="Landing Page" subtitle="Edit the public marketing page." />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Landing Page"
        subtitle="Edit the public marketing page content. Changes go live immediately."
        action={
          <div className="flex gap-2">
            <Link href="/" target="_blank"><Button variant="outline"><ExternalLink className="h-4 w-4" /> Preview</Button></Link>
            <Button onClick={save} disabled={saving}>{saving ? <Spinner /> : <><Save className="h-4 w-4" /> Save</>}</Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Megaphone className="h-4 w-4" /> Hero</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Announcement badge</Label><Input className="mt-1.5" value={content.announcement} onChange={(e) => set('announcement', e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Headline</Label><Input className="mt-1.5" value={content.heroTitle} onChange={(e) => set('heroTitle', e.target.value)} /></div>
              <div><Label>Highlighted word</Label><Input className="mt-1.5" value={content.heroHighlight} onChange={(e) => set('heroHighlight', e.target.value)} /></div>
            </div>
            <div><Label>Subtitle</Label><Textarea className="mt-1.5" value={content.heroSubtitle} onChange={(e) => set('heroSubtitle', e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Primary CTA label</Label><Input className="mt-1.5" value={content.primaryCta} onChange={(e) => set('primaryCta', e.target.value)} /></div>
              <div><Label>Course price (BDT)</Label><Input type="number" className="mt-1.5" value={content.priceBdt} onChange={(e) => set('priceBdt', Number(e.target.value))} /></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Stats band</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {content.stats.map((s, i) => (
              <div key={i} className="grid grid-cols-2 gap-3">
                <Input value={s.value} onChange={(e) => setStat(i, 'value', e.target.value)} placeholder="12,000+" />
                <Input value={s.label} onChange={(e) => setStat(i, 'label', e.target.value)} placeholder="Students enrolled" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Closing call-to-action</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Title</Label><Input className="mt-1.5" value={content.finalCtaTitle} onChange={(e) => set('finalCtaTitle', e.target.value)} /></div>
            <div><Label>Subtitle</Label><Textarea className="mt-1.5" value={content.finalCtaSubtitle} onChange={(e) => set('finalCtaSubtitle', e.target.value)} /></div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" onClick={() => setContent(DEFAULT_LANDING)}><RotateCcw className="h-4 w-4" /> Reset to defaults</Button>
        <Button onClick={save} disabled={saving}>{saving ? <Spinner /> : <><Save className="h-4 w-4" /> Save changes</>}</Button>
      </div>
    </div>
  );
}
