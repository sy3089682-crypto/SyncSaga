'use client';

import { motion } from 'framer-motion';
import { Clock, AlertCircle } from 'lucide-react';

export default function DashboardHeader() {
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="sticky top-20 bg-white/40 dark:bg-black/40 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-800/50 px-8 py-6"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{greeting}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            You have 3 tasks due today and 2 notes to review
          </p>
        </div>

        <div className="hidden md:flex items-center gap-6">
          {/* Quick Stats */}
          <div className="glass-card px-6 py-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Time Spent Today</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">4h 32m</p>
              </div>
            </div>
          </div>

          {/* Priority Alert */}
          <div className="glass-card px-6 py-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Priority Tasks</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">2 Pending</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
