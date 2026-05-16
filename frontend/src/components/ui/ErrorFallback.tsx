'use client'

import { motion } from 'framer-motion'
import { WifiOff } from 'lucide-react'

export function OfflineFallback() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-16 text-surface-400"
    >
      <motion.div
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <WifiOff className="w-12 h-12 mb-4" />
      </motion.div>
      <p className="text-lg font-medium">Connection lost</p>
      <p className="text-sm mt-1">Reconnecting to SyncSaga...</p>
    </motion.div>
  )
}
