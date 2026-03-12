'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import {
  LayoutDashboard,
  Users,
  ArrowLeftRight,
  TrendingUp,
  Calendar,
  Trophy,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'My Team', icon: Users, href: '/my-team' },
  { label: 'Trade Analyzer', icon: ArrowLeftRight, href: '/trade-analyzer' },
  { label: 'Waiver Wire', icon: TrendingUp, href: '/waiver-wire' },
  { label: 'Schedule Grid', icon: Calendar, href: '/schedule-grid' },
  { label: 'Standings', icon: Trophy, href: '/standings' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-[240px] flex flex-col z-50"
      style={{ backgroundColor: '#111113', borderRight: '1px solid #27272a' }}
    >
      {/* Logo */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-2">
          <Image src="/tinker-icon.svg" alt="Tinker Icon" width={28} height={28} />
          <Image src="/tinker-logo.svg" alt="Tinker" width={90} height={28} />
        </div>
        <p className="text-xs mt-1.5" style={{ color: '#52525b' }}>
          Fantasy Basketball
        </p>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', backgroundColor: '#27272a' }} />

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ label, icon: Icon, href }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors relative group"
              style={{
                color: active ? '#f4f4f5' : '#71717a',
                backgroundColor: active ? '#18181b' : 'transparent',
                borderLeft: active ? '3px solid #3b82f6' : '3px solid transparent',
              }}
            >
              <Icon size={16} className="flex-shrink-0" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div style={{ height: '1px', backgroundColor: '#27272a' }} />

      {/* Yahoo Connection Status */}
      <div className="px-4 py-4">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: '#ea580c' }}
          />
          <span className="text-xs" style={{ color: '#71717a' }}>
            Not connected
          </span>
        </div>
        <Link
          href="/api/yahoo/auth"
          className="block w-full text-center text-xs px-3 py-1.5 rounded border font-medium transition-colors"
          style={{
            color: '#3b82f6',
            borderColor: '#3b82f6',
            backgroundColor: 'transparent',
          }}
        >
          Connect Yahoo
        </Link>
        <p className="text-xs mt-2 leading-tight" style={{ color: '#52525b' }}>
          Tinker League · 12 teams · H2H 9-CAT
        </p>
      </div>
    </aside>
  );
}
