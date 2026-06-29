'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, BookOpen, ClipboardList, Trophy, Library, MessageSquare,
  Shield, GraduationCap, Bell, LogOut, Menu, X, FileText, Users, Radio,
  CreditCard, LifeBuoy, FolderOpen, UserCog, Megaphone, Layout, Brain,
} from 'lucide-react';
import { Logo } from '@/components/logo';
import { Avatar } from '@/components/ui/avatar';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import type { Role } from '@/lib/types';

type NavItem = { href: string; label: string; icon: React.ElementType };
type NavSection = { title?: string; items: NavItem[] };

const STUDENT_NAV: NavSection[] = [
  { items: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/courses', label: 'Courses', icon: BookOpen },
    { href: '/exams', label: 'Exams', icon: ClipboardList },
    { href: '/practice', label: 'Practice', icon: Brain },
    { href: '/mocks', label: 'Mock Tests', icon: Trophy },
    { href: '/assignments', label: 'Assignments', icon: FileText },
    { href: '/resources', label: 'Resources', icon: Library },
    { href: '/forum', label: 'Forum', icon: MessageSquare },
    { href: '/announcements', label: 'Announcements', icon: Megaphone },
    { href: '/support', label: 'Support', icon: LifeBuoy },
  ] },
];

const TEACHER_NAV: NavSection[] = [
  { items: [
    { href: '/teacher', label: 'Dashboard', icon: GraduationCap },
    { href: '/teacher/classes', label: 'Classes', icon: Radio },
    { href: '/teacher/courses', label: 'Course Builder', icon: BookOpen },
    { href: '/teacher/content', label: 'Content', icon: FolderOpen },
    { href: '/teacher/exams', label: 'Exams', icon: ClipboardList },
    { href: '/teacher/mocks', label: 'Mock Tests', icon: Trophy },
    { href: '/teacher/assignments', label: 'Assignments', icon: FileText },
    { href: '/teacher/students', label: 'Students', icon: Users },
    { href: '/forum', label: 'Forum', icon: MessageSquare },
    { href: '/announcements', label: 'Announcements', icon: Megaphone },
    { href: '/support', label: 'Support', icon: LifeBuoy },
  ] },
];

const MODERATOR_NAV: NavSection[] = [
  { items: [
    { href: '/moderator', label: 'Dashboard', icon: Shield },
    { href: '/admin/content', label: 'Content Moderation', icon: Library },
    { href: '/admin/support', label: 'Support Tickets', icon: LifeBuoy },
    { href: '/forum', label: 'Forum', icon: MessageSquare },
    { href: '/resources', label: 'Resources', icon: BookOpen },
    { href: '/announcements', label: 'Announcements', icon: Megaphone },
  ] },
];

const ADMIN_NAV: NavSection[] = [
  { items: [
    { href: '/admin', label: 'Overview', icon: Shield },
    { href: '/admin/landing', label: 'Landing Page', icon: Layout },
  ] },
  { title: 'Management', items: [
    { href: '/admin/users', label: 'Users', icon: UserCog },
    { href: '/admin/courses', label: 'Courses', icon: BookOpen },
    { href: '/admin/exams', label: 'Exams', icon: ClipboardList },
    { href: '/admin/payments', label: 'Payments', icon: CreditCard },
    { href: '/admin/content', label: 'Content', icon: Library },
    { href: '/admin/support', label: 'Support', icon: LifeBuoy },
  ] },
  { title: 'Teaching tools', items: [
    { href: '/teacher/classes', label: 'Live Classes', icon: Radio },
    { href: '/teacher/courses', label: 'Course Builder', icon: FolderOpen },
    { href: '/teacher/content', label: 'Upload Content', icon: FileText },
    { href: '/teacher/mocks', label: 'Mock Tests', icon: Trophy },
    { href: '/teacher/assignments', label: 'Assignments', icon: FileText },
    { href: '/teacher/students', label: 'Students', icon: Users },
  ] },
  { title: 'Community', items: [
    { href: '/forum', label: 'Forum', icon: MessageSquare },
    { href: '/announcements', label: 'Announcements', icon: Megaphone },
  ] },
];

function navForRole(role: Role): NavSection[] {
  if (role === 'TEACHER') return TEACHER_NAV;
  if (role === 'ADMIN') return ADMIN_NAV;
  if (role === 'MODERATOR') return MODERATOR_NAV;
  return STUDENT_NAV;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-6 w-6 text-primary" />
      </div>
    );
  }

  const sections = navForRole(user.role);

  const SidebarBody = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center border-b px-6">
        <Logo />
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {sections.map((section, si) => (
          <div key={si} className={cn(si > 0 && 'pt-3')}>
            {section.title && (
              <p className="px-3 pb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">{section.title}</p>
            )}
            {section.items.map((item) => {
              const isRoot = ['/admin', '/teacher', '/moderator', '/dashboard'].includes(item.href);
              const active = isRoot ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href + item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="border-t p-4">
        <div className="flex items-center gap-3 rounded-lg p-2">
          <Avatar name={user.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs capitalize text-muted-foreground">{user.role.toLowerCase()}</p>
          </div>
          <button onClick={logout} className="text-muted-foreground hover:text-destructive" aria-label="Log out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-secondary/20">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-card lg:block">{SidebarBody}</aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-card shadow-xl">{SidebarBody}</aside>
        </div>
      )}

      <div className="lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
          <button className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <Link href="/notifications" className="relative rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
            </Link>
            <Avatar name={user.name} />
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
