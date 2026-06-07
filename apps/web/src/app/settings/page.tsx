'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, CreditCard, Bell, Palette, LogOut, Check, Crown, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { useThemeStore, Theme } from '@/store/useThemeStore';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { user, session, signOut } = useAuth();
  const token = session?.access_token;
  const { theme, setTheme } = useThemeStore();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.get('/api/payments/subscription', token)
      .then((data: any) => setSubscription(data.subscription))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const tabs = [
    { id: 'profile', label: 'Profile', icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'subscription', label: 'Subscription', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  const handleUpgrade = async () => {
    if (!token) return;
    setUpdating(true);
    try {
      const data = await api.post<any>('/api/payments/create-checkout', {
        priceId: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID || 'price_premium',
        successUrl: `${window.location.origin}/settings`,
      }, token);
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error('Upgrade failed:', err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-text-primary pb-20 lg:pb-0">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-bold mb-8">
          Settings
        </motion.h1>

        <div className="flex flex-col lg:flex-row gap-8">
          <nav className="lg:w-48 space-y-1 shrink-0">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left',
                  activeTab === tab.id ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:text-text-primary hover:bg-surface-light'
                )}>
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
            <button onClick={signOut}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-500/10 transition-all text-left mt-4">
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </nav>

          <div className="flex-1 min-w-0">
            {activeTab === 'profile' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="glass rounded-2xl p-6 border border-border/50">
                  <h2 className="text-lg font-semibold mb-4">Profile</h2>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent-pink flex items-center justify-center text-2xl font-bold">
                      {user?.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <p className="font-medium text-lg">{user?.display_name || user?.username}</p>
                      <p className="text-sm text-text-secondary">{session?.user?.email}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-text-secondary mb-1">Username</label>
                      <input type="text" defaultValue={user?.username || ''} readOnly
                        className="w-full px-4 py-2.5 rounded-xl bg-surface-light border border-border text-text-primary" />
                    </div>
                    <div>
                      <label className="block text-sm text-text-secondary mb-1">Display Name</label>
                      <input type="text" defaultValue={user?.display_name || ''} readOnly
                        className="w-full px-4 py-2.5 rounded-xl bg-surface-light border border-border text-text-primary" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'appearance' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="glass rounded-2xl p-6 border border-border/50">
                  <h2 className="text-lg font-semibold mb-4">Theme</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(['dark', 'light', 'amoled', 'sakura'] as Theme[]).map(t => (
                      <button key={t} onClick={() => setTheme(t)}
                        className={cn(
                          'p-4 rounded-xl border-2 transition-all text-center capitalize',
                          theme === t ? 'border-primary bg-primary/10' : 'border-border bg-surface-light hover:border-primary/50'
                        )}>
                        <div className={cn(
                          'w-8 h-8 rounded-full mx-auto mb-2',
                          t === 'dark' && 'bg-[#0a0a0f] border border-[#2a2a3a]',
                          t === 'light' && 'bg-white border border-gray-200',
                          t === 'amoled' && 'bg-black border border-[#1a1a1a]',
                          t === 'sakura' && 'bg-[#1a0f14] border border-[#3d2430]',
                        )} />
                        <p className="text-xs font-medium">{t}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'subscription' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="glass rounded-2xl p-6 border border-border/50">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-500" />
                    Subscription
                  </h2>

                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className={cn(
                        'p-4 rounded-xl border',
                        subscription?.plan === 'free' ? 'border-border bg-surface-light' :
                        subscription?.plan === 'premium' ? 'border-yellow-500/30 bg-yellow-500/5' :
                        'border-primary/30 bg-primary/5'
                      )}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-lg capitalize">{subscription?.plan || 'Free'} Plan</p>
                            <p className="text-sm text-text-secondary">
                              {subscription?.status === 'active' ? 'Active' : subscription?.status || 'Active'}
                            </p>
                          </div>
                          {subscription?.plan !== 'free' ? (
                            <div className="px-3 py-1 rounded-full bg-accent-green/10 text-accent-green text-xs font-medium">
                              <Check className="w-3 h-3 inline mr-1" />
                              Active
                            </div>
                          ) : (
                            <Sparkles className="w-5 h-5 text-yellow-500" />
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                          { name: 'Free', price: '$0', features: ['3 rooms', '10 members/room', 'Basic chat', 'Standard quality'] },
                          { name: 'Premium', price: '$4.99', features: ['20 rooms', '50 members/room', 'HD rooms', 'AI features', 'Clip creation'] },
                          { name: 'Pro', price: '$9.99', features: ['Unlimited rooms', '100 members/room', 'HD rooms', 'AI features', 'Priority support'] },
                        ].map((plan, i) => (
                          <div key={plan.name} className={cn(
                            'p-4 rounded-xl border text-center',
                            subscription?.plan === plan.name.toLowerCase() ? 'border-primary bg-primary/10' : 'border-border bg-surface-light'
                          )}>
                            <p className="font-bold text-lg">{plan.name}</p>
                            <p className="text-2xl font-bold my-2">{plan.price}<span className="text-sm text-text-secondary">/mo</span></p>
                            <ul className="text-xs text-left space-y-1.5 mb-4">
                              {plan.features.map(f => (
                                <li key={f} className="flex items-center gap-1.5">
                                  <Check className="w-3 h-3 text-accent-green shrink-0" />
                                  {f}
                                </li>
                              ))}
                            </ul>
                            {subscription?.plan !== plan.name.toLowerCase() && plan.name !== 'Free' && (
                              <button onClick={handleUpgrade} disabled={updating}
                                className="w-full py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50">
                                {updating ? 'Loading...' : 'Upgrade'}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'notifications' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="glass rounded-2xl p-6 border border-border/50">
                  <h2 className="text-lg font-semibold mb-4">Notifications</h2>
                  <div className="space-y-4">
                    {[
                      { label: 'Friend requests', desc: 'When someone sends you a friend request' },
                      { label: 'Room invitations', desc: 'When you\'re invited to a room' },
                      { label: 'Activity feed', desc: 'Updates from friends' },
                      { label: 'Marketing emails', desc: 'Product updates and announcements' },
                    ].map(item => (
                      <label key={item.label} className="flex items-center justify-between py-2">
                        <div>
                          <p className="text-sm font-medium">{item.label}</p>
                          <p className="text-xs text-text-muted">{item.desc}</p>
                        </div>
                        <div className="w-10 h-6 rounded-full bg-surface-light border border-border relative cursor-pointer">
                          <div className="w-4 h-4 rounded-full bg-primary absolute top-0.5 right-0.5 transition-all" />
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
