'use client';

import { motion } from 'framer-motion';
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  Zap,
  Calendar,
  Target,
  Award,
} from 'lucide-react';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function DashboardOverview() {
  const stats = [
    {
      label: 'Productivity Score',
      value: '87%',
      icon: TrendingUp,
      color: 'from-green-400 to-blue-500',
      trend: '+12% this week',
    },
    {
      label: 'Tasks Completed',
      value: '24',
      icon: CheckCircle2,
      color: 'from-blue-400 to-cyan-500',
      trend: '3 more than last week',
    },
    {
      label: 'Hours Focused',
      value: '18.5',
      icon: Clock,
      color: 'from-purple-400 to-pink-500',
      trend: 'Avg 3.7h per day',
    },
    {
      label: 'Streak',
      value: '12 days',
      icon: Zap,
      color: 'from-orange-400 to-red-500',
      trend: 'Keep it up!',
    },
  ];

  const upcomingEvents = [
    {
      title: 'Design System Review',
      time: '10:00 AM',
      category: 'Meeting',
      priority: 'high',
    },
    {
      title: 'Project Planning',
      time: '2:00 PM',
      category: 'Work',
      priority: 'medium',
    },
    {
      title: 'Team Standup',
      time: '4:00 PM',
      category: 'Meeting',
      priority: 'low',
    },
  ];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      {/* Stats Grid */}
      <motion.div
        variants={container}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <motion.div key={idx} variants={item}>
              <div className="glass-card p-6 hover:shadow-lg">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {stat.label}
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {stat.value}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 font-500">
                  {stat.trend}
                </p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Main Content Grid */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upcoming Events */}
        <div className="lg:col-span-2">
          <div className="glass-card p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                Today&apos;s Schedule
              </h3>
              <button className="text-sm font-500 text-green-600 dark:text-green-400 hover:underline">
                View all
              </button>
            </div>

            <div className="space-y-4">
              {upcomingEvents.map((event, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold">
                    {event.time.split(':')[0]}
                  </div>
                  <div className="flex-1">
                    <p className="font-600 text-gray-900 dark:text-white">
                      {event.title}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {event.time}
                    </p>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-600 ${
                      event.priority === 'high'
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        : event.priority === 'medium'
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    }`}
                  >
                    {event.priority}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <motion.div variants={item} className="space-y-4">
          <div className="glass-card p-8">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Target className="w-5 h-5 text-green-500" />
              Goals
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <p className="text-sm font-500 text-gray-700 dark:text-gray-300">
                    Exercise
                  </p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">75%</p>
                </div>
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-400 to-blue-500 w-3/4 rounded-full" />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <p className="text-sm font-500 text-gray-700 dark:text-gray-300">
                    Reading
                  </p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">40%</p>
                </div>
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-400 to-pink-500 w-2/5 rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Achievement */}
          <div className="glass-card p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mx-auto mb-4 text-2xl">
              🏆
            </div>
            <p className="text-sm font-600 text-gray-900 dark:text-white">
              Productivity Master
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
              Unlocked - 7 day streak
            </p>
          </div>
        </motion.div>
      </motion.div>

      {/* Weekly Activity */}
      <motion.div variants={item}>
        <div className="glass-card p-8">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Award className="w-5 h-5 text-purple-500" />
            Weekly Activity
          </h3>
          <div className="grid grid-cols-7 gap-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => {
              const height = Math.random() * 100;
              return (
                <div key={idx} className="flex flex-col items-center gap-2">
                  <div className="flex-1 w-8 bg-gray-200 dark:bg-gray-700 rounded-lg relative overflow-hidden">
                    <div
                      className="absolute bottom-0 w-full bg-gradient-to-t from-green-500 to-blue-400 rounded-lg transition-all duration-300 hover:from-green-600 hover:to-blue-500"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <p className="text-xs font-500 text-gray-600 dark:text-gray-400">
                    {day}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
