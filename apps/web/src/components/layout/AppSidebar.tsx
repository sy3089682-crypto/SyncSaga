'use client';

import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LucideIcon, X } from 'lucide-react';
import { ReactNode } from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string | number;
}

interface AppSidebarProps {
  isOpen: boolean;
  onClose?: () => void;
  items: NavItem[];
  logo?: ReactNode;
  title?: string;
  footer?: ReactNode;
}

export function AppSidebar({
  isOpen,
  onClose,
  items,
  logo,
  title,
  footer,
}: AppSidebarProps) {
  const pathname = usePathname();

  const sidebarVariants = {
    hidden: { x: -280, opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } },
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <motion.aside
        variants={sidebarVariants}
        initial="hidden"
        animate={isOpen ? 'visible' : 'hidden'}
        className="fixed left-0 top-0 z-40 w-80 h-screen bg-white dark:bg-black/50 dark:backdrop-blur-md border-r border-gray-200 dark:border-white/10 overflow-y-auto lg:relative lg:translate-x-0 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            {logo && <div className="flex-shrink-0">{logo}</div>}
            {title && (
              <div>
                <h2 className="text-lg font-bold text-foreground dark:text-white">
                  {title}
                </h2>
              </div>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors lg:hidden text-foreground-secondary dark:text-white/60"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                  isActive
                    ? 'bg-accent text-white shadow-md'
                    : 'text-foreground-secondary dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-foreground dark:hover:text-white'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="ml-auto inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent/20 text-accent dark:bg-white/20 dark:text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        {footer && (
          <div className="border-t border-gray-200 dark:border-white/10 p-4">
            {footer}
          </div>
        )}
      </motion.aside>
    </>
  );
}
