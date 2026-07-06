'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Tabs } from '@/components/ui/Tabs';
import { Avatar } from '@/components/ui/Avatar';
import { Bell, Lock, Users, Palette, LogOut, Calendar, Shield } from 'lucide-react';
import Link from 'next/link';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Calendar },
];

export default function SettingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [saveChanges, setSaveChanges] = useState(false);

  const sidebarLogo = (
    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-accent to-green-600 text-white font-bold">
      ✨
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

  const tabs = [
    {
      id: 'account',
      label: 'Account',
      icon: <Users className="w-4 h-4" />,
      content: (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
          <motion.div variants={itemVariants}>
            <Card variant="glass" padding="md">
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 pb-4 border-b border-gray-200 dark:border-white/10">
                  <Avatar name="John Doe" size="lg" status="online" />
                  <div>
                    <Button variant="secondary" size="sm">Change Avatar</Button>
                  </div>
                </div>
                <Input label="Full Name" placeholder="John Doe" defaultValue="John Doe" />
                <Input label="Email" placeholder="john@example.com" defaultValue="john@example.com" type="email" />
                <Input label="Phone" placeholder="+1 (555) 123-4567" defaultValue="+1 (555) 123-4567" />
                <Button variant="primary" fullWidth onClick={() => setSaveChanges(!saveChanges)}>
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      ),
    },
    {
      id: 'security',
      label: 'Security',
      icon: <Shield className="w-4 h-4" />,
      content: (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
          <motion.div variants={itemVariants}>
            <Card variant="glass" padding="md">
              <CardHeader>
                <CardTitle>Password & Security</CardTitle>
                <CardDescription>Manage your security settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground dark:text-white">Change Password</h4>
                  <Input type="password" label="Current Password" placeholder="••••••••" />
                  <Input type="password" label="New Password" placeholder="••••••••" />
                  <Input type="password" label="Confirm Password" placeholder="••••••••" />
                  <Button variant="primary" size="sm">Update Password</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card variant="glass" padding="md">
              <CardHeader>
                <CardTitle>Two-Factor Authentication</CardTitle>
                <CardDescription>Add an extra layer of security</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="secondary" size="sm">Enable 2FA</Button>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      ),
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: <Bell className="w-4 h-4" />,
      content: (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
          <motion.div variants={itemVariants}>
            <Card variant="glass" padding="md">
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Choose how you want to be notified</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: 'Email Notifications', description: 'Receive important updates via email' },
                  { label: 'Push Notifications', description: 'Get alerts on your devices' },
                  { label: 'Task Reminders', description: 'Remind me about upcoming tasks' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/50 dark:hover:bg-white/5">
                    <div>
                      <p className="font-medium text-foreground dark:text-white">{item.label}</p>
                      <p className="text-sm text-foreground-secondary dark:text-white/60">{item.description}</p>
                    </div>
                    <input type="checkbox" defaultChecked className="w-5 h-5 accent-accent rounded" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      ),
    },
    {
      id: 'appearance',
      label: 'Appearance',
      icon: <Palette className="w-4 h-4" />,
      content: (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
          <motion.div variants={itemVariants}>
            <Card variant="glass" padding="md">
              <CardHeader>
                <CardTitle>Theme & Appearance</CardTitle>
                <CardDescription>Customize how the app looks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {[
                    { label: 'Light', value: 'light' },
                    { label: 'Dark', value: 'dark' },
                    { label: 'System', value: 'system' },
                  ].map((theme) => (
                    <label key={theme.value} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/50 dark:hover:bg-white/5 cursor-pointer">
                      <input type="radio" name="theme" value={theme.value} defaultChecked={theme.value === 'dark'} className="w-4 h-4 accent-accent" />
                      <span className="font-medium text-foreground dark:text-white">{theme.label}</span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-black dark:via-gray-950 dark:to-gray-900">
      <AppSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        items={navItems}
        logo={sidebarLogo}
        title="Settings"
      />

      <div className="flex-1 flex flex-col">
        <AppHeader
          title="Settings"
          onMenuClick={() => setSidebarOpen(true)}
          sticky
        />

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-4xl mx-auto">
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
              <motion.div variants={itemVariants}>
                <div>
                  <h1 className="text-4xl font-bold text-foreground dark:text-white">Settings</h1>
                  <p className="text-lg text-foreground-secondary dark:text-white/60 mt-2">Manage your account and preferences</p>
                </div>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Tabs items={tabs} defaultTab="account" onChange={() => {}} />
              </motion.div>

              <motion.div variants={itemVariants} className="pt-8 border-t border-gray-200 dark:border-white/10">
                <Card variant="glass" padding="md" className="bg-red-50/50 dark:bg-red-500/5 border-red-200 dark:border-red-500/20">
                  <CardHeader>
                    <CardTitle className="text-red-600 dark:text-red-400">Danger Zone</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button variant="danger" size="sm">
                      Sign out
                    </Button>
                    <p className="text-sm text-foreground-secondary dark:text-white/60">
                      You'll need to sign in again to access your account.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}
