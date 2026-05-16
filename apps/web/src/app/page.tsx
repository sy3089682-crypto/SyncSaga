'use client';

import { motion } from 'framer-motion';
import { Play, Users, MessageSquare, Mic, Shield, Zap, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

const features = [
  {
    icon: <Play className="w-6 h-6" />,
    title: 'Synchronized Playback',
    description: 'Frame-perfect sync with drift correction and latency compensation.',
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: 'Watch Rooms',
    description: 'Create public or private rooms for up to 50 friends.',
  },
  {
    icon: <Mic className="w-6 h-6" />,
    title: 'Voice Chat',
    description: 'Crystal-clear voice with noise suppression and echo cancellation.',
  },
  {
    icon: <MessageSquare className="w-6 h-6" />,
    title: 'Realtime Chat',
    description: 'Emojis, GIFs, reactions, and typing indicators.',
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: 'Secure & Private',
    description: 'End-to-end encryption and granular room permissions.',
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: 'Low Latency',
    description: 'Sub-100ms sync with automatic reconnection recovery.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-text-primary overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent-cyan flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent-cyan bg-clip-text text-transparent">
                SyncSaga
              </span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-text-secondary hover:text-text-primary transition-colors">Features</a>
              <a href="#how-it-works" className="text-text-secondary hover:text-text-primary transition-colors">How it Works</a>
              <Link href="/dashboard">
                <button className="px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                  Open App
                </button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-cyan/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '-3s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent-pink/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm mb-8">
              <Sparkles className="w-4 h-4" />
              <span>The future of social anime watching</span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight"
          >
            Watch Anime{' '}
            <span className="bg-gradient-to-r from-primary via-accent-pink to-accent-cyan bg-clip-text text-transparent animate-gradient">
              Together
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-text-secondary max-w-2xl mx-auto mb-10"
          >
            Synchronized playback, voice chat, and realtime messaging. 
            Create your own watch rooms and enjoy anime with friends from anywhere in the world.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/dashboard">
              <button className="group px-8 py-4 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-semibold text-lg hover:shadow-lg hover:shadow-primary/25 transition-all flex items-center gap-2">
                Start Watching
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
            <button className="px-8 py-4 rounded-xl bg-surface-light border border-border text-text-primary font-semibold text-lg hover:border-primary/50 transition-colors">
              Learn More
            </button>
          </motion.div>

          {/* Mock UI Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-20 relative"
          >
            <div className="relative mx-auto max-w-5xl">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary via-accent-pink to-accent-cyan rounded-2xl blur opacity-30" />
              <div className="relative glass rounded-2xl p-2">
                <div className="bg-surface rounded-xl overflow-hidden aspect-video flex items-center justify-center">
                  <div className="text-center">
                    <Play className="w-16 h-16 text-primary mx-auto mb-4 opacity-50" />
                    <p className="text-text-muted">Room Preview</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything You Need
            </h2>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">
              Built from the ground up for the ultimate anime watch-party experience.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group p-6 rounded-2xl bg-card-gradient border border-border hover:border-primary/30 transition-all hover:-translate-y-1"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-text-secondary">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary to-accent-cyan flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold">SyncSaga</span>
          </div>
          <p className="text-text-muted text-sm">
            SyncSaga does not host or redistribute content. It only synchronizes playback between users.
          </p>
        </div>
      </footer>
    </div>
  );
}
