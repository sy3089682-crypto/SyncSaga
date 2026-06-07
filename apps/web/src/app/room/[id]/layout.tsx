import { Metadata } from 'next';
import { createServerSupabase } from '@/lib/supabase/server';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const supabase = await createServerSupabase();
  const { data: room } = await supabase
    .from('rooms')
    .select('name, description, anime_image')
    .eq('id', params.id)
    .single();

  if (!room) {
    return {
      title: 'Room Not Found | SyncSaga',
    };
  }

  return {
    title: `${room.name} | SyncSaga`,
    description: room.description || `Join ${room.name} and watch anime together on SyncSaga!`,
    openGraph: {
      title: `${room.name} | SyncSaga Watch Party`,
      description: room.description || `Join the watch party on SyncSaga!`,
      images: room.anime_image ? [{ url: room.anime_image }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${room.name} | SyncSaga Watch Party`,
      description: room.description || `Join the watch party on SyncSaga!`,
      images: room.anime_image ? [room.anime_image] : [],
    }
  };
}

export default function RoomLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
