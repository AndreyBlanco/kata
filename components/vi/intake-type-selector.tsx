'use client'

import {
  SERVICE_INTAKE_LABELS,
  type ServiceIntakeType,
} from '@/lib/vi-completeness'

type Props = {
  value: ServiceIntakeType | null
  onChange: (value: ServiceIntakeType) => void
  saving?: boolean
}

export function IntakeTypeSelector({ value, onChange, saving }: Props) {
  const options: ServiceIntakeType[] = ['nuevo_ingreso', 'continuidad']

  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3">
      <p className="mb-2 text-xs font-medium text-gray-700">Tipo de atención en el servicio PA</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = value === opt
          return (
            <button
              key={opt}
              type="button"
              disabled={saving}
              onClick={() => onChange(opt)}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${
                selected
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {SERVICE_INTAKE_LABELS[opt]}
            </button>
          )
        })}
      </div>
      {!value && (
        <p className="mt-2 text-xs text-amber-700">
          Indique si es ingreso nuevo o continuidad para ajustar el checklist de Capa 2.
        </p>
      )}
    </div>
  )
}
