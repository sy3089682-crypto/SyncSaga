'use client';

import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, Users, Tv, Settings, LogOut, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/search', icon: Tv, label: 'Discover' },
  { href: '/friends', icon: Users, label: 'Friends' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

function shouldHide(pathname: string | null) {
  return pathname === '/' || pathname?.startsWith('/auth/') || pathname?.startsWith('/room/');
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  if (shouldHide(pathname)) return null;
  const displayName = (user as any)?.user_metadata?.display_name || (user as any)?.user_metadata?.username || user?.email?.split('@')[0] || 'User';

  return <aside className="hidden h-screen w-[264px] shrink-0 flex-col border-r border-border bg-background lg:flex">
    <div className="flex h-20 items-center px-7"><Link href="/" className="syncsaga-wordmark">SyncSaga<span className="text-primary">.</span></Link></div>
    <div className="px-5"><Link href="/room/create" className="flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-[#1a0d0a] transition-transform hover:-translate-y-0.5"><Plus className="size-4" />Create room</Link></div>
    <nav className="flex flex-1 flex-col gap-1 px-4 pt-10" aria-label="App navigation">{navItems.map(({ href, icon: Icon, label }) => { const active = pathname === href || (href === '/search' && pathname?.startsWith('/search')); return <Link key={href} href={href} className={cn('relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-colors', active ? 'text-text-primary' : 'text-text-muted hover:bg-surface hover:text-text-primary')} aria-current={active ? 'page' : undefined}>{active && <motion.span layoutId="nav-indicator" className="absolute -left-4 h-6 w-0.5 rounded-full bg-primary" /> }<Icon className={cn('size-[18px]', active && 'text-primary')} />{label}</Link>; })}</nav>
    <div className="border-t border-border p-5"><button onClick={logout} className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-surface"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/15 text-sm font-semibold text-primary">{displayName[0]?.toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{displayName}</span><span className="block truncate text-xs text-text-muted">Account</span></span><LogOut className="size-4 text-text-muted" /></button></div>
  </aside>;
}

export function BottomNav() {
  const pathname = usePathname();
  if (shouldHide(pathname)) return null;
  return <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-border bg-background/95 px-3 backdrop-blur lg:hidden" aria-label="Mobile navigation">{navItems.map(({ href, icon: Icon, label }) => { const active = pathname === href || (href === '/search' && pathname?.startsWith('/search')); return <Link key={href} href={href} className={cn('flex flex-col items-center gap-1 rounded-lg px-4 py-1.5 text-[10px] font-medium transition-colors', active ? 'text-primary' : 'text-text-muted')} aria-current={active ? 'page' : undefined}><Icon className="size-[18px]" />{label}</Link>; })}</nav>;
}
