import Link from 'next/link';
import { GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ className, href = '/' }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn('flex items-center gap-2 font-bold', className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-white shadow-sm">
        <GraduationCap className="h-5 w-5" />
      </span>
      <span className="text-lg tracking-tight">
        Campus<span className="gradient-text">Krafts</span>
      </span>
    </Link>
  );
}
