import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { ToastProvider } from '@/components/ui/toast';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: 'CampusKrafts — University Admission Preparation',
  description:
    'CampusKrafts is the modern admission-prep platform for Bangladeshi students: live classes, recorded lectures, lecture sheets, mock tests with national ranking, and adaptive practice.',
  keywords: ['admission', 'Bangladesh', 'university', 'mock test', 'coaching', 'CampusKrafts'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen font-sans">
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
