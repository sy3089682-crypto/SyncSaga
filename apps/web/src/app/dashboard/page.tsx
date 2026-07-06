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
  Menu,
  X,
  Settings,
  LogOut,
} from 'lucide-react';
import DashboardNav from '@/components/dashboard/DashboardNav';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DashboardOverview from '@/components/dashboard/DashboardOverview';
import NotesSection from '@/components/dashboard/NotesSection';
import TasksSection from '@/components/dashboard/TasksSection';
import CalendarSection from '@/components/dashboard/CalendarSection';
import AIAssistant from '@/components/dashboard/AIAssistant';

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-black dark:via-gray-950 dark:to-gray-900">
      {/* Navigation */}
      <DashboardNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} activeSection={activeSection} setActiveSection={setActiveSection} />

      <div className="flex">
        {/* Sidebar */}
        <motion.aside
          initial={{ x: -280 }}
          animate={{ x: sidebarOpen ? 0 : -280 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed left-0 top-0 z-40 w-72 h-screen pt-20 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-black/50 dark:backdrop-blur-md overflow-y-auto lg:relative lg:translate-x-0"
        >
          <div className="p-8 space-y-8">
            {/* Logo */}
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                ◆
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Productivity</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Apple-level dashboard</p>
            </div>

            {/* Navigation Items */}
            <nav className="space-y-2">
              {[
                { id: 'overview', label: 'Overview', icon: Calendar },
                { id: 'notes', label: 'Notes', icon: FileText },
                { id: 'tasks', label: 'Tasks', icon: CheckCircle2 },
                { id: 'calendar', label: 'Calendar', icon: Clock },
              ].map(item => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveSection(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-12 text-sm font-500 transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/30 dark:to-blue-950/30 text-green-600 dark:text-green-400'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* Divider */}
            <div className="h-px bg-gray-200 dark:bg-gray-800" />

            {/* Action Items */}
            <div className="space-y-2">
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-12 text-sm font-500 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
                <Settings className="w-5 h-5" />
                Settings
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-12 text-sm font-500 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </div>
          </div>
        </motion.aside>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <DashboardHeader />

          <main className="h-[calc(100vh-80px)] overflow-y-auto">
            <div className="p-8 max-w-7xl">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                {activeSection === 'overview' && <DashboardOverview />}
                {activeSection === 'notes' && <NotesSection />}
                {activeSection === 'tasks' && <TasksSection />}
                {activeSection === 'calendar' && <CalendarSection />}
              </motion.div>
            </div>

            {/* AI Assistant Button */}
            <AIAssistant />
          </main>
        </div>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
        />
      )}
    </div>
  );
}
