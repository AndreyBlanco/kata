'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { DerivedInstrument } from '@/lib/vi-capa2-derived'
import { resolveInstrumentLabel, type InstrumentCatalogEntry } from '@/lib/instruments'

type Props = {
  studentId: string
  derived: DerivedInstrument[]
  instrumentsInVi: string[]
  catalog: InstrumentCatalogEntry[]
  disabled?: boolean
  onAddManual?: (code: string) => void
  manualCodes?: string[]
  onRemoveManual?: (code: string) => void
}

export function ViSectionInstruments({
  studentId,
  derived,
  instrumentsInVi,
  catalog,
  disabled,
  onAddManual,
  manualCodes = [],
  onRemoveManual,
}: Props) {
  const [showManual, setShowManual] = useState(false)

  const derivedCodes = new Set(derived.map((d) => d.code))
  const extraInVi = instrumentsInVi.filter((c) => !derivedCodes.has(c))

  if (derived.length === 0 && extraInVi.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-center text-xs text-gray-500">
        <p>No hay instrumentos registrados en Capa 2 para este periodo.</p>
        <Link
          href={`/estudiantes/${studentId}/expediente`}
          className="mt-2 inline-block text-blue-600 hover:underline"
        >
          Ir a entrevistas y observaciones
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-600">
        Lista derivada de entrevistas y observaciones del periodo. El borrador narrativo alimenta las
        secciones 2, 3, 4, 5 y 9 al incorporar evidencia — no se repite aquí.
      </p>

      <ul className="space-y-2">
        {derived.map((item) => {
          const inVi = instrumentsInVi.includes(item.code)
          const allApplied = item.sources.every((s) => s.appliedToAssessment)
          return (
            <li
              key={item.code}
              className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-gray-900">{item.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    inVi && allApplied
                      ? 'bg-green-100 text-green-800'
                      : inVi
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {inVi && allApplied
                    ? 'En informe VI'
                    : inVi
                      ? 'Parcial en VI'
                      : 'Pendiente en VI'}
                </span>
              </div>
              <ul className="mt-1.5 space-y-0.5 text-xs text-gray-600">
                {item.sources.map((s) => (
                  <li key={`${s.recordType}-${s.recordId}`}>
                    <Link
                      href={`/estudiantes/${studentId}/${s.recordType === 'interview' ? 'entrevistas' : 'observaciones'}/${s.recordId}`}
                      className="text-blue-600 hover:underline"
                    >
                      {s.label}
                    </Link>
                    {' · '}
                    {new Date(s.date).toLocaleDateString('es-CR')}
                  </li>
                ))}
              </ul>
            </li>
          )
        })}
      </ul>

      {extraInVi.length > 0 && (
        <div className="text-xs text-gray-600">
          <p className="mb-1 font-medium">Otros en la VI (fuera de Capa 2)</p>
          <div className="flex flex-wrap gap-2">
            {extraInVi.map((code) => (
              <span
                key={code}
                className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-blue-800"
              >
                {resolveInstrumentLabel(code, catalog)}
                {!disabled && onRemoveManual && (
                  <button
                    type="button"
                    onClick={() => onRemoveManual(code)}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {!disabled && onAddManual && (
        <div className="border-t border-gray-100 pt-2">
          <button
            type="button"
            onClick={() => setShowManual((v) => !v)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            {showManual ? '▲' : '▼'} Agregar instrumento adicional (escalas, otros)
          </button>
          {showManual && (
            <p className="mt-2 text-xs text-gray-500">
              Use el panel «Evidencia Capa 2» arriba para incorporar registros del periodo. Las
              pruebas diagnósticas aplicadas se evidencian justo debajo de esta lista.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
