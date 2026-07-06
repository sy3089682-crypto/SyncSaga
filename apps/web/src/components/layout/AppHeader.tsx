'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Menu, Moon, Sun, Search, Bell } from 'lucide-react';
import { ReactNode, useState } from 'react';

interface AppHeaderProps {
  title?: string;
  onMenuClick?: () => void;
  actions?: ReactNode;
  showSearch?: boolean;
  showThemeToggle?: boolean;
  showNotifications?: boolean;
  sticky?: boolean;
  className?: string;
}

export function AppHeader({
  title,
  onMenuClick,
  actions,
  showSearch = true,
  showThemeToggle = true,
  showNotifications = false,
  sticky = true,
  className,
}: AppHeaderProps) {
  const [isDark, setIsDark] = useState(false);

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

  return (
    <header
      className={cn(
        'bg-white dark:bg-black/50 dark:backdrop-blur-md border-b border-gray-200 dark:border-white/10',
        sticky && 'sticky top-0 z-20',
        className
      )}
    >
      <div className="h-16 flex items-center justify-between px-4 lg:px-6 gap-4">
        {/* Left */}
        <div className="flex items-center gap-4">
          {onMenuClick && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMenuClick}
              className="lg:hidden"
              aria-label="Menu"
            >
              <Menu className="w-5 h-5" />
            </Button>
          )}
          {title && (
            <h1 className="text-lg font-semibold text-foreground dark:text-white hidden lg:block">
              {title}
            </h1>
          )}
        </div>

        {/* Center - Search */}
        {showSearch && (
          <div className="hidden md:flex flex-1 max-w-sm">
            <div className="w-full relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary dark:text-white/40" />
              <input
                type="search"
                placeholder="Search..."
                className="input-field w-full pl-10"
              />
            </div>
          </div>
        )}

        {/* Right */}
        <div className="flex items-center gap-2">
          {showNotifications && (
            <Button
              variant="ghost"
              size="sm"
              className="relative"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </Button>
          )}

          {showThemeToggle && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </Button>
          )}

          {actions}
        </div>
      </div>
    </header>
  );
}
