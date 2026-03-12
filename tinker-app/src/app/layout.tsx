import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Tinker — Fantasy Basketball AI',
  description: 'AI-powered fantasy basketball analytics',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans bg-[#09090b] text-[#f4f4f5] min-h-screen`}>
        <div className="flex">
          <Sidebar />
          <main className="flex-1 ml-[240px] min-h-screen">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
