'use client';

import Link from 'next/link';
import { useState } from 'react';
import { LifeBuoy, Plus, ChevronRight } from 'lucide-react';
import { PageHeader, EmptyState } from '@/components/app/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Dialog } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { useApi } from '@/lib/use-api';
import { apiPost } from '@/lib/api';
import { fromNow } from '@/lib/utils';
import { ticketStatusVariant } from '@/lib/support';
import type { Ticket } from '@/lib/types';

const CATEGORIES = ['TECHNICAL', 'PAYMENT', 'ACADEMIC', 'OTHER'];
const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

export default function SupportPage() {
  const { data, loading, refetch } = useApi<Ticket[]>('/support/tickets');
  const [creating, setCreating] = useState(false);

  return (
    <div>
      <PageHeader
        title="Support"
        subtitle="Raise a ticket and track its resolution."
        action={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New ticket</Button>}
      />

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : data && data.length > 0 ? (
        <div className="space-y-3">
          {data.map((t) => (
            <Link key={t.id} href={`/support/${t.id}`}>
              <Card className="transition-colors hover:border-primary/40">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{t.subject}</p>
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="muted">{t.category}</Badge>
                      <span>{t.priority.toLowerCase()} priority</span>
                      <span>· {fromNow(t.createdAt)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={ticketStatusVariant[t.status] ?? 'muted'}>{t.status.replace('_', ' ')}</Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState icon={LifeBuoy} title="No tickets yet" desc="Need help? Open a ticket and our team will respond." action={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New ticket</Button>} />
      )}

      {creating && <CreateTicketDialog onClose={() => setCreating(false)} onCreated={() => { setCreating(false); refetch(); }} />}
    </div>
  );
}

function CreateTicketDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ subject: '', category: 'TECHNICAL', priority: 'NORMAL' });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.subject.trim()) return toast('Describe your issue', 'error');
    setSaving(true);
    try {
      await apiPost('/support/tickets', form);
      toast('Ticket created', 'success');
      onCreated();
    } catch (e: any) {
      toast(e?.message || 'Could not create ticket', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onClose={onClose} className="max-w-lg">
      <h2 className="text-lg font-semibold">New support ticket</h2>
      <div className="mt-5 space-y-4">
        <div><Label>Subject</Label><Input className="mt-1.5" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Briefly describe your issue" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Category</Label>
            <Select className="mt-1.5" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>)}
            </Select>
          </div>
          <div><Label>Priority</Label>
            <Select className="mt-1.5" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>)}
            </Select>
          </div>
        </div>
      </div>
      <Button className="mt-6 w-full" onClick={save} disabled={saving}>{saving ? <Spinner /> : 'Create ticket'}</Button>
    </Dialog>
  );
}
