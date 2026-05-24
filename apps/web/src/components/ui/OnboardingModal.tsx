'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Sparkles, Tv, Users, Check, ArrowRight, Download, MessageSquare } from 'lucide-react';

const STEPS = [
  {
    title: 'Welcome to SyncSaga',
    description: 'Watch anime together with friends in perfect sync. Voice chat, reactions, and more.',
    icon: Sparkles,
  },
  {
    title: 'Install the Extension',
    description: 'Get the SyncSaga browser extension to sync video playback across any anime site.',
    icon: Download,
  },
  {
    title: 'Create or Join a Room',
    description: 'Create a watch party room or join a friend\'s room with a shareable link.',
    icon: Tv,
  },
  {
    title: 'You\'re All Set!',
    description: 'Start watching anime together with synchronized playback, chat, and voice.',
    icon: Check,
  },
];

export default function OnboardingModal({ open, onComplete }: { open: boolean; onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const router = useRouter();

  const current = STEPS[step];
  const Icon = current.icon;

  const next = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else {
      onComplete();
    }
  };

  const skip = () => {
    onComplete();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="w-full max-w-md rounded-3xl bg-surface border border-border p-8 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-surface-light">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-accent-cyan"
                initial={{ width: '0%' }}
                animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            <button onClick={skip} className="absolute top-4 right-4 text-xs text-text-muted hover:text-text-secondary transition-colors">
              Skip
            </button>

            <div className="flex flex-col items-center text-center pt-4">
              <motion.div
                key={step}
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent-cyan flex items-center justify-center mb-6"
              >
                <Icon className="w-10 h-10 text-white" />
              </motion.div>

              <motion.h2
                key={`title-${step}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-2xl font-bold mb-3"
              >
                {current.title}
              </motion.h2>

              <motion.p
                key={`desc-${step}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-text-secondary mb-8 leading-relaxed"
              >
                {current.description}
              </motion.p>

              <div className="flex gap-2 mb-8">
                {STEPS.map((_, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === step ? 'bg-primary' : 'bg-surface-light'}`} />
                ))}
              </div>

              <button onClick={next}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-semibold hover:shadow-xl hover:shadow-primary/25 transition-all flex items-center justify-center gap-2">
                {step === STEPS.length - 1 ? (
                  <><Check className="w-5 h-5" /> Get Started</>
                ) : (
                  <><ArrowRight className="w-5 h-5" /> Next</>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
