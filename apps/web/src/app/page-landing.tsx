'use client';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Check, Sparkles, Zap, Users, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

const features = [
  { icon: Sparkles, title: 'AI-Powered', description: 'Smart insights and recommendations' },
  { icon: Zap, title: 'Lightning Fast', description: 'Optimized for speed and performance' },
  { icon: Users, title: 'Collaborative', description: 'Built for teams and individuals' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-black dark:via-gray-950 dark:to-gray-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <div className="font-bold text-xl text-foreground dark:text-white">SyncSaga</div>
          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="text-sm font-medium text-foreground-secondary dark:text-white/60 hover:text-foreground dark:hover:text-white">
              Sign in
            </Link>
            <Link href="/auth/register">
              <Button variant="primary" size="sm">Get started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 lg:px-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-4xl mx-auto text-center space-y-8"
        >
          <motion.div variants={itemVariants} className="space-y-4">
            <div className="inline-block px-4 py-2 rounded-full bg-accent/10 text:accent dark:bg-accent/5">
              <span className="text-sm font-semibold text-accent">Introducing Apple-level Design</span>
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold text-foreground dark:text-white">
              Productivity Reimagined
            </h1>
            <p className="text-xl text-foreground-secondary dark:text-white/60 max-w-2xl mx-auto">
              Experience an Apple-inspired productivity dashboard built with modern design principles and cutting-edge technology.
            </p>
          </motion.div>

          <motion.div variants={itemVariants} className="flex gap-4 justify-center">
            <Link href="/auth/register">
              <Button variant="primary" size="lg">
                Start free <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="#features">
              <Button variant="secondary" size="lg">Learn more</Button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 lg:px-8 bg-white/50 dark:bg-white/5">
        <div className="max-w-7xl mx-auto">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="space-y-12"
          >
            <motion.div variants={itemVariants} className="text-center space-y-4">
              <h2 className="text-4xl font-bold text-foreground dark:text-white">Designed for Excellence</h2>
              <p className="text-lg text-foreground-secondary dark:text-white/60 max-w-2xl mx-auto">
                Every detail is carefully crafted following Apple's Human Interface Guidelines.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <motion.div key={i} variants={itemVariants}>
                    <Card variant="glass" padding="lg" className="h-full hover:scale-105 transition-transform">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-accent to-green-600 text-white flex items-center justify-center mb-4">
                        <Icon className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-semibold text-foreground dark:text-white mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-foreground-secondary dark:text-white/60">
                        {feature.description}
                      </p>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 lg:px-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          <Card variant="bordered" padding="lg" className="bg-gradient-to-r from-accent/10 to-blue-500/10 dark:from-accent/5 dark:to-blue-500/5 text-center space-y-6">
            <motion.div variants={itemVariants}>
              <h2 className="text-4xl font-bold text-foreground dark:text-white">Ready to get started?</h2>
              <p className="text-lg text-foreground-secondary dark:text-white/60 mt-2">
                Join thousands of users enjoying a better productivity experience.
              </p>
            </motion.div>
            <motion.div variants={itemVariants}>
              <Link href="/auth/register">
                <Button variant="primary" size="lg">Create your account</Button>
              </Link>
            </motion.div>
          </Card>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-white/10 py-8 px-4 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-foreground-secondary dark:text-white/60">
          <div>© 2024 SyncSaga. All rights reserved.</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-foreground dark:hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground dark:hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground dark:hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
