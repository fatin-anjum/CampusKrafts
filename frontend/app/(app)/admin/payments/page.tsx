'use client';

import { useMemo, useState } from 'react';
import { CreditCard, RotateCcw, TrendingUp, BookCheck } from 'lucide-react';
import { PageHeader, EmptyState } from '@/components/app/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { useApi } from '@/lib/use-api';
import { apiPost } from '@/lib/api';
import { formatBdt } from '@/lib/utils';
import type { Payment } from '@/lib/types';

const PAGE_SIZE = 20;

const statusVariant: Record<string, 'success' | 'accent' | 'destructive' | 'muted'> = {
  SUCCESS: 'success', PENDING: 'accent', FAILED: 'destructive', REFUNDED: 'muted',
};

interface Overview { revenue: { totalBdt: number; successfulPayments: number }; engagement: { activeSubscriptions: number }; }

export default function AdminPaymentsPage() {
  const [page, setPage] = useState(1);
  const path = useMemo(() => `/payments?page=${page}&limit=${PAGE_SIZE}`, [page]);
  const { data, loading, refetch } = useApi<Payment[]>(path);
  const { data: overview } = useApi<Overview>('/admin/analytics/overview');
  const [refunding, setRefunding] = useState<Payment | null>(null);

  return (
    <div>
      <PageHeader title="Payment Management" subtitle="Monitor transactions, subscriptions, and process refunds." />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat icon={TrendingUp} label="Total revenue" value={formatBdt(overview?.revenue.totalBdt ?? 0)} tint="text-success bg-success/10" />
        <Stat icon={CreditCard} label="Successful payments" value={overview?.revenue.successfulPayments ?? 0} tint="text-primary bg-primary/10" />
        <Stat icon={BookCheck} label="Active subscriptions" value={overview?.engagement.activeSubscriptions ?? 0} tint="text-accent bg-accent/10" />
      </div>

      {loading ? (
        <Skeleton className="h-72" />
      ) : data && data.length > 0 ? (
        <>
          <Card>
            <CardContent className="p-0">
              <div className="hidden grid-cols-[1.4fr_1fr_1fr_1fr_90px] gap-4 border-b px-5 py-3 text-xs font-medium text-muted-foreground sm:grid">
                <span>Payment</span><span>Gateway</span><span>Amount</span><span>Status</span><span className="text-right">Action</span>
              </div>
              {data.map((p) => (
                <div key={p.id} className="grid grid-cols-1 gap-2 border-b px-5 py-3 text-sm last:border-0 sm:grid-cols-[1.4fr_1fr_1fr_1fr_90px] sm:items-center">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs">{p.id}</p>
                    {p.gatewayRef && <p className="truncate text-xs text-muted-foreground">ref {p.gatewayRef}</p>}
                  </div>
                  <span>{p.gateway}</span>
                  <span className="font-medium">{formatBdt(p.amountBdt)}</span>
                  <span><Badge variant={statusVariant[p.status] ?? 'muted'}>{p.status}</Badge></span>
                  <div className="flex justify-start sm:justify-end">
                    {p.status === 'SUCCESS' && (
                      <Button variant="ghost" size="sm" onClick={() => setRefunding(p)}><RotateCcw className="h-4 w-4" /> Refund</Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="mt-4 flex items-center justify-end gap-2 text-sm text-muted-foreground">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <span>Page {page}</span>
            <Button variant="outline" size="sm" disabled={data.length < PAGE_SIZE} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </>
      ) : (
        <EmptyState icon={CreditCard} title="No payments yet" desc="Transactions will appear here as students enroll." />
      )}

      {refunding && <RefundDialog payment={refunding} onClose={() => setRefunding(null)} onDone={() => { setRefunding(null); refetch(); }} />}
    </div>
  );
}

function RefundDialog({ payment, onClose, onDone }: { payment: Payment; onClose: () => void; onDone: () => void }) {
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  async function refund() {
    if (!reason.trim()) return toast('A reason is required', 'error');
    setSaving(true);
    try {
      await apiPost(`/payments/${payment.id}/refund`, { reason });
      toast('Refund processed', 'success');
      onDone();
    } catch (e: any) {
      toast(e?.message || 'Refund failed', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onClose={onClose} className="max-w-md">
      <h2 className="text-lg font-semibold">Process refund</h2>
      <p className="mt-1 text-sm text-muted-foreground">Refunding {formatBdt(payment.amountBdt)} via {payment.gateway}. This cancels the subscription.</p>
      <div className="mt-5">
        <Label>Reason</Label>
        <Input className="mt-1.5" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Duplicate charge" />
      </div>
      <Button variant="destructive" className="mt-6 w-full" onClick={refund} disabled={saving}>{saving ? <Spinner /> : 'Confirm refund'}</Button>
    </Dialog>
  );
}

function Stat({ icon: Icon, label, value, tint }: { icon: React.ElementType; label: string; value: number | string; tint: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tint}`}><Icon className="h-5 w-5" /></span>
        <div><div className="text-xl font-bold">{value}</div><div className="text-xs text-muted-foreground">{label}</div></div>
      </CardContent>
    </Card>
  );
}
