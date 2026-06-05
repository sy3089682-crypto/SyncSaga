import { createServerSupabase } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Room } from '@syncsaga/types'

export const metadata = { title: 'Dashboard — SyncSaga' }

export default async function DashboardPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: profile }, { data: rooms }, { data: friends }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('rooms').select('*, host:profiles!rooms_host_id_fkey(username,avatar_url)').is('ended_at', null).eq('is_public', true).order('member_count', { ascending: false }).limit(12),
    supabase.from('friends').select('*, friend:profiles!friends_friend_id_fkey(id,username,avatar_url,status,custom_status)').eq('user_id', user.id).eq('status', 'accepted').limit(20),
  ])

  const onlineFriends = (friends ?? []).filter((f: any) => f.friend?.status === 'online' || f.friend?.status === 'watching')

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <nav className="border-b border-[#1a1a1a] bg-[#0a0a0a]/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-xl font-black text-[#00d4ff]">SyncSaga</span>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/dashboard" className="text-white">Home</Link>
              <Link href="/discover" className="text-[#666] hover:text-white transition-colors">Discover</Link>
              <Link href="/friends" className="text-[#666] hover:text-white transition-colors">Friends</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#00d4ff] font-mono">{(profile as any)?.synccoins ?? 0} 🪙</span>
            <Link href={`/profile/${profile?.username}`}>
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full border border-[#1a1a1a]"/>
                : <div className="w-8 h-8 bg-[#00d4ff] flex items-center justify-center text-black text-sm font-bold">{profile?.username?.[0]?.toUpperCase()}</div>
              }
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-12 gap-6">
          {/* Main content */}
          <div className="col-span-12 lg:col-span-8">
            {/* Welcome */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-white">Welcome back, <span className="text-[#00d4ff]">{profile?.display_name ?? profile?.username}</span></h1>
              <p className="text-[#444] text-sm mt-1">What are you watching today?</p>
            </div>

            {/* Quick create */}
            <div className="bg-[#111] border border-[#1a1a1a] p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[#666]">Live Rooms</h2>
                <Link href="/room/create" className="bg-[#00d4ff] text-black text-sm font-bold px-4 py-2 hover:bg-[#00b8d9] transition-colors">
                  + Create Room
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(rooms ?? []).map((room: any) => (
                  <Link
                    key={room.id}
                    href={`/room/${room.slug ?? room.id}`}
                    className="flex gap-3 p-3 bg-[#0a0a0a] border border-[#1a1a1a] hover:border-[#00d4ff]/30 transition-colors group"
                  >
                    {room.anime_image && (
                      <img src={room.anime_image} alt="" className="w-12 h-16 object-cover flex-shrink-0"/>
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate group-hover:text-[#00d4ff] transition-colors">{room.name}</div>
                      <div className="text-xs text-[#444] truncate mt-0.5">{room.anime_title ?? 'No anime set'}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="flex items-center gap-1 text-xs text-[#666]">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"/>
                          {room.member_count ?? 0} watching
                        </span>
                        {room.theme && room.theme !== 'default' && (
                          <span className="text-xs bg-[#1a1a1a] px-2 py-0.5 text-[#666]">{room.theme}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
                {(!rooms || rooms.length === 0) && (
                  <div className="col-span-2 text-center py-12 text-[#444]">
                    <p>No active rooms. <Link href="/room/create" className="text-[#00d4ff]">Create one!</Link></p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            {/* Profile card */}
            <div className="bg-[#111] border border-[#1a1a1a] p-4">
              <div className="flex items-center gap-3 mb-4">
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" className="w-12 h-12 border border-[#1a1a1a]"/>
                  : <div className="w-12 h-12 bg-[#00d4ff] flex items-center justify-center text-black font-black text-lg">{profile?.username?.[0]?.toUpperCase()}</div>
                }
                <div>
                  <div className="font-semibold text-white">{profile?.username}</div>
                  <div className="text-xs text-[#444] capitalize">{(profile as any)?.rank ?? 'newcomer'}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-[#0a0a0a] p-2">
                  <div className="text-lg font-mono font-bold text-[#00d4ff]">{(profile as any)?.level ?? 1}</div>
                  <div className="text-[10px] text-[#444] uppercase">Level</div>
                </div>
                <div className="bg-[#0a0a0a] p-2">
                  <div className="text-lg font-mono font-bold text-[#00d4ff]">{(profile as any)?.xp ?? 0}</div>
                  <div className="text-[10px] text-[#444] uppercase">XP</div>
                </div>
                <div className="bg-[#0a0a0a] p-2">
                  <div className="text-lg font-mono font-bold text-[#00d4ff]">{(profile as any)?.streak_days ?? 0}</div>
                  <div className="text-[10px] text-[#444] uppercase">Streak</div>
                </div>
              </div>
            </div>

            {/* Online friends */}
            {onlineFriends.length > 0 && (
              <div className="bg-[#111] border border-[#1a1a1a] p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#666] mb-3">Online Friends ({onlineFriends.length})</h3>
                <div className="space-y-2">
                  {onlineFriends.map((f: any) => (
                    <Link key={f.id} href={`/profile/${f.friend.username}`} className="flex items-center gap-2 hover:bg-[#1a1a1a] p-2 -mx-2 transition-colors">
                      <div className="relative">
                        {f.friend.avatar_url
                          ? <img src={f.friend.avatar_url} alt="" className="w-8 h-8"/>
                          : <div className="w-8 h-8 bg-[#333] flex items-center justify-center text-white text-xs">{f.friend.username[0]?.toUpperCase()}</div>
                        }
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-[#111] ${
                          f.friend.status === 'watching' ? 'bg-purple-500' : 'bg-green-500'
                        }`}/>
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm text-white truncate">{f.friend.username}</div>
                        <div className="text-xs text-[#444] truncate">{f.friend.custom_status ?? f.friend.status}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
