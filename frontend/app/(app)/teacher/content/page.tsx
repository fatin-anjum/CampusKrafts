'use client';

import Link from 'next/link';
import { useState } from 'react';
import { FolderOpen, Plus, FileText, BookOpen, Video, UploadCloud } from 'lucide-react';
import { PageHeader, EmptyState } from '@/components/app/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Dialog } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { useApi } from '@/lib/use-api';
import { apiPost } from '@/lib/api';
import { uploadFile } from '@/lib/upload';

interface Resource { id: string; title: string; description?: string; type: string; tags: string[]; }
interface Category { id: string; name: string; }

const TYPES = ['BOOK', 'PDF_NOTE', 'SHORT_NOTE', 'FORMULA_SHEET', 'CHEAT_SHEET', 'GUIDELINE'];
const typeLabel = (t: string) => t.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export default function TeacherContentPage() {
  const { data, loading, refetch } = useApi<Resource[]>('/resources');
  const [creating, setCreating] = useState(false);

  return (
    <div>
      <PageHeader
        title="Upload Content"
        subtitle="Publish notes, books, and formula sheets. New uploads go to moderation before appearing in the library."
        action={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Upload note</Button>}
      />

      <Card className="mb-6 border-dashed bg-secondary/20">
        <CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
          <Video className="h-5 w-5 shrink-0 text-primary" />
          <span>Uploading <strong>video lessons</strong>? Head to the <Link href="/teacher/courses" className="font-medium text-primary hover:underline">Course Builder</Link> to attach videos to a course module.</span>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36" />)}</div>
      ) : data && data.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {r.type === 'BOOK' ? <BookOpen className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                  </span>
                  <Badge variant="muted">{typeLabel(r.type)}</Badge>
                </div>
                <h3 className="mt-4 font-semibold">{r.title}</h3>
                {r.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.description}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={FolderOpen} title="No approved content yet" desc="Your uploads appear in the library once a moderator approves them." action={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Upload note</Button>} />
      )}

      {creating && <UploadDialog onClose={() => setCreating(false)} onCreated={() => { setCreating(false); refetch(); }} />}
    </div>
  );
}

function UploadDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { toast } = useToast();
  const { data: categories } = useApi<Category[]>('/resource-categories');
  const [form, setForm] = useState({ title: '', type: 'PDF_NOTE', description: '', categoryId: '', tags: '' });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.title.trim()) return toast('Title is required', 'error');
    if (!file) return toast('Choose a file to upload', 'error');
    setSaving(true);
    try {
      const { s3Key } = await uploadFile(file);
      await apiPost('/resources', {
        title: form.title,
        type: form.type,
        s3Key,
        description: form.description || undefined,
        categoryId: form.categoryId || undefined,
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      });
      toast('Uploaded — pending moderation', 'success');
      onCreated();
    } catch (e: any) {
      toast(e?.message || 'Upload failed', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onClose={onClose} className="max-w-lg">
      <h2 className="text-lg font-semibold">Upload content</h2>
      <div className="mt-5 space-y-4">
        <div><Label>Title</Label><Input className="mt-1.5" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Organic Chemistry Formula Sheet" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Type</Label>
            <Select className="mt-1.5" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {TYPES.map((t) => <option key={t} value={t}>{typeLabel(t)}</option>)}
            </Select>
          </div>
          <div>
            <Label>Category</Label>
            <Select className="mt-1.5" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              <option value="">None</option>
              {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
        </div>
        <div><Label>Description</Label><Textarea className="mt-1.5" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div><Label>Tags (comma separated)</Label><Input className="mt-1.5" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="physics, hsc, formulas" /></div>
        <div>
          <Label>File</Label>
          <label className="mt-1.5 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed p-3 text-sm hover:bg-secondary/40">
            <UploadCloud className="h-5 w-5 text-muted-foreground" />
            <span className="truncate text-muted-foreground">{file ? file.name : 'Choose a PDF, image, or document…'}</span>
            <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
        </div>
      </div>
      <Button className="mt-6 w-full" onClick={save} disabled={saving}>{saving ? <Spinner /> : 'Upload'}</Button>
    </Dialog>
  );
}
