'use client'

import { Component, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  handleGoHome = () => {
    window.location.href = '/dashboard'
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))] p-4"
        >
          <div className="card p-8 max-w-md w-full text-center">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.5 }}
            >
              <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            </motion.div>
            <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
            <p className="text-surface-400 text-sm mb-6">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={this.handleRetry} className="btn-primary flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> Try Again
              </button>
              <button onClick={this.handleGoHome} className="btn-secondary flex items-center gap-2">
                <Home className="w-4 h-4" /> Go Home
              </button>
            </div>
          </div>
        </motion.div>
      )
    }

    return this.props.children
  }
}
