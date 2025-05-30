import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from '@/components/providers'
import { Toaster } from '@/components/ui/toaster'
import { Header } from '@/components/header'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Research Agent - AI-Powered Research Paper Generator',
  description: 'Generate comprehensive research papers automatically using advanced AI agents, web scraping, and intelligent analysis.',
  keywords: ['AI research', 'research papers', 'automation', 'academic writing', 'artificial intelligence'],
  authors: [{ name: 'Research Agent Team' }],
}

export const viewport: Viewport = { // <-- Separate export for viewport
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen research-gradient">
            <Header />
            {children}
            <Toaster />
          </div>
        </Providers>
      </body>
    </html>
  )
}
