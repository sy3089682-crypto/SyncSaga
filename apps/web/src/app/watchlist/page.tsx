"use client"

import React from "react"
import { useAuthStore } from "@/store"
import { Card, CardHeader, CardTitle, CardContent, Button } from "@syncsaga/ui"
import { Play } from "lucide-react"

export default function WatchlistPage() {
  const { user } = useAuthStore()

  if (!user) {
    return <div className="p-8 text-center text-muted-foreground">Please log in to view your watchlist.</div>
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Your Watchlist</h1>
        <p className="text-muted-foreground">Keep track of anime you want to watch</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="overflow-hidden border-border-strong group cursor-pointer hover:border-accent-purple transition-all">
            <div className="aspect-[2/3] bg-elevated relative">
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button variant="secondary" size="icon" className="rounded-full w-12 h-12">
                  <Play className="w-6 h-6 ml-1" />
                </Button>
              </div>
            </div>
            <CardContent className="p-4">
              <h3 className="font-semibold line-clamp-1">Anime Title {i}</h3>
              <p className="text-xs text-muted-foreground mt-1">Plan to Watch</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
