'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthShell } from '@/components/marketing/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { useAuth, homeForRole } from '@/lib/auth';
import { ApiError } from '@/lib/api';

const demos = [
  ['Student', 'student@campuskrafts.com', 'Student@123'],
  ['Teacher', 'teacher@campuskrafts.com', 'Admin@12345'],
  ['Admin', 'admin@campuskrafts.com', 'Admin@12345'],
];

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(identifier, password);
      toast(`Welcome back, ${user.name}!`, 'success');
      router.push(homeForRole(user.role));
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
      <p className="mt-1 text-sm text-muted-foreground">Log in to continue your preparation.</p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="identifier">Email or phone</Label>
          <Input id="identifier" value={identifier} onChange={(e) => setIdentifier(e.target.value)}
            placeholder="you@example.com" autoComplete="username" required />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/login" className="text-xs text-primary hover:underline">Forgot?</Link>
          </div>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••" autoComplete="current-password" required />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Spinner /> : 'Log in'}
        </Button>
      </form>

      <div className="mt-6 rounded-lg border bg-secondary/40 p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Quick demo login</p>
        <div className="flex flex-wrap gap-2">
          {demos.map(([label, email, pass]) => (
            <button key={label} type="button"
              onClick={() => { setIdentifier(email); setPassword(pass); }}
              className="rounded-md border bg-background px-2.5 py-1 text-xs font-medium hover:bg-secondary">
              {label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New here? <Link href="/register" className="font-medium text-primary hover:underline">Create an account</Link>
      </p>
    </AuthShell>
  );
}
