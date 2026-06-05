"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button, Input, Card, CardHeader, CardTitle, CardContent, CardFooter } from "@syncsaga/ui"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store"
import toast from "react-hot-toast"
import { v4 as uuidv4 } from "uuid"

export default function CreateRoomPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [name, setName] = useState("")
  const [animeId, setAnimeId] = useState("")
  const [episode, setEpisode] = useState("")
  const [loading, setLoading] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      toast.error("You must be logged in to create a room")
      return
    }

    setLoading(true)
    const slug = \`\${name.toLowerCase().replace(/\\s+/g, '-')}-\${uuidv4().substring(0, 8)}\`
    
    try {
      const { error } = await supabase.from('rooms').insert({
        name,
        slug,
        host_id: user.id,
        anime_id: parseInt(animeId) || null,
        episode_number: parseInt(episode) || null,
        is_public: true
      })

      if (error) throw error

      toast.success("Room created!")
      router.push(\`/rooms/\${slug}\`)
    } catch (error: any) {
      toast.error(error.message || "Failed to create room")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card>
        <form onSubmit={handleCreate}>
          <CardHeader>
            <CardTitle>Create a Watch Party</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Room Name</label>
              <Input
                required
                placeholder="Late Night Anime"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Anime ID (MAL)</label>
                <Input
                  type="number"
                  placeholder="e.g. 1"
                  value={animeId}
                  onChange={(e) => setAnimeId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Episode</label>
                <Input
                  type="number"
                  placeholder="e.g. 1"
                  value={episode}
                  onChange={(e) => setEpisode(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creating..." : "Create Room"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
