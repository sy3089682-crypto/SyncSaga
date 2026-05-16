'use client';

import { motion } from 'framer-motion';
import { Settings, Calendar, Clock, Award, Edit2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-text-primary pb-20 lg:pb-0">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Banner */}
          <div className="h-48 rounded-2xl bg-gradient-to-r from-primary/30 via-accent-pink/20 to-accent-cyan/30 border border-border overflow-hidden relative mb-20">
            <button className="absolute top-4 right-4 p-2 rounded-xl bg-black/40 backdrop-blur text-white text-sm hover:bg-black/60 transition-colors">
              <Edit2 className="w-4 h-4" />
            </button>
          </div>

          {/* Avatar */}
          <div className="flex items-end gap-6 -mt-28 px-6 relative z-10">
            <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-primary to-accent-pink flex items-center justify-center text-4xl font-bold border-4 border-background shadow-xl">
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="pb-2">
              <h1 className="text-2xl font-bold">{user?.display_name || user?.username || 'User'}</h1>
              <p className="text-text-secondary">@{user?.username}</p>
            </div>
            <button className="ml-auto mb-2 px-5 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary-dark transition-colors">
              Edit Profile
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-8">
            {[
              { icon: Calendar, label: 'Joined', value: user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Today' },
              { icon: Clock, label: 'Watch Time', value: '0 hrs' },
              { icon: Award, label: 'Rooms Created', value: '0' },
            ].map(({ icon: Icon, label, value }, i) => (
              <motion.div key={label}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
                className="p-4 rounded-2xl bg-card-gradient border border-border text-center"
              >
                <Icon className="w-5 h-5 mx-auto mb-2 text-text-muted" />
                <p className="text-lg font-semibold">{value}</p>
                <p className="text-xs text-text-secondary">{label}</p>
              </motion.div>
            ))}
          </div>

          {/* Bio */}
          <div className="mt-8 p-5 rounded-2xl bg-card-gradient border border-border">
            <h3 className="font-semibold mb-2">Bio</h3>
            <p className="text-text-secondary">{user?.bio || 'No bio yet'}</p>
          </div>

          {/* Badges */}
          <div className="mt-6 p-5 rounded-2xl bg-card-gradient border border-border">
            <h3 className="font-semibold mb-4">Badges</h3>
            <div className="flex gap-3">
              <div className="px-4 py-2 rounded-xl bg-surface-light border border-border text-sm text-text-secondary">No badges yet</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
