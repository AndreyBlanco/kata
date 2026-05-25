'use client'

import Link from 'next/link'
import { cn } from '@/lib/cn'
import { Badge } from '@/components/ui/badge'
import type { BadgeTone } from '@/components/ui/badge'

type ListRowProps = {
  href: string
  title: string
  subtitle?: string
  meta?: string
  statusLabel: string
  statusTone?: BadgeTone
  trailing?: React.ReactNode
  className?: string
}

export function ListRow({
  href,
  title,
  subtitle,
  meta,
  statusLabel,
  statusTone = 'neutral',
  trailing,
  className,
}: ListRowProps) {
  return (
    <Link
      href={href}
      className={cn(
        'block rounded-lg border bg-white p-4 shadow-sm transition-colors',
        'hover:border-kata-primary/40 hover:shadow-md',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium text-gray-900">{title}</h3>
          {subtitle && (
            <p className="mt-0.5 truncate text-sm text-gray-500">{subtitle}</p>
          )}
          {meta && <p className="mt-1 text-xs text-gray-400">{meta}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge tone={statusTone}>{statusLabel}</Badge>
          {trailing}
        </div>
      </div>
    </Link>
  )
}
