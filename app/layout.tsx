// app/layout.tsx

import type { Metadata } from 'next'
import { Quicksand } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const quicksand = Quicksand({
  subsets: ['latin'],
  variable: '--font-quicksand',
})

export const metadata: Metadata = {
  title: 'Katà - Informes en minutos',
  description: 'Herramienta de apoyo para docentes de educación especial',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={`${quicksand.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}