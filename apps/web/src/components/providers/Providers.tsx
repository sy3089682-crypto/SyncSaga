"use client"

import * as React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { Toaster } from "react-hot-toast"

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        {children}
        <Toaster position="bottom-right" toastOptions={{
          style: {
            background: '#181818',
            color: '#fff',
            border: '1px solid #2a2a2a',
            borderRadius: '3px'
          }
        }} />
      </NextThemesProvider>
    </QueryClientProvider>
  )
}
