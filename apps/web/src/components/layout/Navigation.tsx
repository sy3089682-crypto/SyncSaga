'use client';

import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, Users, Tv, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/search', icon: Tv, label: 'Discover' },
  { href: '/friends', icon: Users, label: 'Friends' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (pathname === '/' || pathname?.startsWith('/auth/') || pathname?.startsWith('/room/')) return null;

  return (
    <aside className="w-60 h-screen bg-surface border-r border-border flex flex-col shrink-0 hidden lg:flex">
      <div className="h-14 border-b border-border flex items-center px-4 gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent-cyan flex items-center justify-center">
          <Tv className="w-5 h-5 text-white" />
        </div>
        <span className="text-lg font-bold bg-gradient-to-r from-primary to-accent-cyan bg-clip-text text-transparent">
          SyncSaga
        </span>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {navItems.map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href}>
            <div className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative',
              pathname === href
                ? 'text-primary bg-primary/10'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-light'
            )}>
              {pathname === href && (
                <motion.div layoutId="nav-indicator" className="absolute left-0 w-1 h-6 bg-primary rounded-r-full" />
              )}
              <Icon className="w-5 h-5" />
              {label}
            </div>
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-surface-light transition-colors cursor-pointer" onClick={logout}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent-pink flex items-center justify-center text-sm font-semibold shrink-0">
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.display_name || user?.username || 'User'}</p>
            <p className="text-xs text-text-muted truncate">{user?.username || ''}</p>
          </div>
          <LogOut className="w-4 h-4 text-text-muted shrink-0" />
        </div>
      </div>
    </aside>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  if (pathname === '/' || pathname?.startsWith('/auth/') || pathname?.startsWith('/room/')) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-border flex items-center justify-around lg:hidden z-50">
      {navItems.map(({ href, icon: Icon, label }) => (
        <Link key={href} href={href}>
          <div className={cn(
            'flex flex-col items-center gap-0.5 px-4 py-1 rounded-lg transition-colors',
            pathname === href ? 'text-primary' : 'text-text-muted'
          )}>
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </div>
        </Link>
      ))}
    </nav>
  );
}
