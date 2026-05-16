'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { cn } from '@/lib/utils'
import { Users, Tv, Clapperboard, User, LogOut } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Rooms', icon: Users },
  { href: '/friends', label: 'Feed', icon: Clapperboard },
  { href: '/profile', label: 'Profile', icon: User },
]

export function Navbar() {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()

  if (!user || pathname.startsWith('/auth') || pathname.startsWith('/embed')) return null

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Tv className="w-5 h-5 text-brand-400" />
            <span className="font-bold text-lg bg-gradient-to-r from-brand-400 to-accent-400 bg-clip-text text-transparent">
              SyncSaga
            </span>
          </Link>

          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-brand-600/20 text-brand-300'
                      : 'text-surface-400 hover:text-surface-200 hover:bg-white/5',
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-surface-400">{user.display_name}</span>
          <button onClick={logout} className="btn-ghost p-1.5" title="Logout">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </nav>
  )
}
