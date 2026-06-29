'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { AuthShell } from '@/components/marketing/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { useAuth, homeForRole } from '@/lib/auth';
import { apiPost, ApiError } from '@/lib/api';

export default function RegisterPage() {
  const { register, login } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast('Account created. We sent a verification code.', 'success');
      setStep('otp');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiPost('/auth/verify-otp', { identifier: form.email, code, purpose: 'SIGNUP' }, false);
      const user = await login(form.email, form.password);
      toast('Verified! Welcome to CampusKrafts.', 'success');
      router.push(homeForRole(user.role));
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Verification failed', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      {step === 'form' ? (
        <>
          <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Start your admission prep in minutes.</p>
          <form onSubmit={submitForm} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={form.name} onChange={set('name')} placeholder="Your name" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={form.password} onChange={set('password')}
                placeholder="At least 8 characters" minLength={8} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Spinner /> : 'Create account'}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account? <Link href="/login" className="font-medium text-primary hover:underline">Log in</Link>
          </p>
        </>
      ) : (
        <>
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Verify your email</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter the 6-digit code sent to <span className="font-medium text-foreground">{form.email}</span>.
          </p>
          <div className="mt-3 rounded-lg border border-dashed bg-secondary/40 p-3 text-xs text-muted-foreground">
            Dev tip: the OTP is printed in the backend console (no SMS/email gateway in local dev).
          </div>
          <form onSubmit={verify} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="code">Verification code</Label>
              <Input id="code" value={code} onChange={(e) => setCode(e.target.value)}
                placeholder="123456" inputMode="numeric" maxLength={6} className="tracking-[0.4em] text-center text-lg" required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Spinner /> : 'Verify & continue'}
            </Button>
            <button type="button" onClick={() => setStep('form')} className="w-full text-center text-sm text-muted-foreground hover:text-foreground">
              ← Back
            </button>
          </form>
        </>
      )}
    </AuthShell>
  );
}
