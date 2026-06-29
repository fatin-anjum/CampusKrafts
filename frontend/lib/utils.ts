import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes safely (conditional + de-duped). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format an integer amount of BDT as ৳2,500. */
export function formatBdt(amount: number) {
  return '৳' + new Intl.NumberFormat('en-IN').format(amount);
}

/** "in 2h", "3 days ago" style relative time. */
export function fromNow(date: string | Date) {
  const d = new Date(date).getTime();
  const diff = d - Date.now();
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60000);
  const hrs = Math.round(abs / 3600000);
  const days = Math.round(abs / 86400000);
  const fmt = (n: number, u: string) => `${n} ${u}${n === 1 ? '' : 's'}`;
  const phrase = mins < 60 ? fmt(mins, 'min') : hrs < 24 ? fmt(hrs, 'hour') : fmt(days, 'day');
  return diff >= 0 ? `in ${phrase}` : `${phrase} ago`;
}

export function initials(name?: string) {
  if (!name) return '?';
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
