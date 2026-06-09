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
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-default)',
              borderRadius: '12px',
              fontSize: '13px',
              padding: '12px 16px',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: 'var(--bg-secondary)',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: 'var(--bg-secondary)',
              },
            },
          }}
        />
      </body>
    </html>
  )
}
