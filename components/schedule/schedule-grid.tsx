'use client'

/**
 * components/schedule/schedule-grid.tsx
 *
 * Grilla semanal del horario base.  Renderiza días en columnas y bloques en
 * filas (ordenados por blockIndex).  Las celdas LESSON son seleccionables
 * y muestran color según la categoría asignada; los bloques RECESS/LUNCH se
 * pintan en gris y no son editables.
 */

import type { ScheduleBlockType, ServiceLessonCategory, AfternoonVariant } from '@prisma/client'
import { SERVICE_CATEGORIES, getCategory } from '@/lib/schedule-template'

export interface ScheduleSlotView {
  id: string
  dayOfWeek: number
  blockIndex: number
  blockType: ScheduleBlockType
  startTime: string
  endTime: string
  durationMinutes: number
  label?: string | null
  afternoonVariant?: AfternoonVariant | null
  category: ServiceLessonCategory | null
}

interface Props {
  slots: ScheduleSlotView[]
  onCategoryChange?: (slotId: string, next: ServiceLessonCategory | null) => void
  /** Cuando es true, las celdas LESSON no son editables (solo lectura). */
  readOnly?: boolean
  /** Opcional: ID del slot actualmente "abierto" (popover). */
  activeSlotId?: string | null
  onActiveSlotChange?: (id: string | null) => void
}

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie']

export function ScheduleGrid({
  slots,
  onCategoryChange,
  readOnly,
  activeSlotId,
  onActiveSlotChange,
}: Props) {
  // Agrupar por blockIndex para alinear horizontalmente
  const byBlockIndex = new Map<number, ScheduleSlotView[]>()
  for (const s of slots) {
    if (!byBlockIndex.has(s.blockIndex)) byBlockIndex.set(s.blockIndex, [])
    byBlockIndex.get(s.blockIndex)!.push(s)
  }
  const orderedRows = Array.from(byBlockIndex.entries()).sort((a, b) => a[0] - b[0])

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] table-fixed border-collapse text-xs">
        <thead>
          <tr>
            <th className="w-20 border-b border-gray-200 bg-gray-50 px-2 py-2 text-left text-[10px] font-medium uppercase tracking-wide text-gray-500">
              Hora
            </th>
            {DAYS.map((d) => (
              <th
                key={d}
                className="border-b border-gray-200 bg-gray-50 px-2 py-2 text-center text-[10px] font-medium uppercase tracking-wide text-gray-500"
              >
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orderedRows.map(([blockIdx, rowSlots]) => {
            // Tomar el primer slot del día 1 para mostrar la hora (es igual cross-day por convención)
            const ref = rowSlots[0]
            return (
              <tr key={blockIdx}>
                <td className="border-b border-gray-100 px-2 py-1 align-top">
                  <div className="text-[10px] text-gray-500">{ref.startTime}</div>
                  <div className="text-[10px] text-gray-400">{ref.endTime}</div>
                </td>
                {DAYS.map((_, dIdx) => {
                  const day = dIdx + 1
                  const s = rowSlots.find((r) => r.dayOfWeek === day)
                  if (!s) {
                    return (
                      <td key={day} className="border-b border-gray-100 bg-gray-50/40" />
                    )
                  }
                  return (
                    <td key={day} className="border-b border-gray-100 align-top">
                      <SlotCell
                        slot={s}
                        readOnly={readOnly}
                        active={activeSlotId === s.id}
                        onCategoryChange={onCategoryChange}
                        onToggleActive={onActiveSlotChange}
                      />
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
      <Legend />
    </div>
  )
}

function SlotCell({
  slot,
  onCategoryChange,
  readOnly,
  active,
  onToggleActive,
}: {
  slot: ScheduleSlotView
  onCategoryChange?: (slotId: string, next: ServiceLessonCategory | null) => void
  readOnly?: boolean
  active?: boolean
  onToggleActive?: (id: string | null) => void
}) {
  if (slot.blockType !== 'LESSON') {
    return (
      <div className="m-0.5 rounded bg-gray-100 px-2 py-1 text-center text-[10px] text-gray-500">
        {slot.label ?? (slot.blockType === 'LUNCH' ? 'Almuerzo' : 'Receso')}
      </div>
    )
  }

  const def = slot.category ? getCategory(slot.category) : null
  const baseClass = def
    ? def.color
    : 'bg-white text-gray-400 border border-dashed border-gray-300'

  return (
    <div className="relative m-0.5">
      <button
        type="button"
        disabled={readOnly}
        onClick={() => onToggleActive?.(active ? null : slot.id)}
        className={`block w-full rounded border px-2 py-1 text-left text-[10px] transition-colors ${baseClass} ${
          readOnly ? 'cursor-default' : 'hover:shadow-sm'
        }`}
        title={def?.label ?? 'Sin asignar'}
      >
        {def ? def.shortLabel : '— sin asignar'}
      </button>

      {active && !readOnly && (
        <div className="absolute z-10 mt-1 w-44 rounded-lg border border-gray-200 bg-white p-2 text-[11px] shadow-lg">
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-gray-500">
            Asignar categoría
          </p>
          <ul className="space-y-1">
            {SERVICE_CATEGORIES.map((c) => (
              <li key={c.code}>
                <button
                  type="button"
                  onClick={() => {
                    onCategoryChange?.(slot.id, c.code)
                    onToggleActive?.(null)
                  }}
                  className={`block w-full rounded px-2 py-1 text-left text-[11px] ${c.color} hover:brightness-95`}
                >
                  {c.shortLabel}
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => {
                  onCategoryChange?.(slot.id, null)
                  onToggleActive?.(null)
                }}
                className="block w-full rounded border border-dashed border-gray-300 px-2 py-1 text-left text-[11px] text-gray-500 hover:bg-gray-50"
              >
                Quitar asignación
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}

function Legend() {
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {SERVICE_CATEGORIES.map((c) => (
        <span
          key={c.code}
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] ${c.color}`}
        >
          {c.shortLabel}
        </span>
      ))}
    </div>
  )
}
