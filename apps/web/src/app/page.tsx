"use client"

import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from "@syncsaga/ui"
import Link from "next/link"
import { Play, Users, Sparkles } from "lucide-react"

export default function HomePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome to SyncSaga</h1>
        <p className="text-muted-foreground">Watch anime together. Anywhere.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-accent-purple" />
              Active Rooms
            </CardTitle>
            <CardDescription>Join a room to start watching</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground bg-elevated/50 rounded-sm">
              <p>No active rooms found.</p>
              <Button variant="link" asChild className="mt-2">
                <Link href="/rooms/create">Create a room</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-2 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent-purple" />
              AI Recommended
            </CardTitle>
            <CardDescription>Based on your watch history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="group relative overflow-hidden rounded-sm bg-elevated aspect-[2/3] cursor-pointer border border-border-strong transition-all hover:border-accent-purple">
                  <div className="absolute inset-0 bg-gradient-to-t from-base to-transparent opacity-80" />
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <p className="font-semibold line-clamp-2 mb-1">Anime Title {i}</p>
                    <Button size="sm" variant="secondary" className="w-full text-xs">
                      <Play className="w-3 h-3 mr-1" /> Watch
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
