"use client"

import React from "react"
import { Input, Card, CardContent } from "@syncsaga/ui"
import { Search, Compass } from "lucide-react"

export default function ExplorePage() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
        <Compass className="w-16 h-16 text-accent-purple" />
        <h1 className="text-4xl font-bold tracking-tight">Explore Anime</h1>
        <p className="text-muted-foreground max-w-lg">
          Search for your favorite shows and find active rooms watching them.
        </p>
        <div className="relative w-full max-w-xl mt-4">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Search anime by title, genre, or studio..." 
            className="pl-10 h-12 text-lg"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
          <Card key={i} className="overflow-hidden border-border-strong group cursor-pointer hover:border-accent-purple transition-all">
            <div className="aspect-[2/3] bg-elevated relative">
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                 <span className="text-sm font-semibold">View Details</span>
              </div>
            </div>
            <CardContent className="p-3">
              <h3 className="font-semibold line-clamp-1 text-sm">Trending Anime {i}</h3>
              <p className="text-xs text-muted-foreground mt-1">Action, Fantasy</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
