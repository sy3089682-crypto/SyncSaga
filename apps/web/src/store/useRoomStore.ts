import { create } from 'zustand';

interface RoomMember {
  id: string;
  userId: string;
  username?: string;
  avatarUrl?: string;
  role: 'host' | 'co_host' | 'moderator' | 'member';
}

interface RoomState {
  roomId: string | null;
  roomSlug: string | null;
  members: RoomMember[];
  playbackState: 'playing' | 'paused' | 'buffering';
  playbackPosition: number;
  animeId: number | null;
  episodeNumber: number | null;
  setRoom: (roomId: string, slug: string) => void;
  setMembers: (members: RoomMember[]) => void;
  updatePlayback: (state: 'playing' | 'paused' | 'buffering', position: number) => void;
  setAnime: (animeId: number, episode: number) => void;
  clearRoom: () => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  roomId: null,
  roomSlug: null,
  members: [],
  playbackState: 'paused',
  playbackPosition: 0,
  animeId: null,
  episodeNumber: null,
  setRoom: (roomId, roomSlug) => set({ roomId, roomSlug }),
  setMembers: (members) => set({ members }),
  updatePlayback: (playbackState, playbackPosition) => set({ playbackState, playbackPosition }),
  setAnime: (animeId, episodeNumber) => set({ animeId, episodeNumber }),
  clearRoom: () => set({
    roomId: null,
    roomSlug: null,
    members: [],
    playbackState: 'paused',
    playbackPosition: 0,
    animeId: null,
    episodeNumber: null,
  }),
}));
