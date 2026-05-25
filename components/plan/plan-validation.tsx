'use client'

import type { PlanValidation } from './plan-types'
import { categoryStatusBadge } from '@/lib/action-plan-validation'

interface Props {
  validation: PlanValidation
}

export function PlanValidationPanel({ validation }: Props) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-white p-3 text-xs">
        <p className="text-gray-700">
          Plan: <strong>{validation.year}-{String(validation.month).padStart(2, '0')}</strong> ·
          Modalidad: <strong>{validation.modality === 'FIJO' ? 'Fijo' : 'Itinerante'}</strong>
          {' · '}{validation.weeksInMonth} semanas
        </p>
        <p className="mt-1 text-gray-700">
          Lecciones asignadas: <strong>{validation.totalAssigned}</strong> de{' '}
          <strong>{validation.totalMonthlyQuota}</strong> esperadas (
          {validation.totalWeeklyQuota}/sem × {validation.weeksInMonth} sem).
        </p>
        {validation.warnings.length > 0 && (
          <ul className="mt-2 space-y-0.5">
            {validation.warnings.map((w, i) => (
              <li key={i} className="text-[11px] text-amber-700">⚠ {w}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {validation.categories.map((c) => (
          <div
            key={c.code}
            className={`rounded-lg border bg-white p-3 text-xs ${
              c.status === 'over'
                ? 'border-rose-300'
                : c.status === 'under'
                  ? 'border-amber-300'
                  : 'border-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-gray-800">{c.label}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] ${categoryStatusBadge(c.status)}`}>
                {c.lessonsAssigned}/{c.monthlyQuota}
              </span>
            </div>
            <p className="mt-1 text-[10px] text-gray-500">
              {c.weeklyQuota} lec/sem esperadas · {c.remaining >= 0 ? `faltan ${c.remaining}` : `exceso de ${Math.abs(c.remaining)}`}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
