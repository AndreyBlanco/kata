'use client'

import Link from 'next/link'
import type { Capa2RecordRef } from '@/lib/vi-capa2-derived'

type Props = {
  studentId: string
  sources: Capa2RecordRef[]
  message?: string
}

export function Capa2SectionHint({ studentId, sources, message }: Props) {
  if (sources.length === 0) return null

  const defaultMessage =
    'El contenido narrativo se registra en Capa 2 y se incorpora a esta sección al aplicar el borrador. Edite aquí solo para afinar la redacción del informe.'

  return (
    <div className="mb-3 rounded-lg border border-teal-100 bg-teal-50/80 px-3 py-2 text-xs text-teal-900">
      <p className="font-medium">Alimentado desde Capa 2</p>
      <p className="mt-0.5 text-teal-800">{message ?? defaultMessage}</p>
      <ul className="mt-2 space-y-1">
        {sources.map((s) => (
          <li key={`${s.recordType}-${s.recordId}`} className="flex flex-wrap items-center gap-2">
            <span>
              {s.label}
              <span className="text-teal-600">
                {' '}
                · {new Date(s.date).toLocaleDateString('es-CR')}
              </span>
              {s.appliedToAssessment ? (
                <span className="ml-1 text-green-700">(en VI)</span>
              ) : (
                <span className="ml-1 text-amber-700">(pendiente incorporar)</span>
              )}
            </span>
            <Link
              href={`/estudiantes/${studentId}/${s.recordType === 'interview' ? 'entrevistas' : 'observaciones'}/${s.recordId}`}
              className="text-teal-700 underline hover:text-teal-900"
            >
              Ver registro
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
