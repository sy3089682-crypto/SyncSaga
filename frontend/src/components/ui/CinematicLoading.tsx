'use client'

import { motion } from 'framer-motion'
import { Tv } from 'lucide-react'

interface CinematicLoadingProps {
  message?: string
}

export function CinematicLoading({ message = 'Loading SyncSaga...' }: CinematicLoadingProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[hsl(var(--background))]"
    >
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, 5, -5, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <Tv className="w-16 h-16 text-brand-500" />
      </motion.div>

      <motion.div
        initial={{ width: 0 }}
        animate={{ width: 200 }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="h-0.5 bg-gradient-to-r from-brand-500 via-accent-500 to-brand-500 rounded-full mt-8"
      />

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-6 text-surface-400 text-sm font-mono"
      >
        {message}
      </motion.p>

      <motion.div
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="flex gap-1 mt-4"
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-brand-500"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
          />
        ))}
      </motion.div>
    </motion.div>
  )
}
