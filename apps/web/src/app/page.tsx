'use client';

import { motion } from 'framer-motion';
import { Play, Users, MessageSquare, Mic, Shield, Zap, ArrowRight, Sparkles, ChevronDown, Star, Github } from 'lucide-react';
import Link from 'next/link';

const features = [
  { icon: Play, title: 'Synchronized Playback', description: 'Frame-perfect sync with drift correction and latency compensation.', gradient: 'from-primary to-accent-pink' },
  { icon: Users, title: 'Watch Rooms', description: 'Create public or private rooms for up to 50 friends.', gradient: 'from-accent-cyan to-primary' },
  { icon: Mic, title: 'Voice Chat', description: 'Crystal-clear voice with noise suppression.', gradient: 'from-accent-pink to-accent-cyan' },
  { icon: MessageSquare, title: 'Realtime Chat', description: 'Emojis, GIFs, reactions, and typing indicators.', gradient: 'from-primary to-accent-cyan' },
  { icon: Shield, title: 'Secure & Private', description: 'End-to-end encryption and granular permissions.', gradient: 'from-accent-pink to-primary' },
  { icon: Zap, title: 'Low Latency', description: 'Sub-100ms sync with automatic reconnection.', gradient: 'from-accent-cyan to-accent-pink' },
];

const testimonials = [
  { quote: 'Best way to watch anime with long-distance friends. The sync is flawless.', name: 'Alex K.', role: 'Anime Enthusiast' },
  { quote: 'The voice chat + sync combo is incredible. Feels like we\'re in the same room.', name: 'Sam T.', role: 'Daily User' },
  { quote: 'Clean UI and works perfectly with any streaming site. Game changer.', name: 'Jordan M.', role: 'Developer' },
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
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent-cyan bg-clip-text text-transparent">SyncSaga</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm text-text-secondary hover:text-text-primary transition-colors">Features</a>
              <a href="#testimonials" className="text-sm text-text-secondary hover:text-text-primary transition-colors">Testimonials</a>
              <div className="flex items-center gap-3">
                <Link href="/auth/login" className="text-sm text-text-secondary hover:text-text-primary transition-colors">Sign In</Link>
                <Link href="/auth/register">
                  <button className="px-5 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors shadow-lg shadow-primary/25">
                    Get Started
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-36 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/15 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-accent-cyan/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '-3s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent-pink/5 rounded-full blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.05)_0%,transparent_70%)]" />
        </div>

        <div className="relative max-w-7xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm mb-8">
              <Sparkles className="w-4 h-4" />
              <span>The future of social anime watching</span>
            </div>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl sm:text-7xl lg:text-8xl font-bold mb-6 leading-[1.1]">
            Watch Anime{' '}
            <span className="bg-gradient-to-r from-primary via-accent-pink to-accent-cyan bg-clip-text text-transparent animate-gradient">
              Together
            </span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
            Synchronized playback, voice chat, and realtime messaging. Create your own watch rooms and enjoy anime with friends from anywhere in the world.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/register">
              <button className="group px-8 py-4 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-semibold text-lg hover:shadow-xl hover:shadow-primary/30 transition-all flex items-center gap-2">
                Start Watching Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
            <a href="#features">
              <button className="px-8 py-4 rounded-xl bg-surface-light border border-border text-text-primary font-semibold text-lg hover:border-primary/50 transition-colors flex items-center gap-2">
                Learn More
                <ChevronDown className="w-5 h-5" />
              </button>
            </a>
          </motion.div>

          {/* Mock Preview */}
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.5 }} className="mt-20">
            <div className="relative mx-auto max-w-5xl">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary via-accent-pink to-accent-cyan rounded-2xl blur opacity-30" />
              <div className="relative glass rounded-2xl p-2 overflow-hidden">
                <div className="bg-surface rounded-xl aspect-video flex items-center justify-center relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <Play className="w-10 h-10 text-primary" />
                      </div>
                      <p className="text-text-muted font-medium">SyncSaga Room Preview</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto relative">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm mb-6">
              <Zap className="w-4 h-4" />
              <span>Everything you need</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">Built for the perfect watch party</h2>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">Every feature designed for the ultimate social anime experience.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="group p-6 rounded-2xl bg-card-gradient border border-border hover:border-primary/30 transition-all hover:-translate-y-1 duration-300">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} bg-opacity-20 flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}>
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-text-secondary">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-sm mb-6">
              <Star className="w-4 h-4" />
              <span>Loved by the community</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">What users are saying</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div key={t.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="p-6 rounded-2xl bg-card-gradient border border-border">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 fill-yellow-500 text-yellow-500" />)}
                </div>
                <p className="text-text-primary mb-4 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent-cyan flex items-center justify-center text-sm font-semibold">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{t.name}</p>
                    <p className="text-xs text-text-muted">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
            className="glass rounded-3xl p-12 border border-primary/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent-cyan/10 pointer-events-none" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to watch together?</h2>
              <p className="text-text-secondary text-lg mb-8 max-w-lg mx-auto">Join thousands of anime fans already using SyncSaga. It&apos;s free to start.</p>
              <Link href="/auth/register">
                <button className="px-8 py-4 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-semibold text-lg hover:shadow-xl hover:shadow-primary/30 transition-all">
                  Get Started Free
                </button>
              </Link>
            </div>
          </motion.div>
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
          <p className="text-text-muted text-sm text-center">
            SyncSaga does not host or distribute copyrighted content. It only synchronizes playback between users.
          </p>
          <a href="https://github.com/sy3089682-crypto/SyncSaga" target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-text-primary transition-colors">
            <Github className="w-5 h-5" />
          </a>
        </div>
      </footer>
    </div>
  );
}
