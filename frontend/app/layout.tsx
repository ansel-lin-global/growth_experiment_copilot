import type { Metadata } from 'next'
import './globals.css'
import Navigation from '@/components/Navigation'

export const metadata: Metadata = {
  title: 'Growth Experiment Copilot',
  description: 'AI-powered experiment design and A/B test analysis',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-dark-bg min-h-screen">
        {/* Static background - no animations for better performance */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/10 via-transparent to-neon-cyan/10" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-neon-purple/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-neon-cyan/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-neon-pink/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        </div>
        <Navigation />
        <main className="min-h-screen relative z-10">
          {children}
        </main>
      </body>
    </html>
  )
}

