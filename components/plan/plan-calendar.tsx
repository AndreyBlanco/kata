'use client'

/**
 * Calendario visual del plan mensual.  Grilla = semanas (filas) × días (cols)
 * y dentro de cada celda se muestran los bloques LESSON del horario base.
 * Cada lección puede tener una línea asignada → se pinta con el color de la
 * categoría asignada en el horario; si tiene una línea del plan vinculada,
 * se muestra el snippet de descripción.
 *
 * Al hacer click sobre un bloque LESSON, se invoca onSlotClick para abrir
 * el modal lateral de edición.
 */

import { useMemo } from 'react'
import type {
  PlanLine,
  ScheduleSlotInfo,
  WeekdayInfo,
} from './plan-types'
import { getCategory } from '@/lib/schedule-template'

interface Props {
  weekdays: WeekdayInfo[]
  scheduleSlots: ScheduleSlotInfo[]
  lines: PlanLine[]
  onSlotClick: (args: {
    date: string
    weekNumber: number
    dayOfWeek: number
    scheduleSlotId: string
  }) => void
  activeKey?: string | null
}

const DAY_LABELS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

export function PlanCalendar({
  weekdays,
  scheduleSlots,
  lines,
  onSlotClick,
  activeKey,
}: Props) {
  // Mapa slot+fecha → línea
  const slotIndex = useMemo(() => {
    const map = new Map<string, PlanLine>()
    for (const line of lines) {
      for (const s of line.slots) {
        map.set(`${s.scheduleSlotId}::${s.date.slice(0, 10)}`, line)
      }
    }
    return map
  }, [lines])

  // Agrupar weekdays por weekNumber
  const weeks = useMemo(() => {
    const map = new Map<number, WeekdayInfo[]>()
    for (const d of weekdays) {
      if (!map.has(d.weekNumber)) map.set(d.weekNumber, [])
      map.get(d.weekNumber)!.push(d)
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0])
  }, [weekdays])

  // Bloques LESSON únicos ordenados (templates "row" para una columna día)
  const lessonBlocks = useMemo(() => {
    const seen = new Map<number, ScheduleSlotInfo>()
    for (const s of scheduleSlots) {
      if (s.blockType !== 'LESSON') continue
      if (!seen.has(s.blockIndex)) seen.set(s.blockIndex, s)
    }
    return Array.from(seen.entries()).sort((a, b) => a[0] - b[0]).map(([, s]) => s)
  }, [scheduleSlots])

  // Indexar slots reales por (dayOfWeek, blockIndex)
  const slotByDayBlock = useMemo(() => {
    const map = new Map<string, ScheduleSlotInfo>()
    for (const s of scheduleSlots) {
      if (s.blockType === 'LESSON') {
        map.set(`${s.dayOfWeek}::${s.blockIndex}`, s)
      }
    }
    return map
  }, [scheduleSlots])

  if (weeks.length === 0) {
    return <p className="p-4 text-xs text-gray-500">El mes no tiene días hábiles.</p>
  }

  return (
    <div className="space-y-4">
      {weeks.map(([weekNumber, days]) => (
        <div key={weekNumber} className="rounded-lg border bg-white">
          <div className="border-b bg-gray-50 px-3 py-1.5 text-[11px] font-medium text-gray-600">
            Semana {weekNumber} ({days[0].date.slice(8, 10)} – {days[days.length - 1].date.slice(8, 10)})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] table-fixed border-collapse text-[11px]">
              <thead>
                <tr>
                  <th className="w-16 border-b border-gray-100 bg-gray-50/50 px-1.5 py-1 text-left text-[10px] uppercase tracking-wide text-gray-500">
                    Bloque
                  </th>
                  {[1, 2, 3, 4, 5].map((dow) => {
                    const dayInfo = days.find((d) => d.dayOfWeek === dow)
                    return (
                      <th
                        key={dow}
                        className="border-b border-gray-100 bg-gray-50/50 px-1.5 py-1 text-center text-[10px] uppercase tracking-wide text-gray-500"
                      >
                        {DAY_LABELS[dow].slice(0, 3)}
                        {dayInfo && (
                          <span className="ml-1 text-gray-400">{dayInfo.date.slice(8, 10)}</span>
                        )}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {lessonBlocks.map((block) => (
                  <tr key={block.blockIndex}>
                    <td className="border-b border-gray-100 px-1.5 py-1 align-top">
                      <div className="text-[10px] text-gray-500">{block.startTime}</div>
                      <div className="text-[10px] text-gray-400">{block.endTime}</div>
                    </td>
                    {[1, 2, 3, 4, 5].map((dow) => {
                      const dayInfo = days.find((d) => d.dayOfWeek === dow)
                      const sched = slotByDayBlock.get(`${dow}::${block.blockIndex}`)
                      if (!dayInfo || !sched) {
                        return (
                          <td key={dow} className="border-b border-gray-100 bg-gray-50/30" />
                        )
                      }
                      const key = `${sched.id}::${dayInfo.date}`
                      const line = slotIndex.get(key)
                      const cat = sched.category ? getCategory(sched.category) : null
                      const isActive = activeKey === key
                      const baseColor = cat?.color ?? 'bg-white border-dashed border-gray-300 text-gray-400'
                      return (
                        <td key={dow} className="border-b border-gray-100 align-top">
                          <button
                            type="button"
                            onClick={() =>
                              onSlotClick({
                                date: dayInfo.date,
                                weekNumber: dayInfo.weekNumber,
                                dayOfWeek: dayInfo.dayOfWeek,
                                scheduleSlotId: sched.id,
                              })
                            }
                            className={`m-0.5 flex w-[calc(100%-4px)] min-h-[44px] flex-col justify-start rounded border px-1.5 py-1 text-left transition-all ${baseColor} ${
                              isActive ? 'ring-2 ring-blue-500' : 'hover:brightness-95'
                            }`}
                          >
                            <span className="text-[9px] font-medium uppercase tracking-wide opacity-80">
                              {cat ? cat.shortLabel : 'sin asignar'}
                            </span>
                            {line ? (
                              <span className="mt-0.5 line-clamp-2 text-[10px] font-medium">
                                {line.description || '(sin descripción)'}
                              </span>
                            ) : (
                              <span className="mt-0.5 text-[10px] italic opacity-60">+ asignar</span>
                            )}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}
