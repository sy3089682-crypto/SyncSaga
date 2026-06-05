"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@syncsaga/ui"
import { Home, Compass, Users, Star, Trophy, Settings } from "lucide-react"

const sidebarItems = [
  { name: "Home", href: "/", icon: Home },
  { name: "Explore", href: "/explore", icon: Compass },
  { name: "Rooms", href: "/rooms", icon: Users },
  { name: "Watchlist", href: "/watchlist", icon: Star },
  { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden border-r border-border-strong bg-surface md:block w-64 h-[calc(100vh-3.5rem)] sticky top-14">
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight text-white">
            Discover
          </h2>
          <div className="space-y-1">
            {sidebarItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <span
                  className={cn(
                    "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-elevated hover:text-white",
                    pathname === item.href ? "bg-elevated text-accent-purple" : "text-zinc-400"
                  )}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  <span>{item.name}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-auto p-4 absolute bottom-0 w-full">
         <Link href="/settings">
            <span className="group flex items-center rounded-md px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-elevated hover:text-white">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </span>
          </Link>
      </div>
    </aside>
  )
}
