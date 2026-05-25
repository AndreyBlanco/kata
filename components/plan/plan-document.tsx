'use client'

/**
 * Vista "documento" del plan: tabla Anexo 5 (3 columnas).
 *
 * Esta vista es print-friendly: imprime una página por categoría con sus
 * filas (fecha, lección, proceso, descripción) — pero el export oficial
 * Word se genera en /export y debe coincidir.
 */

import { useMemo } from 'react'
import type { MepProcess, ServiceLessonCategory } from '@prisma/client'
import type { PlanLine } from './plan-types'
import { SERVICE_CATEGORIES, getCategory } from '@/lib/schedule-template'

interface Props {
  lines: PlanLine[]
  year: number
  month: number
}

const MEP_PROCESS_LABELS: Record<MepProcess, string> = {
  IDENTIFICACION:  'Identificación',
  IMPLEMENTACION:  'Implementación',
  REFLEXION:       'Reflexión',
}

const MONTH_LABELS = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export function PlanDocument({ lines, year, month }: Props) {
  const grouped = useMemo(() => {
    const map = new Map<ServiceLessonCategory, PlanLine[]>()
    for (const l of lines) {
      if (!map.has(l.category)) map.set(l.category, [])
      map.get(l.category)!.push(l)
    }
    // Orden estándar del Anexo
    const ordered: Array<{ cat: ServiceLessonCategory; lines: PlanLine[] }> = []
    for (const c of SERVICE_CATEGORIES) {
      const arr = map.get(c.code)
      if (arr && arr.length > 0) ordered.push({ cat: c.code, lines: arr })
    }
    return ordered
  }, [lines])

  if (grouped.length === 0) {
    return <p className="rounded border bg-gray-50 p-4 text-xs text-gray-500">
      Aún no hay líneas en este plan.  Usa la pestaña <strong>Calendario</strong> para asignar
      lecciones a líneas.
    </p>
  }

  const monthLabel = `${MONTH_LABELS[month]} ${year}`

  return (
    <div className="space-y-6">
      <div className="rounded border bg-white p-3 text-xs">
        <p className="font-semibold text-gray-900">
          Anexo 5 — Planificación de acciones · {monthLabel}
        </p>
        <p className="text-gray-500">
          Tabla de tres columnas: categoría · proceso · descripción.  Esta vista refleja
          el documento oficial a entregar.
        </p>
      </div>

      {grouped.map(({ cat, lines: ls }) => {
        const def = getCategory(cat)
        const totalLec = ls.reduce((s, l) => s + l.slots.length, 0)
        return (
          <section key={cat} className="rounded-lg border bg-white">
            <header className={`flex items-center justify-between rounded-t-lg border-b px-3 py-2 ${def?.color ?? ''}`}>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide">{def?.shortLabel}</p>
                <p className="text-[10px] opacity-80">{def?.label}</p>
              </div>
              <span className="text-[11px] font-semibold">{totalLec} lec</span>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="w-32 border-b px-2 py-1 font-medium text-gray-600">Proceso</th>
                    <th className="w-20 border-b px-2 py-1 text-center font-medium text-gray-600">Lecciones</th>
                    <th className="border-b px-2 py-1 font-medium text-gray-600">Descripción / observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {ls.map((l) => (
                    <tr key={l.clientId} className="align-top">
                      <td className="border-b border-gray-100 px-2 py-1.5">
                        {MEP_PROCESS_LABELS[l.mepProcess]}
                      </td>
                      <td className="border-b border-gray-100 px-2 py-1.5 text-center">
                        {l.slots.length}
                      </td>
                      <td className="border-b border-gray-100 px-2 py-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="whitespace-pre-wrap text-gray-800">
                            {l.description || <em className="text-gray-400">(sin descripción)</em>}
                          </div>
                          {l.aiGenerated && (
                            <span
                              title={
                                l.linkedAnnualActivityId
                                  ? `Generado por IA · Plan Anual: ${l.linkedAnnualActivityId}`
                                  : 'Generado por IA'
                              }
                              className="shrink-0 rounded-full bg-indigo-100 px-1.5 py-0.5 text-[9px] font-semibold text-indigo-800"
                            >
                              ⚙ IA
                            </span>
                          )}
                        </div>
                        {l.observations && (
                          <div className="mt-1 whitespace-pre-wrap text-[10px] text-gray-500">
                            Obs.: {l.observations}
                          </div>
                        )}
                        {l.linkedItemIds.length > 0 && (
                          <div className="mt-1 text-[10px] text-blue-700">
                            ↳ Vinculado a {l.linkedItemIds.length} objetivo
                            {l.linkedItemIds.length === 1 ? '' : 's'} derivado
                            {l.linkedItemIds.length === 1 ? '' : 's'}
                          </div>
                        )}
                        {l.linkedAnnualActivityId && (
                          <div className="mt-1 text-[10px] text-indigo-700">
                            ↳ Plan Anual: actividad {l.linkedAnnualActivityId}
                          </div>
                        )}
                        {l.slots.length > 0 && (
                          <div className="mt-1 text-[10px] text-gray-500">
                            Fechas: {l.slots
                              .map((s) => s.date.slice(8, 10))
                              .sort()
                              .join(', ')}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )
      })}
    </div>
  )
}
