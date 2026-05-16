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
  }): Promise<Room | null> {
    const { data: room, error } = await supabase
      .from('rooms')
      .insert({
        name: data.name,
        description: data.description,
        is_private: data.isPrivate ?? false,
        max_users: data.maxUsers ?? 10,
        host_id: data.hostId,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create room:', error);
      return null;
    }

    // Add host as member
    await supabase.from('room_members').insert({
      room_id: room.id,
      user_id: data.hostId,
      role: 'host',
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

  async joinRoom(roomId: string, userId: string, password?: string): Promise<boolean> {
    const room = await this.getRoom(roomId);
    if (!room) return false;

    // Check if already member
    const isMember = room.members.some(m => m.user_id === userId);
    if (isMember) return true;

    // Check room capacity
    if (room.members.length >= room.max_users) return false;

    // Check password for private rooms
    if (room.is_private && password) {
      // TODO: Implement password verification
      // For now, allow if invited or has code
    }

    const { error } = await supabase
      .from('room_members')
      .insert({
        room_id: roomId,
        user_id: userId,
        role: 'member',
      });

    return !error;
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
    await supabase
      .from('rooms')
      .update(state)
      .eq('id', roomId);

    await redisService.setRoomState(roomId, state);
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
