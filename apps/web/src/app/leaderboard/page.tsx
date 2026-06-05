"use client"

import React from "react"
import { Card, CardHeader, CardTitle, CardContent, Avatar, AvatarImage, AvatarFallback } from "@syncsaga/ui"
import { Trophy, Medal, Star } from "lucide-react"

export default function LeaderboardPage() {
  const users = [
    { rank: 1, name: "OtakuKing", score: 15420, level: 42, avatar: "user1" },
    { rank: 2, name: "AnimeWatcher", score: 12050, level: 38, avatar: "user2" },
    { rank: 3, name: "SyncMaster", score: 9800, level: 31, avatar: "user3" },
    { rank: 4, name: "WeebLord", score: 8750, level: 29, avatar: "user4" },
    { rank: 5, name: "BingeQueen", score: 7200, level: 25, avatar: "user5" },
  ]

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="w-6 h-6 text-yellow-500" />
      case 2: return <Medal className="w-6 h-6 text-gray-400" />
      case 3: return <Medal className="w-6 h-6 text-amber-700" />
      default: return <span className="font-bold text-muted-foreground w-6 text-center">{rank}</span>
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Trophy className="w-16 h-16 text-accent-purple mb-4" />
        <h1 className="text-4xl font-bold tracking-tight mb-2">Global Leaderboard</h1>
        <p className="text-muted-foreground max-w-lg">
          Top watchers and most active community members. Earn XP by watching anime together!
        </p>
      </div>

      <Card className="border-border-strong overflow-hidden">
        <div className="flex bg-elevated border-b border-border-strong p-4 text-sm font-semibold text-muted-foreground">
          <div className="w-16 text-center">Rank</div>
          <div className="flex-1">User</div>
          <div className="w-32 text-right">Level</div>
          <div className="w-32 text-right">XP Score</div>
        </div>
        <div className="divide-y divide-border-strong">
          {users.map((u) => (
            <div key={u.rank} className="flex items-center p-4 hover:bg-elevated/50 transition-colors">
              <div className="w-16 flex justify-center">{getRankIcon(u.rank)}</div>
              <div className="flex-1 flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${u.avatar}`} />
                  <AvatarFallback>{u.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="font-semibold text-white">{u.name}</span>
              </div>
              <div className="w-32 text-right flex items-center justify-end gap-1">
                <Star className="w-4 h-4 text-yellow-500" />
                <span className="font-mono">{u.level}</span>
              </div>
              <div className="w-32 text-right font-mono text-accent-purple font-bold">
                {u.score.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
