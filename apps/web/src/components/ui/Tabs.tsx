'use client';

import { cn } from '@/lib/utils';
import { useState } from 'react';

interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number;
  content: React.ReactNode;
}

interface TabsProps {
  items: TabItem[];
  defaultTab?: string;
  variant?: 'default' | 'underline' | 'pills';
  className?: string;
  onChange?: (tabId: string) => void;
}

export function Tabs({
  items,
  defaultTab,
  variant = 'default',
  className,
  onChange,
}: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || items[0]?.id || '');

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    onChange?.(tabId);
  };

  const variants = {
    default: {
      container: 'flex gap-2 border-b border-gray-200 dark:border-white/10',
      tab: 'px-4 py-3 text-sm font-medium border-b-2 border-transparent text-foreground-secondary dark:text-white/60 hover:text-foreground dark:hover:text-white transition-colors',
      active: 'border-accent text-accent',
    },
    underline: {
      container: 'flex gap-4 border-b border-gray-200 dark:border-white/10',
      tab: 'px-0 py-3 text-sm font-medium border-b-2 border-transparent text-foreground-secondary dark:text-white/60 hover:text-foreground dark:hover:text-white transition-colors relative',
      active: 'border-accent text-foreground dark:text-white',
    },
    pills: {
      container: 'flex gap-2 p-1.5 bg-gray-100 dark:bg-white/5 rounded-xl w-fit',
      tab: 'px-4 py-2 text-sm font-medium text-foreground-secondary dark:text-white/60 rounded-lg transition-all',
      active: 'bg-white dark:bg-white/10 text-foreground dark:text-white shadow-sm',
    },
  };

  const variantStyles = variants[variant];

  return (
    <div className={className}>
      {/* Tab List */}
      <div className={variantStyles.container} role="tablist">
        {items.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={activeTab === item.id}
            onClick={() => handleTabChange(item.id)}
            className={cn(
              variantStyles.tab,
              activeTab === item.id && variantStyles.active
            )}
          >
            <div className="flex items-center gap-2">
              {item.icon && <span className="w-4 h-4">{item.icon}</span>}
              <span>{item.label}</span>
              {item.badge && (
                <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-xs font-semibold rounded-full bg-accent text-white">
                  {item.badge}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="mt-6">
        {items.map((item) => (
          activeTab === item.id && (
            <div key={item.id} role="tabpanel">
              {item.content}
            </div>
          )
        ))}
      </div>
    </div>
  );
}
