'use client';

import { useState } from 'react';
import { CheckCircle2, CreditCard, Smartphone } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { apiPost } from '@/lib/api';
import { formatBdt } from '@/lib/utils';

const GATEWAYS = [
  { id: 'BKASH', label: 'bKash', icon: Smartphone },
  { id: 'NAGAD', label: 'Nagad', icon: Smartphone },
  { id: 'ROCKET', label: 'Rocket', icon: Smartphone },
  { id: 'SSLCOMMERZ', label: 'SSLCommerz', icon: CreditCard },
  { id: 'CARD', label: 'Card', icon: CreditCard },
];

/**
 * Enrollment + payment flow.
 *   1. POST /courses/:id/enroll → creates a PENDING payment + gateway redirect.
 *   2. (Demo) POST /payments/webhook/:gateway with SUCCESS → activates the subscription,
 *      exactly as the real gateway IPN would. In production step 2 is the gateway calling us.
 */
export function EnrollDialog({
  open, onClose, courseId, priceBdt, onEnrolled,
}: { open: boolean; onClose: () => void; courseId: string; priceBdt: number; onEnrolled: () => void }) {
  const { toast } = useToast();
  const [gateway, setGateway] = useState('BKASH');
  const [stage, setStage] = useState<'select' | 'confirm'>('select');
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function initiate() {
    setLoading(true);
    try {
      const res = await apiPost<{ paymentId: string; redirectUrl: string }>(`/courses/${courseId}/enroll`, { gateway });
      setPaymentId(res.paymentId);
      setStage('confirm');
    } catch (e: any) {
      toast(e?.message || 'Could not start payment', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function confirm() {
    if (!paymentId) return;
    setLoading(true);
    try {
      // Simulated gateway IPN callback (public endpoint).
      await apiPost(`/payments/webhook/${gateway}`, { paymentId, status: 'SUCCESS', gatewayRef: 'DEMO-' + paymentId.slice(0, 6) }, false);
      toast('Payment successful — you are enrolled!', 'success');
      onEnrolled();
      onClose();
      reset();
    } catch (e: any) {
      toast(e?.message || 'Payment confirmation failed', 'error');
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStage('select');
    setPaymentId(null);
  }

  return (
    <Dialog open={open} onClose={() => { onClose(); reset(); }}>
      {stage === 'select' ? (
        <>
          <h2 className="text-lg font-semibold">Choose a payment method</h2>
          <p className="mt-1 text-sm text-muted-foreground">Total due: <span className="font-semibold text-foreground">{formatBdt(priceBdt)}</span></p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {GATEWAYS.map((g) => (
              <button key={g.id} onClick={() => setGateway(g.id)}
                className={`flex items-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors ${gateway === g.id ? 'border-primary bg-primary/5 text-primary' : 'hover:bg-secondary'}`}>
                <g.icon className="h-4 w-4" /> {g.label}
              </button>
            ))}
          </div>
          <Button className="mt-6 w-full" onClick={initiate} disabled={loading}>
            {loading ? <Spinner /> : `Pay ${formatBdt(priceBdt)}`}
          </Button>
        </>
      ) : (
        <>
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CreditCard className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-semibold">Complete your {gateway} payment</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            In production you&apos;d now be on the {gateway} checkout page. For this demo, confirm to simulate a successful payment callback.
          </p>
          <Button className="mt-6 w-full" variant="accent" onClick={confirm} disabled={loading}>
            {loading ? <Spinner /> : <><CheckCircle2 className="h-4 w-4" /> Confirm payment</>}
          </Button>
          <button onClick={reset} className="mt-3 w-full text-center text-sm text-muted-foreground hover:text-foreground">← Change method</button>
        </>
      )}
    </Dialog>
  );
}
