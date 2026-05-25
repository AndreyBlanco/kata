'use client'

import { usePathname } from 'next/navigation'
import { AppNav } from '@/components/ui/app-nav'
import { shouldShowAppNav } from '@/lib/navigation'

type AppShellProps = {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const showNav = shouldShowAppNav(pathname)

  return (
    <div className="min-h-screen bg-kata-surface">
      <div className={showNav ? 'pb-[calc(3.5rem+env(safe-area-inset-bottom))]' : ''}>
        {children}
      </div>
      {showNav && <AppNav />}
    </div>
  )
}
