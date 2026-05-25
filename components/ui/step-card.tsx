'use client'

import { cn } from '@/lib/cn'

export type StepStatus = 'empty' | 'started' | 'complete'

type StepCardProps = {
  step: number
  title: string
  description: string
  status: StepStatus
  statusLabels: Record<StepStatus, string>
  onClick: () => void
  disabled?: boolean
}

const statusColors: Record<StepStatus, string> = {
  empty: 'bg-gray-100 text-gray-500',
  started: 'bg-amber-100 text-amber-800',
  complete: 'bg-green-100 text-green-800',
}

const stepColors: Record<StepStatus, string> = {
  empty: 'bg-gray-200 text-gray-500',
  started: 'bg-amber-500 text-white',
  complete: 'bg-green-500 text-white',
}

export function StepCard({
  step,
  title,
  description,
  status,
  statusLabels,
  onClick,
  disabled = false,
}: StepCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-center gap-4 rounded-lg border bg-white p-4 text-left shadow-sm transition-all',
        disabled
          ? 'cursor-not-allowed opacity-60'
          : 'hover:border-kata-primary/40 hover:shadow-md',
      )}
    >
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold',
          stepColors[status],
        )}
      >
        {status === 'complete' ? (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          step
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <p className="mt-0.5 truncate text-xs text-gray-500">{description}</p>
      </div>

      <span
        className={cn(
          'shrink-0 rounded-full px-2.5 py-1 text-xs font-medium',
          statusColors[status],
        )}
      >
        {statusLabels[status]}
      </span>

      <svg
        className="h-4 w-4 shrink-0 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  )
}
