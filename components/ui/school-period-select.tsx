'use client'

import { cn } from '@/lib/cn'
import type { SchoolPeriodDefinition } from '@/lib/school-periods'

type SchoolPeriodSelectProps = {
  periods: SchoolPeriodDefinition[]
  value: string
  onChange: (periodId: string) => void
  disabled?: boolean
  className?: string
}

export function SchoolPeriodSelect({
  periods,
  value,
  onChange,
  disabled = false,
  className,
}: SchoolPeriodSelectProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {periods.map((p) => (
        <label
          key={p.id}
          className={cn(
            'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
            value === p.id
              ? 'border-kata-primary bg-kata-primary/5'
              : 'border-gray-200 hover:border-gray-300',
            disabled && 'cursor-not-allowed opacity-60',
          )}
        >
          <input
            type="radio"
            name="schoolPeriod"
            value={p.id}
            checked={value === p.id}
            disabled={disabled}
            onChange={() => onChange(p.id)}
            className="mt-1 text-kata-primary focus:ring-kata-primary"
          />
          <div className="min-w-0">
            <span className="block text-sm font-medium text-gray-900">{p.label}</span>
            <span className="text-xs text-gray-500">{p.dateRangeLabel}</span>
          </div>
        </label>
      ))}
    </div>
  )
}
