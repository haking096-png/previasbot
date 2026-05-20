import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'Auto Prévias Hot 2.0',
  description: 'Sistema automatizado de prévias para Telegram',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={GeistSans.className}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#141d35',
              color: '#f0f4f8',
              border: '1px solid rgba(56, 97, 150, 0.15)',
              fontSize: '13px',
            },
          }}
        />
      </body>
    </html>
  )
}
