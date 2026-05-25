'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/cn'

type BsaFlagCardProps = {
  received: boolean
  receivedDate: string | null
  saving?: boolean
  onChange: (received: boolean, dateIso: string | null) => void
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function BsaFlagCard({
  received,
  receivedDate,
  saving = false,
  onChange,
}: BsaFlagCardProps) {
  const [dateValue, setDateValue] = useState(
    receivedDate?.slice(0, 10) ?? todayIso(),
  )

  const handleToggle = (checked: boolean) => {
    if (checked) {
      const d = dateValue || todayIso()
      setDateValue(d)
      onChange(true, d)
    } else {
      onChange(false, null)
    }
  }

  const handleDateChange = (value: string) => {
    setDateValue(value)
    if (received && value) {
      onChange(true, value)
    }
  }

  return (
    <Card
      className={cn(
        'border',
        received ? 'border-kata-primary/30 bg-kata-primary/5' : 'border-amber-200 bg-amber-50',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-gray-900">Solicitud BSA</p>
          <p className="mt-1 text-xs text-gray-600">
            Katà no tramita la boleta; solo registra si ya la recibió antes de la VI.
          </p>
        </div>
        <Badge tone={received ? 'primary' : 'warning'}>
          {received ? 'Recibida' : 'Pendiente'}
        </Badge>
      </div>

      <label className="mt-4 flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={received}
          disabled={saving}
          onChange={(e) => handleToggle(e.target.checked)}
          className="h-5 w-5 rounded border-gray-300 text-kata-primary focus:ring-kata-primary"
        />
        <span className="text-sm text-gray-800">Ya recibí la solicitud BSA del centro</span>
      </label>

      {received && (
        <div className="mt-3">
          <label htmlFor="bsa-date" className="mb-1 block text-xs font-medium text-gray-700">
            Fecha de recepción
          </label>
          <input
            id="bsa-date"
            type="date"
            value={dateValue}
            disabled={saving}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900
                       focus:border-kata-primary focus:outline-none focus:ring-1 focus:ring-kata-primary"
          />
        </div>
      )}

      {saving && (
        <p className="mt-2 text-xs text-gray-500">Guardando...</p>
      )}
    </Card>
  )
}
