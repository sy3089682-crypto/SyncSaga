'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface MemberProfile {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

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

export function memberLabel(userId: string, profile?: MemberProfile) {
  return profile?.display_name || profile?.username || 'Guest';
}
