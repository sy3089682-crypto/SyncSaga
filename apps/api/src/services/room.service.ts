import { supabase } from '../lib/supabase';
import { redisService } from './redis.service';
import { Room, RoomMember } from '@syncsaga/types';
import { logger } from '../lib/logger';
import { hashRoomPassword, verifyRoomPassword } from '../lib/crypto';

export type PublicRoomCursor = {
  createdAt: string;
  id: string;
};

export type PublicRoomsOptions = {
  limit?: number;
  cursor?: PublicRoomCursor;
  animeMediaId?: number;
  search?: string;
};

function encodeCursor(room: Room): string {
  return Buffer.from(JSON.stringify({ createdAt: room.created_at, id: room.id })).toString('base64url');
}

export function decodeRoomCursor(cursor?: string): PublicRoomCursor | undefined {
  if (!cursor) return undefined;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as PublicRoomCursor;
    if (!parsed.createdAt || !parsed.id) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

function redactRoom<T extends Room>(room: T): Omit<T, 'password_hash'> {
  const safeRoom = { ...room };
  delete safeRoom.password_hash;
  return safeRoom;
}

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
    };
    if (data.animeTitle) insertData.anime_title = data.animeTitle;
    if (data.animeMediaId) insertData.anime_media_id = data.animeMediaId;
    if (data.isPrivate) {
      if (!data.password) {
        logger.warn({ hostId: data.hostId }, 'Private room creation attempted without a password');
        return null;
      }
      insertData.password_hash = await hashRoomPassword(data.password);
    }

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

    return redactRoom(room as Room) as Room;
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

    return redactRoom({ ...room, members: members || [] } as Room & { members: RoomMember[] }) as Room & { members: RoomMember[] };
  }

  private async getRoomWithSecret(roomId: string): Promise<(Room & { members: RoomMember[] }) | null> {
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
    const room = await this.getRoomWithSecret(roomId);
    if (!room) return { success: false, error: 'Room not found' };

    const isBanned = (room as any).banned_users?.includes(userId);
    if (isBanned) return { success: false, error: 'BANNED' };

    const isMember = room.members.some(m => m.user_id === userId);
    if (isMember) return { success: true };

    const maxUsers = room.max_users ?? room.max_members ?? 50;
    if (room.members.length >= maxUsers) return { success: false, error: 'ROOM_FULL' };

    if (room.is_private) {
      if (!password) return { success: false, error: 'PASSWORD_REQUIRED' };
      if (!room.password_hash || !(await verifyRoomPassword(password, room.password_hash))) {
        return { success: false, error: 'INVALID_PASSWORD' };
      }
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

  async getPublicRooms(options: number | PublicRoomsOptions = 20): Promise<Room[]> {
    const config = typeof options === 'number' ? { limit: options } : options;
    const limit = Math.min(Math.max(config.limit ?? 20, 1), 50);

    let query = supabase
      .from('rooms')
      .select('*')
      .eq('is_private', false)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit + 1);

    if (config.animeMediaId) query = query.eq('anime_media_id', config.animeMediaId);
    if (config.search) query = query.ilike('name', `%${config.search}%`);
    if (config.cursor) {
      query = query.or(`created_at.lt.${config.cursor.createdAt},and(created_at.eq.${config.cursor.createdAt},id.lt.${config.cursor.id})`);
    }

    const { data } = await query;
    const rows = ((data || []) as Room[]).map((room) => redactRoom(room) as Room);
    return rows.slice(0, limit);
  }

  async getPublicRoomsPage(options: PublicRoomsOptions = {}): Promise<{ rooms: Room[]; nextCursor: string | null }> {
    const limit = Math.min(Math.max(options.limit ?? 20, 1), 50);
    const rooms = await this.getPublicRooms({ ...options, limit });
    const nextCursor = rooms.length === limit ? encodeCursor(rooms[rooms.length - 1]) : null;
    return { rooms, nextCursor };
  }
}

export const roomService = new RoomService();
