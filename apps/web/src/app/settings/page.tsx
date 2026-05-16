'use client';

import { motion } from 'framer-motion';
import { Shield, Bell, Palette, Volume2, Keyboard, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const sections = [
  { icon: Palette, title: 'Appearance', description: 'Theme, accent color, layout' },
  { icon: Volume2, title: 'Voice & Audio', description: 'Input/output devices, noise suppression' },
  { icon: Bell, title: 'Notifications', description: 'Push notifications, sounds, badges' },
  { icon: Shield, title: 'Privacy & Safety', description: 'Blocked users, message filtering' },
  { icon: Keyboard, title: 'Keybinds', description: 'Push to talk, mute, shortcuts' },
  { icon: Users, title: 'Friend Requests', description: 'Who can send you requests' },
];

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-text-primary pb-20 lg:pb-0">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold mb-1">Settings</h1>
          <p className="text-text-secondary mb-8">Customize your SyncSaga experience</p>
        </motion.div>

        <div className="flex items-center gap-4 p-4 rounded-2xl bg-card-gradient border border-border mb-8">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent-pink flex items-center justify-center text-xl font-bold">
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <h3 className="font-semibold">{user?.display_name || user?.username || 'User'}</h3>
            <p className="text-sm text-text-secondary">@{user?.username}</p>
          </div>
          <button className="ml-auto px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors">
            Edit Profile
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sections.map(({ icon: Icon, title, description }, i) => (
            <motion.div key={title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group p-5 rounded-2xl bg-card-gradient border border-border hover:border-primary/30 transition-all cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{title}</h3>
                  <p className="text-sm text-text-secondary">{description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
