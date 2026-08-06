'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface MemberProfile {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

/**
 * Resolves a set of user_ids to their profile (username/avatar) via Supabase.
 *
 * RoomMember records only carry `user_id` — without this, the UI has nothing
 * to show but the raw UUID, which is what the room member list used to do.
 * Results are cached in module scope for the session since profiles rarely
 * change mid-room.
 */
const cache = new Map<string, MemberProfile>();

export function useMemberProfiles(userIds: string[]) {
  const [profiles, setProfiles] = useState<Record<string, MemberProfile>>({});

  const key = userIds.slice().sort().join(',');

  useEffect(() => {
    const missing = userIds.filter((id) => id && !cache.has(id));
    if (missing.length === 0) {
      if (userIds.length) {
        const next: Record<string, MemberProfile> = {};
        userIds.forEach((id) => {
          const p = cache.get(id);
          if (p) next[id] = p;
        });
        setProfiles(next);
      }
      return;
    }

    let cancelled = false;
    supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', missing)
      .then(({ data }) => {
        if (cancelled || !data) return;
        data.forEach((row: any) => {
          cache.set(row.id, {
            username: row.username,
            display_name: row.display_name,
            avatar_url: row.avatar_url,
          });
        });
        const next: Record<string, MemberProfile> = {};
        userIds.forEach((id) => {
          const p = cache.get(id);
          if (p) next[id] = p;
        });
        setProfiles(next);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return profiles;
}

/** Best-effort display name — falls back gracefully, never to a raw UUID slice. */
export function memberLabel(userId: string, profile?: MemberProfile) {
  return profile?.display_name || profile?.username || 'Guest';
}
