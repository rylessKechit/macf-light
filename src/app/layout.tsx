import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { SessionProvider } from '@/components/providers/SessionProvider'
import { ToastProvider } from '@/components/providers/ToastProvider'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: {
    template: '%s | MACF Light',
    default: 'MACF Light - Déclarations CBAM simplifiées',
  },
  description: 'Solution SaaS pour aider les PME françaises à préparer leurs déclarations carbone MACF/CBAM facilement et en conformité avec la réglementation européenne.',
  keywords: ['MACF', 'CBAM', 'carbone', 'déclaration', 'PME', 'France', 'Union Européenne'],
  authors: [{ name: 'MACF Light Team' }],
  creator: 'MACF Light',
  publisher: 'MACF Light',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: process.env.NEXTAUTH_URL || 'https://macf-light.com',
    siteName: 'MACF Light',
    title: 'MACF Light - Déclarations CBAM simplifiées',
    description: 'Solution SaaS pour aider les PME françaises à préparer leurs déclarations carbone MACF/CBAM.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'MACF Light',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MACF Light - Déclarations CBAM simplifiées',
    description: 'Solution SaaS pour aider les PME françaises à préparer leurs déclarations carbone MACF/CBAM.',
    images: ['/og-image.png'],
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className={inter.className}>
        <SessionProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  )
}