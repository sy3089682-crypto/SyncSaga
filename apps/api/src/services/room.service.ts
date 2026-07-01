import { supabase } from '../lib/supabase';
import { redisService } from './redis.service';
import { Room, RoomMember } from '@syncsaga/shared';
import { logger } from '../lib/logger';

export class RoomService {
  async createRoom(data: {
    name: string;
    description?: string;
    isPrivate?: boolean;
    maxUsers?: number;
    hostId: string;
    animeTitle?: string;
    animeMediaId?: number;
    password?: string;
  }): Promise<Room | null> {
    const insertData: any = {
      name: data.name,
      description: data.description,
      is_private: data.isPrivate ?? false,
      max_users: data.maxUsers ?? 10,
      host_id: data.hostId,
      password: data.password,
    };
    if (data.animeTitle) insertData.anime_title = data.animeTitle;
    if (data.animeMediaId) insertData.anime_media_id = data.animeMediaId;

    const { data: room, error } = await supabase.from('rooms').insert(insertData).select().single();
    if (error) {
      logger.error('Failed to create room:', error as Error);
      return null;
    }
    await supabase.from('room_members').insert({ room_id: room.id, user_id: data.hostId, role: 'host' });
    return room as Room;
  }

  async getRoom(roomId: string): Promise<(Room & { members: RoomMember[]; password?: string }) | null> {
    const { data: room, error } = await supabase.from('rooms').select('*').eq('id', roomId).single();
    if (error || !room) return null;
    const { data: members } = await supabase.from('room_members').select('*').eq('room_id', roomId).eq('is_banned', false);
    return { ...room, members: members || [], password: room.password } as Room & { members: RoomMember[]; password?: string };
  }

  async joinRoom(roomId: string, userId: string, password?: string): Promise<boolean> {
    const room = await this.getRoom(roomId);
    if (!room) return false;
    const isMember = room.members.some(m => m.user_id === userId);
    if (isMember) return true;
    if (room.members.length >= room.max_users) return false;
    if (room.is_private) {
      if (!password || password !== room.password) return false;
    }
    const { error } = await supabase.from('room_members').insert({ room_id: roomId, user_id: userId, role: 'member' });
    return !error;
  }

  async leaveRoom(roomId: string, userId: string): Promise<void> {
    await supabase.from('room_members').delete().eq('room_id', roomId).eq('user_id', userId);
    await redisService.removeUserFromRoom(roomId, userId);
  }

  async updateRoomState(roomId: string, state: Partial<Room>): Promise<void> {
    await supabase.from('rooms').update(state).eq('id', roomId);
    await redisService.setRoomState(roomId, state);
  }

  async getPublicRooms(limit = 20): Promise<Room[]> {
    const { data } = await supabase.from('rooms').select('*').eq('is_private', false).order('created_at', { ascending: false }).limit(limit);
    return (data || []) as Room[];
  }
}

export const roomService = new RoomService();