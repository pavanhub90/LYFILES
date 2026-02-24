// app/layout.tsx
import type { Metadata } from 'next'
import { DM_Sans, Syne, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-sans' })
const syne = Syne({ subsets: ['latin'], variable: '--font-display', weight: ['400','500','600','700','800'] })
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', weight: ['400','500'] })

export const metadata: Metadata = {
  title: 'LyFiles — Automated File Conversion Platform',
  description: 'Convert 30+ file formats, auto-organize, and schedule conversions. PDF, DOCX, PNG, MP4, MP3 and more.',
  keywords: ['file conversion', 'PDF converter', 'image converter', 'video converter', 'file automation'],
  authors: [{ name: 'LyFiles' }],
  openGraph: {
    title: 'LyFiles — Automated File Conversion',
    description: 'Convert files faster, organize them smarter.',
    url: 'https://lyfiles.com',
    siteName: 'LyFiles',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LyFiles',
    description: 'Convert files faster, organize them smarter.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${syne.variable} ${jetbrains.variable}`}>
      <body className="bg-bg text-text antialiased">{children}</body>
    </html>
  )
}
