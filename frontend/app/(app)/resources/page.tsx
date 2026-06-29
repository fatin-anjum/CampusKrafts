'use client';

import { useMemo, useState } from 'react';
import { Library, Search, FileText, Download, BookOpen } from 'lucide-react';
import { PageHeader, EmptyState } from '@/components/app/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi } from '@/lib/use-api';

interface Resource {
  id: string; title: string; description?: string; type: string; tags: string[]; s3Key: string;
}

const TYPES = ['ALL', 'BOOK', 'PDF_NOTE', 'SHORT_NOTE', 'FORMULA_SHEET', 'CHEAT_SHEET', 'GUIDELINE'];
const typeLabel = (t: string) => t.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export default function ResourcesPage() {
  const [q, setQ] = useState('');
  const [type, setType] = useState('ALL');
  const path = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (type !== 'ALL') p.set('type', type);
    const qs = p.toString();
    return `/resources${qs ? `?${qs}` : ''}`;
  }, [q, type]);
  const { data, loading } = useApi<Resource[]>(path);

  return (
    <div>
      <PageHeader title="Resource Library" subtitle="Books, notes, formula sheets, and admission guidelines." />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search resources or tags…" className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <button key={t} onClick={() => setType(t)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${type === t ? 'border-primary bg-primary/5 text-primary' : 'hover:bg-secondary'}`}>
              {t === 'ALL' ? 'All' : typeLabel(t)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : data && data.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((r) => (
            <Card key={r.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col p-5">
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {r.type === 'BOOK' ? <BookOpen className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                  </span>
                  <Badge variant="muted">{typeLabel(r.type)}</Badge>
                </div>
                <h3 className="mt-4 font-semibold">{r.title}</h3>
                {r.description && <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted-foreground">{r.description}</p>}
                {r.tags?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {r.tags.slice(0, 3).map((t) => <Badge key={t} variant="outline">{t}</Badge>)}
                  </div>
                )}
                <Button variant="outline" size="sm" className="mt-4"><Download className="h-4 w-4" /> Download</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={Library} title="No resources found" desc="Try a different search or filter. Approved library items appear here." />
      )}
    </div>
  );
}
