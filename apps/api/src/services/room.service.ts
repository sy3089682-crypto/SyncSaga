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
  }): Promise<Room | null> {
    const insertData: any = {
      name: data.name,
      description: data.description,
      is_private: data.isPrivate ?? false,
      max_users: data.maxUsers ?? 10,
      host_id: data.hostId,
    };
    if (data.animeTitle) insertData.anime_title = data.animeTitle;
    if (data.animeMediaId) insertData.anime_media_id = data.animeMediaId;

    const { data: room, error } = await supabase
      .from('rooms')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      logger.error(error, 'Failed to create room:');
      return null;
    }

    const { error: memberError } = await supabase.from('room_members').insert({
      room_id: room.id,
      user_id: data.hostId,
      role: 'host',
    });

    if (memberError) {
      logger.error(memberError, 'Failed to add host as member');
      await supabase.from('rooms').delete().eq('id', room.id);
      return null;
    }

    await redisService.setRoomState(room.id, {
      host_id: data.hostId,
      playback_position: 0,
      playback_state: 'paused',
      playback_speed: 1,
      sync_lock: false,
    });

    return room as Room;
  }

  async getRoom(roomId: string): Promise<(Room & { members: RoomMember[] }) | null> {
    const { data: room, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (error || !room) return null;

    const { data: members } = await supabase
      .from('room_members')
      .select('*')
      .eq('room_id', roomId)
      .eq('is_banned', false);

    return { ...room, members: members || [] } as Room & { members: RoomMember[] };
  }

  async joinRoom(roomId: string, userId: string, password?: string): Promise<{ success: boolean; error?: string }> {
    const room = await this.getRoom(roomId);
    if (!room) return { success: false, error: 'Room not found' };

    const isBanned = (room as any).banned_users?.includes(userId);
    if (isBanned) return { success: false, error: 'BANNED' };

    const isMember = room.members.some(m => m.user_id === userId);
    if (isMember) return { success: true };

    if (room.members.length >= room.max_users) return { success: false, error: 'ROOM_FULL' };

    if (room.is_private) {
      if (!password) return { success: false, error: 'PASSWORD_REQUIRED' };
      if (password !== (room as any).password_hash) return { success: false, error: 'INVALID_PASSWORD' };
    }

    const { error } = await supabase
      .from('room_members')
      .insert({ room_id: roomId, user_id: userId, role: 'member' });

    if (error) return { success: false, error: error.message };

    await redisService.addUserToRoom(roomId, userId, 'unknown');
    return { success: true };
  }

  async leaveRoom(roomId: string, userId: string): Promise<void> {
    await supabase
      .from('room_members')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', userId);
    await redisService.removeUserFromRoom(roomId, userId);
  }

  async updateRoomState(roomId: string, state: Partial<Room>): Promise<void> {
    const existingState = await redisService.getRoomState(roomId) || {};

    await redisService.setRoomState(roomId, { ...existingState, ...state });

    const supabaseFields: any = {};
    if (state.name !== undefined) supabaseFields.name = state.name;
    if (state.description !== undefined) supabaseFields.description = state.description;
    if (state.is_private !== undefined) supabaseFields.is_private = state.is_private;
    if (state.max_users !== undefined) supabaseFields.max_users = state.max_users;
    if (state.current_episode !== undefined) supabaseFields.current_episode = state.current_episode;
    if (state.current_episode_number !== undefined) supabaseFields.current_episode_number = state.current_episode_number;
    if (state.host_id !== undefined) supabaseFields.host_id = state.host_id;

    if (Object.keys(supabaseFields).length > 0) {
      await supabase.from('rooms').update(supabaseFields).eq('id', roomId);
    }
  }

  async getPublicRooms(limit = 20): Promise<Room[]> {
    const { data } = await supabase
      .from('rooms')
      .select('*')
      .eq('is_private', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    return (data || []) as Room[];
  }
}

export const roomService = new RoomService();
