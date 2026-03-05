// app/(dashboard)/layout.tsx

import type { ReactNode } from 'react'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="h-16 border-b bg-white flex items-center px-4">
        <div className="max-w-5xl mx-auto w-full flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">Panel docente</h1>
          <span className="text-xs text-gray-500">
            Versión inicial del panel de control
          </span>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
