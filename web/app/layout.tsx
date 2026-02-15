import type { Metadata } from 'next'
import DotGrid from '../components/DotGrid'
import './globals.css'
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';

export const metadata: Metadata = {
  title: 'Treemux',
  description: 'Treemux simulates AI teams from idea to deployment — generating products, pitches, and metrics in a sandbox.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <DotGrid />
        <SpeedInsights />
        <Analytics />
        {children}
      </body>
    </html>
  )
}
