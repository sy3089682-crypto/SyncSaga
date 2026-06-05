"use client"

import * as React from "react"
import { Navbar } from "./Navbar"
import { Sidebar } from "./Sidebar"

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col bg-base text-white">
      <Navbar />
      <div className="flex-1 items-start md:grid md:grid-cols-[256px_minmax(0,1fr)]">
        <Sidebar />
        <main className="relative py-6 lg:gap-10 lg:py-8 xl:grid xl:grid-cols-[1fr_300px]">
          <div className="mx-auto w-full min-w-0 px-4 md:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
