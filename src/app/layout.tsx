import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Portal - Sign In',
  description: 'Disguised Answer-Review Platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
