'use client';

import { motion } from 'framer-motion';
import { Plus, Users, Lock, Globe, Tv } from 'lucide-react';
import Link from 'next/link';
import { useAppStore } from '@/store/useAppStore';

const mockRooms = [
  { id: '1', name: 'Attack on Titan Finale', users: 12, maxUsers: 20, isPrivate: false, host: 'ErenYeager' },
  { id: '2', name: 'Demon Slayer Watch', users: 8, maxUsers: 15, isPrivate: false, host: 'Tanjiro' },
  { id: '3', name: 'JJK Shibuya Arc', users: 24, maxUsers: 50, isPrivate: false, host: 'GojoSatoru' },
  { id: '4', name: 'One Piece Egghead', users: 35, maxUsers: 50, isPrivate: false, host: 'Luffy' },
  { id: '5', name: 'Friends Only', users: 3, maxUsers: 10, isPrivate: true, host: 'You' },
];

export default function DashboardPage() {
  const { user } = useAppStore();

  return (
    <div className="min-h-screen bg-background text-text-primary">
      {/* Header */}
      <header className="border-b border-border glass sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent-cyan flex items-center justify-center">
                <Tv className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">SyncSaga</span>
            </div>
            <div className="flex items-center gap-4">
              <button className="p-2 rounded-lg hover:bg-surface-light transition-colors">
                <Users className="w-5 h-5" />
              </button>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent-pink flex items-center justify-center text-sm font-semibold">
                {user?.username?.[0]?.toUpperCase() || 'U'}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold mb-2">
            Welcome back{user?.display_name ? `, ${user.display_name}` : ''}
          </h1>
          <p className="text-text-secondary">Find a room or create your own watch party.</p>
        </motion.div>

        {/* Actions */}
        <div className="flex flex-wrap gap-4 mb-10">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Room
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-surface-light border border-border text-text-primary font-semibold hover:border-primary/50 transition-colors"
          >
            <Globe className="w-5 h-5" />
            Browse Public
          </motion.button>
        </div>

        {/* Rooms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockRooms.map((room, i) => (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link href={`/room/${room.id}`}>
                <div className="group p-5 rounded-2xl bg-card-gradient border border-border hover:border-primary/30 transition-all hover:-translate-y-1 cursor-pointer">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                      {room.name}
                    </h3>
                    {room.isPrivate && <Lock className="w-4 h-4 text-text-muted" />}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-text-secondary">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {room.users}/{room.maxUsers}
                    </span>
                    <span>Host: {room.host}</span>
                  </div>
                  <div className="mt-3 w-full bg-surface rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-accent-cyan rounded-full"
                      style={{ width: `${(room.users / room.maxUsers) * 100}%` }}
                    />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
