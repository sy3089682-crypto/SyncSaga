import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'SyncSaga - Watch Anime Together',
    template: '%s | SyncSaga',
  },
  description: 'Synchronized anime watch-party platform with voice chat, realtime messaging, and friends. Watch anime in perfect sync with anyone, anywhere.',
  keywords: ['anime', 'watch party', 'sync', 'voice chat', 'streaming', 'anime together', 'syncsaga', 'co-watch'],
  authors: [{ name: 'SyncSaga' }],
  creator: 'SyncSaga',
  publisher: 'SyncSaga',
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'SyncSaga',
    title: 'SyncSaga - Watch Anime Together',
    description: 'Synchronized anime watch-party platform with voice chat, realtime messaging, and friends.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'SyncSaga' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SyncSaga - Watch Anime Together',
    description: 'Synchronized anime watch-party platform with voice chat, realtime messaging, and friends.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SyncSaga',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  themeColor: '#7c3aed',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
