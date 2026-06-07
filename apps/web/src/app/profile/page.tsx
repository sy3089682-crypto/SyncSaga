"use client"

import React from "react"
import { useAuthStore } from "@/store"
import { Card, CardHeader, CardTitle, CardContent, Avatar, AvatarImage, AvatarFallback, Button } from "@syncsaga/ui"
import { WatchHistory } from '@/components/profile/WatchHistory';
import { Trophy, Star, Clock } from "lucide-react"

export default function ProfilePage() {
  const { user, profile } = useAuthStore()

  if (!user) {
    return <div className="p-8 text-center text-muted-foreground">Please log in to view your profile.</div>
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card className="overflow-hidden border-border-strong">
        <div className="h-32 bg-accent-purple/20 bg-gradient-to-r from-accent-purple/40 to-transparent" />
        <div className="px-6 pb-6 relative">
          <Avatar className="w-24 h-24 border-4 border-base absolute -top-12">
            <AvatarImage src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.username || user.email}`} />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
          <div className="mt-14 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold">{profile?.display_name || profile?.username || 'User'}</h1>
              <p className="text-muted-foreground">@{profile?.username || 'user'}</p>
            </div>
            <Button variant="outline">Edit Profile</Button>
          </div>
          <div className="mt-6 flex gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span>Level {profile?.level || 1}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-yellow-400">{profile?.synccoins || 0}</span>
              <span className="text-muted-foreground">SyncCoins</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-accent-purple" />
              Recent History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No recent history.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="w-5 h-5 text-accent-purple" />
              Top Anime
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No anime rated yet.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
