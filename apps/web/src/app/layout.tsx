import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SyncSaga - Watch Anime Together',
  description: 'Synchronized anime watch-party platform with voice chat, realtime messaging, and friends.',
  keywords: ['anime', 'watch party', 'sync', 'voice chat', 'streaming'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
