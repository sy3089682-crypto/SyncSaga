import { supabase } from '../lib/supabase';
import { redisService } from './redis.service';
import { Room, RoomMember } from '@syncsaga/shared';
import { logger } from '../lib/logger';
import * as bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;
const MAX_ROOM_USERS = 50;

export class RoomService {
  /**
   * Create a new room with hashed password if private.
   */
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
    const insertData: Record<string, unknown> = {
      name: data.name,
      description: data.description,
      is_private: data.isPrivate ?? false,
      max_users: Math.min(data.maxUsers ?? 10, MAX_ROOM_USERS),
      host_id: data.hostId,
    };

    // Hash password if provided
    if (data.password) {
      insertData.password = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    }

    if (data.animeTitle) insertData.anime_title = data.animeTitle;
    if (data.animeMediaId) insertData.anime_media_id = data.animeMediaId;

    const { data: room, error } = await supabase.from('rooms').insert(insertData).select().single();
    if (error) {
      logger.error({ err: error }, 'Failed to create room');
      return null;
    }

    // Add host as first member
    const { error: memberError } = await supabase
      .from('room_members')
      .insert({ room_id: room.id, user_id: data.hostId, role: 'host' });

    if (memberError) {
      logger.error({ err: memberError, roomId: room.id }, 'Failed to add host as room member');
    }

    return room as Room;
  }

  /**
   * Get a room by ID with members.
   * Password is excluded from the returned object.
   */
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

    // Never return the password hash to the client
    const { password: _pwd, ...roomWithoutPassword } = room;
    return { ...roomWithoutPassword, members: (members || []) as RoomMember[] } as Room & { members: RoomMember[] };
  }

  /**
   * Join a room with password verification and capacity check.
   * Uses a distributed lock to prevent race conditions on max_users.
   */
  async joinRoom(roomId: string, userId: string, password?: string): Promise<boolean> {
    const room = await this.getRoom(roomId);
    if (!room) return false;

    // Check if already a member
    const isMember = room.members.some(m => m.user_id === userId);
    if (isMember) return true;

    // Check capacity
    if (room.members.length >= room.max_users) return false;

    // Verify password for private rooms
    if (room.is_private) {
      // Fetch the password hash separately (not returned by getRoom)
      const { data: roomData } = await supabase
        .from('rooms')
        .select('password')
        .eq('id', roomId)
        .single();

      if (!roomData?.password) return false;
      const passwordValid = await bcrypt.compare(password || '', roomData.password);
      if (!passwordValid) return false;
    }

    // Use distributed lock to prevent concurrent join race
    const lockId = await redisService.acquireLock(`room:join:${roomId}`, 2000);
    if (!lockId) {
      // Another join in progress — retry once
      await new Promise(resolve => setTimeout(resolve, 100));
      const retryLock = await redisService.acquireLock(`room:join:${roomId}`, 2000);
      if (!retryLock) return false;
      try {
        // Re-check capacity under lock
        const { count } = await supabase
          .from('room_members')
          .select('*', { count: 'exact', head: true })
          .eq('room_id', roomId)
          .eq('is_banned', false);

        if ((count || 0) >= room.max_users) return false;

        const { error } = await supabase
          .from('room_members')
          .insert({ room_id: roomId, user_id: userId, role: 'member' });
        return !error;
      } finally {
        await redisService.releaseLock(`room:join:${roomId}`, retryLock);
      }
    }

    try {
      const { error } = await supabase
        .from('room_members')
        .insert({ room_id: roomId, user_id: userId, role: 'member' });
      return !error;
    } finally {
      await redisService.releaseLock(`room:join:${roomId}`, lockId);
    }
  }

  /**
   * Leave a room and clean up Redis presence.
   */
  async leaveRoom(roomId: string, userId: string): Promise<void> {
    await supabase
      .from('room_members')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', userId);
    await redisService.removeUserFromRoom(roomId, userId);
  }

  /**
   * Update room state in both database and Redis cache.
   */
  async updateRoomState(roomId: string, state: Partial<Room>): Promise<void> {
    const allowed = ['playback_state', 'current_timestamp', 'playback_speed', 'current_episode', 'current_episode_number', 'updated_at'] as const;
    const safeState: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in state) safeState[key] = (state as Record<string, unknown>)[key];
    }
    const { error } = await supabase.from('rooms').update(safeState).eq('id', roomId);
    if (error) {
      logger.error({ err: error, roomId }, 'Failed to update room in database');
    }
    await redisService.setRoomState(roomId, safeState);
  }

  /**
   * Get public rooms with pagination.
   */
  async getPublicRooms(limit = 20, offset = 0): Promise<Room[]> {
    const { data } = await supabase
      .from('rooms')
      .select('*')
      .eq('is_private', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    return (data || []) as Room[];
  }
}

export const roomService = new RoomService();
