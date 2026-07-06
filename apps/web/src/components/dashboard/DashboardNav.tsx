'use client';

import { motion } from 'framer-motion';
import { Menu, X, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

interface DashboardNavProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  activeSection: string;
  setActiveSection: (section: string) => void;
}

export default function DashboardNav({
  sidebarOpen,
  setSidebarOpen,
  activeSection,
  setActiveSection,
}: DashboardNavProps) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);
  }, []);

  const toggleDarkMode = () => {
    const html = document.documentElement;
    if (isDark) {
      html.classList.remove('dark');
      localStorage.theme = 'light';
      setIsDark(false);
    } else {
      html.classList.add('dark');
      localStorage.theme = 'dark';
      setIsDark(true);
    }
  };

  if (!mounted) return null;

  return (
    <motion.header
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed top-0 left-0 right-0 z-50 h-20 bg-white/60 dark:bg-black/40 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50"
    >
      <div className="h-full flex items-center justify-between px-8 max-w-7xl mx-auto w-full">
        {/* Left: Menu & Title */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-900 dark:text-white"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <div className="hidden sm:flex items-center gap-3">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              Dashboard
            </h1>
          </div>
        </div>

        {/* Right: Time & Theme */}
        <div className="flex items-center gap-4">
          <div className="text-sm font-500 text-gray-600 dark:text-gray-400">
            {new Date().toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </div>

          <button
            onClick={toggleDarkMode}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-900 dark:text-white"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm cursor-pointer hover:shadow-lg transition-all">
            A
          </div>
        </div>
      </div>
    </motion.header>
  );
}
