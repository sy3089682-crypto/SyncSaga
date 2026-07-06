'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Sparkles,
  Plus,
  MoreVertical,
  TrendingUp,
  Target,
  Zap,
  Search,
  Bell,
  Moon,
  Sun,
} from 'lucide-react';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { Avatar } from '@/components/ui/Avatar';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: Calendar },
  { href: '/notes', label: 'Notes', icon: FileText },
  { href: '/tasks', label: 'Tasks', icon: CheckCircle2 },
  { href: '/calendar', label: 'Calendar', icon: Clock },
];

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [activeTab, setActiveTab] = useState('today');

  const toggleTheme = () => {
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
      html.classList.remove('dark');
      setIsDark(false);
    } else {
      html.classList.add('dark');
      setIsDark(true);
    }
  };

  const sidebarLogo = (
    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-accent to-green-600 text-white font-bold">
      ✨
    </div>
  );

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" aria-label="Notifications" className="relative">
        <Bell className="w-5 h-5" />
        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
      </Button>
      <Button variant="ghost" size="sm" onClick={toggleTheme} aria-label="Toggle theme">
        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </Button>
    </div>
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-black dark:via-gray-950 dark:to-gray-900">
      {/* Layout */}
      <AppSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        items={navItems}
        logo={sidebarLogo}
        title="Dashboard"
        footer={
          <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/10 dark:bg-accent/5 border border-accent/20">
            <Avatar name="You" size="sm" status="online" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground dark:text-white truncate">Your Account</p>
              <p className="text-xs text-foreground-secondary dark:text-white/60 truncate">user@example.com</p>
            </div>
          </div>
        }
      />

      <div className="flex-1 flex flex-col">
        <AppHeader
          title="Dashboard"
          onMenuClick={() => setSidebarOpen(true)}
          actions={headerActions}
          sticky
        />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="max-w-7xl mx-auto space-y-8"
          >
            {/* Welcome Section */}
            <motion.div variants={itemVariants}>
              <div className="space-y-2">
                <h1 className="text-4xl font-bold text-foreground dark:text-white">Good morning</h1>
                <p className="text-lg text-foreground-secondary dark:text-white/60">Here's what's happening with your productivity today.</p>
              </div>
            </motion.div>

            {/* Stats Grid */}
            <motion.div variants={itemVariants}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: 'Tasks Completed', value: '12', icon: CheckCircle2, color: 'from-accent to-green-600' },
                  { label: 'Focus Time', value: '4h 32m', icon: Clock, color: 'from-blue-400 to-blue-600' },
                  { label: 'Productivity Score', value: '94%', icon: TrendingUp, color: 'from-purple-400 to-purple-600' },
                ].map((stat, i) => {
                  const Icon = stat.icon;
                  return (
                    <Card key={i} variant="glass" padding="md" interactive>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm text-foreground-secondary dark:text-white/60">{stat.label}</p>
                          <p className="text-3xl font-bold text-foreground dark:text-white mt-2">{stat.value}</p>
                        </div>
                        <div className={`p-3 rounded-lg bg-gradient-to-br ${stat.color} text-white`}>
                          <Icon className="w-6 h-6" />
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </motion.div>

            {/* Main Content Area */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Tasks and Notes */}
              <div className="lg:col-span-2 space-y-8">
                {/* Quick Actions */}
                <Card variant="glass" padding="md">
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {[
                        { icon: Plus, label: 'New Task', color: 'from-accent' },
                        { icon: FileText, label: 'New Note', color: 'from-blue-500' },
                        { icon: Calendar, label: 'Schedule', color: 'from-purple-500' },
                        { icon: Zap, label: 'Quick Timer', color: 'from-orange-500' },
                      ].map((action, i) => {
                        const Icon = action.icon;
                        return (
                          <button
                            key={i}
                            className={`flex flex-col items-center gap-2 p-3 rounded-lg hover:scale-105 transition-transform bg-gradient-to-br ${action.color} to-transparent text-white border border-white/20`}
                          >
                            <Icon className="w-5 h-5" />
                            <span className="text-xs font-medium">{action.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Upcoming Tasks */}
                <Card variant="glass" padding="md">
                  <CardHeader>
                    <CardTitle>Upcoming Tasks</CardTitle>
                    <CardDescription>Your tasks for the next 7 days</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { title: 'Design system review', priority: 'high', time: 'Today at 2:00 PM', completed: false },
                      { title: 'Client presentation', priority: 'high', time: 'Tomorrow at 10:00 AM', completed: false },
                      { title: 'Code review', priority: 'medium', time: 'Friday at 3:00 PM', completed: false },
                      { title: 'Team standup', priority: 'low', time: 'Daily at 9:00 AM', completed: true },
                    ].map((task, i) => (
                      <motion.div
                        key={i}
                        variants={itemVariants}
                        className="flex items-start gap-4 p-3 rounded-lg hover:bg-white/50 dark:hover:bg-white/5 transition-colors group cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={task.completed}
                          className="mt-1 w-5 h-5 accent-accent rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium ${task.completed ? 'line-through text-foreground-secondary dark:text-white/40' : 'text-foreground dark:text-white'}`}>
                            {task.title}
                          </p>
                          <p className="text-xs text-foreground-secondary dark:text-white/60 mt-1">{task.time}</p>
                        </div>
                        <Badge variant={task.priority === 'high' ? 'error' : task.priority === 'medium' ? 'warning' : 'default'} size="xs">
                          {task.priority}
                        </Badge>
                      </motion.div>
                    ))}
                  </CardContent>
                  <CardFooter>
                    <Button variant="ghost" size="sm" className="w-full">
                      View all tasks
                    </Button>
                  </CardFooter>
                </Card>
              </div>

              {/* Right Column - Insights & Notes */}
              <div className="space-y-8">
                {/* AI Insights */}
                <Card variant="bordered" padding="md" className="bg-gradient-to-br from-accent/10 to-transparent dark:from-accent/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-accent" />
                      Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-foreground-secondary dark:text-white/60">
                      You're {Math.round(Math.random() * 30 + 70)}% more productive during morning hours. Consider scheduling important tasks before noon.
                    </p>
                    <Button variant="primary" size="sm" fullWidth>
                      Get personalized tips
                    </Button>
                  </CardContent>
                </Card>

                {/* Recent Notes */}
                <Card variant="glass" padding="md">
                  <CardHeader>
                    <CardTitle>Recent Notes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {[
                      'Project kickoff notes',
                      'Design system updates',
                      'Meeting notes - Q1 planning',
                    ].map((note, i) => (
                      <button
                        key={i}
                        className="w-full text-left p-2 rounded-lg hover:bg-white/50 dark:hover:bg-white/5 transition-colors text-sm text-foreground-secondary dark:text-white/60 hover:text-foreground dark:hover:text-white"
                      >
                        {note}
                      </button>
                    ))}
                  </CardContent>
                  <CardFooter>
                    <Button variant="ghost" size="sm" className="w-full">
                      View all notes
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </motion.div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
