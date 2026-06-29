import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Facebook, Youtube, Mail } from 'lucide-react';

const columns = [
  { title: 'Platform', links: [['Courses', '/courses'], ['Mock Tests', '/mocks'], ['Resources', '/resources'], ['Forum', '/forum']] },
  { title: 'Company', links: [['About', '/#features'], ['Pricing', '/#pricing'], ['Contact', '/#contact']] },
  { title: 'Account', links: [['Log in', '/login'], ['Sign up', '/register'], ['Dashboard', '/dashboard']] },
];

export function SiteFooter() {
  return (
    <footer className="border-t bg-secondary/30">
      <div className="container grid gap-10 py-14 md:grid-cols-5">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            The modern admission-prep platform built for Bangladeshi students. Live classes, mock tests, and adaptive practice in one place.
          </p>
          <div className="mt-4 flex gap-3 text-muted-foreground">
            <Facebook className="h-5 w-5 hover:text-foreground" />
            <Youtube className="h-5 w-5 hover:text-foreground" />
            <Mail className="h-5 w-5 hover:text-foreground" />
          </div>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h4 className="text-sm font-semibold">{col.title}</h4>
            <ul className="mt-4 space-y-2.5">
              {col.links.map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="text-sm text-muted-foreground hover:text-foreground">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t">
        <div className="container flex flex-col items-center justify-between gap-2 py-6 text-sm text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} CampusKrafts. All rights reserved.</p>
          <p>Made for admission aspirants in Bangladesh 🇧🇩</p>
        </div>
      </div>
    </footer>
  );
}
