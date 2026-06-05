"use client"

import Link from "next/link"
import { useAuthStore } from "@/store"
import { Button } from "@syncsaga/ui"
import { Tv, User, LogOut } from "lucide-react"

export function Navbar() {
  const { user, profile, clearSession } = useAuthStore()

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border-strong bg-base/95 backdrop-blur supports-[backdrop-filter]:bg-base/60">
      <div className="container flex h-14 items-center px-4">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <Tv className="h-6 w-6 text-accent-purple" />
          <span className="hidden font-bold sm:inline-block text-white">
            SyncSaga
          </span>
        </Link>

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            {/* Search could go here */}
          </div>
          <nav className="flex items-center space-x-2">
            {user ? (
              <>
                <div className="flex items-center gap-2 mr-4">
                  <span className="text-sm font-medium text-white">
                    {profile?.username || user.email}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-yellow-400">
                    <span className="font-bold">{profile?.synccoins || 0}</span>
                    <span>🪙</span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" asChild>
                  <Link href="/profile">
                    <User className="h-5 w-5" />
                  </Link>
                </Button>
                <Button variant="ghost" size="icon" onClick={() => clearSession()}>
                  <LogOut className="h-5 w-5 text-red-500" />
                </Button>
              </>
            ) : (
              <Button variant="default" size="sm" asChild>
                <Link href="/login">Login</Link>
              </Button>
            )}
          </nav>
        </div>
      </div>
    </nav>
  )
}
