export interface LandingStat {
  value: string;
  label: string;
}

export interface LandingContent {
  announcement: string;
  heroTitle: string;
  heroHighlight: string;
  heroSubtitle: string;
  priceBdt: number;
  primaryCta: string;
  stats: LandingStat[];
  finalCtaTitle: string;
  finalCtaSubtitle: string;
}

/** Shipped defaults — also the fallback when no admin override exists. */
export const DEFAULT_LANDING: LandingContent = {
  announcement: '🎓 Admission Season 2026 is open',
  heroTitle: 'Crack university admission with',
  heroHighlight: 'CampusKrafts',
  heroSubtitle:
    'Live classes, recorded lectures, lecture sheets, and mock tests with national ranking — one flagship crash course built for Bangladeshi admission aspirants.',
  priceBdt: 2500,
  primaryCta: 'Enroll now',
  stats: [
    { value: '12,000+', label: 'Students enrolled' },
    { value: '200+', label: 'Lectures' },
    { value: '40+', label: 'Mock tests' },
    { value: '4.9/5', label: 'Average rating' },
  ],
  finalCtaTitle: 'Your seat is waiting.',
  finalCtaSubtitle:
    'Join thousands of students preparing the smart way. Start today and track your rank to the top.',
};

const BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

/** Server-side fetch of admin overrides, merged over defaults. Never throws. */
export async function fetchLanding(): Promise<LandingContent> {
  try {
    const res = await fetch(`${BASE}/site/landing`, { cache: 'no-store' });
    if (!res.ok) return DEFAULT_LANDING;
    const body = await res.json();
    const value = body?.data ?? body;
    if (!value || typeof value !== 'object') return DEFAULT_LANDING;
    return {
      ...DEFAULT_LANDING,
      ...value,
      stats: Array.isArray(value.stats) && value.stats.length ? value.stats : DEFAULT_LANDING.stats,
    };
  } catch {
    return DEFAULT_LANDING;
  }
}
