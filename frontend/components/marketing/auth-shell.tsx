import Link from 'next/link';
import { Logo } from '@/components/logo';
import { GraduationCap, Trophy, Brain } from 'lucide-react';

/** Split-screen shell used by the login & register pages. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left: brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-primary to-accent p-12 text-white lg:flex">
        <div className="absolute inset-0 ring-grid opacity-20" />
        <Logo href="/" className="relative text-white [&_span.gradient-text]:text-white" />
        <div className="relative space-y-6">
          <h2 className="text-3xl font-bold leading-tight">
            Prepare smarter.<br />Rank higher.
          </h2>
          <ul className="space-y-4 text-white/90">
            <li className="flex items-center gap-3"><GraduationCap className="h-5 w-5" /> Live & recorded classes from top teachers</li>
            <li className="flex items-center gap-3"><Trophy className="h-5 w-5" /> Mock tests with live national ranking</li>
            <li className="flex items-center gap-3"><Brain className="h-5 w-5" /> Adaptive practice tuned to your weak topics</li>
          </ul>
        </div>
        <p className="relative text-sm text-white/70">© {new Date().getFullYear()} CampusKrafts</p>
      </div>

      {/* Right: form */}
      <div className="flex flex-col items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo href="/" />
          </div>
          {children}
          <p className="mt-8 text-center text-xs text-muted-foreground">
            By continuing you agree to our <Link href="/" className="underline">Terms</Link> &{' '}
            <Link href="/" className="underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
