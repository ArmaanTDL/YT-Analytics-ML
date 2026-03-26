import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'YT TrendLens — YouTube Trending Analysis',
  description: 'AI-powered YouTube trending video analytics and machine learning prediction dashboard',
  keywords: 'YouTube, trending, analysis, machine learning, data science',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1a1a2e',
              color: '#e0e0ff',
              border: '1px solid #333355',
            },
          }}
        />
        {children}
      </body>
    </html>
  )
}
