'use client'

/**
 * Modal lateral para editar/asignar una lección a una línea del plan.
 *
 * Comportamiento:
 *  - Si la lección ya tiene línea asignada → muestra detalles editables y
 *    permite "Vaciar lección" para liberarla.
 *  - Si está vacía → muestra opciones:
 *      a) Asignar a una línea existente (drop-down).
 *      b) Crear nueva línea con la categoría del horario (precarga).
 *
 * Onroller usa la prop onChange con la representación completa de líneas
 * actualizadas para mantener todo en el estado del padre.
 */

import { useEffect, useMemo, useState } from 'react'
import type { MepProcess, ServiceLessonCategory } from '@prisma/client'
import type { PlanLine, ScheduleSlotInfo } from './plan-types'
import { SERVICE_CATEGORIES, getCategory } from '@/lib/schedule-template'

interface StudentWithObjectives {
  id: string
  name: string
  grade: string
  objectives: Array<{
    itemId: string
    description: string
    difficultyLabel: string
    activityTitle: string
    resultLabel: string
  }>
}

interface Props {
  open: boolean
  onClose: () => void
  scheduleSlot: ScheduleSlotInfo | null
  date: string
  weekNumber: number
  dayOfWeek: number
  lines: PlanLine[]
  students: StudentWithObjectives[]
  readOnly: boolean
  onChange: (next: PlanLine[]) => void
}

const MEP_PROCESS_LABELS: Record<MepProcess, string> = {
  IDENTIFICACION:  'Identificación',
  IMPLEMENTACION:  'Implementación',
  REFLEXION:       'Reflexión',
}

export function PlanSlotModal({
  open,
  onClose,
  scheduleSlot,
  date,
  weekNumber,
  dayOfWeek,
  lines,
  students,
  readOnly,
  onChange,
}: Props) {
  // Línea actualmente vinculada a este slot+fecha (si existe)
  const linkedLine = useMemo(() => {
    if (!scheduleSlot) return null
    return lines.find((l) =>
      l.slots.some(
        (s) => s.scheduleSlotId === scheduleSlot.id && s.date.slice(0, 10) === date.slice(0, 10),
      ),
    ) ?? null
  }, [lines, scheduleSlot, date])

  const slotCategory: ServiceLessonCategory | null = scheduleSlot?.category ?? null

  const [editingId, setEditingId] = useState<string | null>(null)

  // Cuando cambia el slot enfocado, re-sincronizamos:
  useEffect(() => {
    if (!open) return
    setEditingId(linkedLine ? linkedLine.clientId : null)
  }, [open, scheduleSlot?.id, date, linkedLine])

  if (!open || !scheduleSlot) return null

  const editing = lines.find((l) => l.clientId === editingId) ?? null

  function updateLine(clientId: string, patch: Partial<PlanLine>) {
    onChange(
      lines.map((l) =>
        l.clientId === clientId
          ? { ...l, ...patch, lessonCount: patch.slots ? patch.slots.length : l.lessonCount }
          : l,
      ),
    )
  }

  function assignSlotToLine(clientId: string) {
    if (!scheduleSlot) return
    const target = lines.find((l) => l.clientId === clientId)
    if (!target) return
    // Si ya estaba asignado a otra línea, lo quitamos primero
    let next = lines.map((l) => ({
      ...l,
      slots: l.slots.filter(
        (s) => !(s.scheduleSlotId === scheduleSlot.id && s.date.slice(0, 10) === date.slice(0, 10)),
      ),
    }))
    next = next.map((l) =>
      l.clientId === clientId
        ? {
            ...l,
            slots: [
              ...l.slots,
              {
                scheduleSlotId: scheduleSlot.id,
                weekNumber,
                dayOfWeek,
                date,
                startTime: scheduleSlot.startTime,
                endTime: scheduleSlot.endTime,
                blockIndex: scheduleSlot.blockIndex,
              },
            ],
            lessonCount: l.slots.length + 1,
          }
        : l,
    )
    onChange(next)
    setEditingId(clientId)
  }

  function createLineForSlot() {
    if (!scheduleSlot || !slotCategory) return
    const newLine: PlanLine = {
      clientId: `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      category: slotCategory,
      mepProcess: 'IMPLEMENTACION',
      description: '',
      observations: '',
      lessonCount: 1,
      studentId: null,
      linkedItemIds: [],
      sortOrder: lines.length,
      slots: [
        {
          scheduleSlotId: scheduleSlot.id,
          weekNumber,
          dayOfWeek,
          date,
          startTime: scheduleSlot.startTime,
          endTime: scheduleSlot.endTime,
          blockIndex: scheduleSlot.blockIndex,
        },
      ],
    }
    onChange([...lines, newLine])
    setEditingId(newLine.clientId)
  }

  function clearSlot() {
    if (!scheduleSlot) return
    onChange(
      lines.map((l) => ({
        ...l,
        slots: l.slots.filter(
          (s) => !(s.scheduleSlotId === scheduleSlot.id && s.date.slice(0, 10) === date.slice(0, 10)),
        ),
        lessonCount: l.slots.filter(
          (s) => !(s.scheduleSlotId === scheduleSlot.id && s.date.slice(0, 10) === date.slice(0, 10)),
        ).length,
      })),
    )
    setEditingId(null)
  }

  // Líneas existentes de la misma categoría (para el selector "asignar a línea existente")
  const candidateLines = lines.filter((l) => l.category === slotCategory)

  const selectedStudent = editing?.studentId
    ? students.find((s) => s.id === editing.studentId)
    : null

  return (
    <div className="fixed inset-0 z-40 flex">
      <div
        className="flex-1 bg-black/30 transition-opacity"
        onClick={onClose}
        aria-hidden
      />
      <aside className="flex h-full w-full max-w-md flex-col overflow-y-auto border-l bg-white shadow-xl">
        <header className="sticky top-0 z-10 border-b bg-white px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-500">
                Semana {weekNumber} · {DAY_LABELS[dayOfWeek]} {date.slice(8, 10)}
              </p>
              <h3 className="text-sm font-semibold text-gray-900">
                {scheduleSlot.startTime} – {scheduleSlot.endTime}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-gray-500 hover:bg-gray-100"
            >
              <span aria-hidden>✕</span>
              <span className="sr-only">Cerrar</span>
            </button>
          </div>
          {slotCategory ? (
            <span
              className={`mt-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] ${
                getCategory(slotCategory)?.color ?? ''
              }`}
            >
              {getCategory(slotCategory)?.shortLabel}
            </span>
          ) : (
            <span className="mt-2 inline-flex items-center rounded-full border border-dashed border-gray-300 px-2 py-0.5 text-[10px] text-gray-500">
              sin categoría — asígnala en /horario
            </span>
          )}
        </header>

        <div className="flex-1 space-y-4 px-4 py-4">
          {!editing && (
            <div className="space-y-3">
              {!slotCategory ? (
                <p className="text-xs text-amber-700">
                  Esta lección no tiene categoría asignada en el horario base. Asígnala en{' '}
                  <a href="/horario" className="underline">/horario</a> para poder planificarla.
                </p>
              ) : (
                <>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={createLineForSlot}
                      className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      + Crear nueva línea ({getCategory(slotCategory)?.shortLabel})
                    </button>
                  )}
                  {candidateLines.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500">
                        O asignar a una línea existente:
                      </p>
                      <ul className="space-y-1">
                        {candidateLines.map((l) => (
                          <li key={l.clientId}>
                            <button
                              type="button"
                              disabled={readOnly}
                              onClick={() => assignSlotToLine(l.clientId)}
                              className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-left text-xs hover:bg-gray-50 disabled:opacity-50"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="line-clamp-2">{l.description || '(sin descripción)'}</span>
                                {l.aiGenerated && (
                                  <span className="shrink-0 rounded-full bg-indigo-100 px-1 py-0.5 text-[9px] font-semibold text-indigo-800">
                                    ⚙ IA
                                  </span>
                                )}
                              </div>
                              <span className="mt-0.5 block text-[10px] text-gray-400">
                                {l.slots.length} lec · {MEP_PROCESS_LABELS[l.mepProcess]}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {editing && (
            <>
              {editing.aiGenerated && (
                <div className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] text-indigo-900">
                  ⚙ Línea generada por IA{editing.linkedAnnualActivityId ? ` · Plan Anual: actividad ${editing.linkedAnnualActivityId}` : ''}
                </div>
              )}
              <label className="block">
                <span className="block text-[11px] font-medium text-gray-600">
                  Descripción de la acción / mediación
                </span>
                <textarea
                  rows={3}
                  className="mt-1 w-full rounded border-gray-300 px-2 py-1.5 text-sm"
                  value={editing.description}
                  onChange={(e) => updateLine(editing.clientId, { description: e.target.value })}
                  placeholder="Describe la acción a realizar en esta lección…"
                  disabled={readOnly}
                />
              </label>

              <label className="block">
                <span className="block text-[11px] font-medium text-gray-600">
                  Observaciones (opcional)
                </span>
                <textarea
                  rows={2}
                  className="mt-1 w-full rounded border-gray-300 px-2 py-1.5 text-sm"
                  value={editing.observations}
                  onChange={(e) => updateLine(editing.clientId, { observations: e.target.value })}
                  disabled={readOnly}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="block text-[11px] font-medium text-gray-600">Proceso</span>
                  <select
                    className="mt-1 w-full rounded border-gray-300 px-2 py-1.5 text-sm"
                    value={editing.mepProcess}
                    onChange={(e) =>
                      updateLine(editing.clientId, { mepProcess: e.target.value as MepProcess })
                    }
                    disabled={readOnly}
                  >
                    {(Object.keys(MEP_PROCESS_LABELS) as MepProcess[]).map((p) => (
                      <option key={p} value={p}>
                        {MEP_PROCESS_LABELS[p]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="block text-[11px] font-medium text-gray-600">Categoría</span>
                  <select
                    className="mt-1 w-full rounded border-gray-300 px-2 py-1.5 text-sm"
                    value={editing.category}
                    onChange={(e) =>
                      updateLine(editing.clientId, {
                        category: e.target.value as ServiceLessonCategory,
                      })
                    }
                    disabled={readOnly}
                  >
                    {SERVICE_CATEGORIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.shortLabel}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="block text-[11px] font-medium text-gray-600">
                  Estudiante asociado (opcional)
                </span>
                <select
                  className="mt-1 w-full rounded border-gray-300 px-2 py-1.5 text-sm"
                  value={editing.studentId ?? ''}
                  onChange={(e) =>
                    updateLine(editing.clientId, {
                      studentId: e.target.value || null,
                      linkedItemIds: [],
                    })
                  }
                  disabled={readOnly}
                >
                  <option value="">(grupal / no asociado a un estudiante específico)</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {s.grade}
                    </option>
                  ))}
                </select>
              </label>

              {selectedStudent && (
                <div className="rounded-md border border-blue-100 bg-blue-50/40 p-2">
                  <p className="text-[11px] font-medium text-blue-800">
                    Objetivos activos de {selectedStudent.name}
                  </p>
                  {selectedStudent.objectives.length === 0 ? (
                    <p className="mt-1 text-[11px] text-blue-700/80">
                      No tiene objetivos derivados activos.
                    </p>
                  ) : (
                    <ul className="mt-1 max-h-44 space-y-1 overflow-y-auto pr-1">
                      {selectedStudent.objectives.map((o) => {
                        const checked = editing.linkedItemIds.includes(o.itemId)
                        return (
                          <li key={o.itemId}>
                            <label className="flex cursor-pointer items-start gap-2 rounded px-1 py-0.5 hover:bg-white">
                              <input
                                type="checkbox"
                                className="mt-0.5"
                                checked={checked}
                                disabled={readOnly}
                                onChange={() => {
                                  const next = checked
                                    ? editing.linkedItemIds.filter((id) => id !== o.itemId)
                                    : [...editing.linkedItemIds, o.itemId]
                                  updateLine(editing.clientId, { linkedItemIds: next })
                                }}
                              />
                              <span className="text-[11px] text-blue-900">
                                <span className="line-clamp-2">{o.description}</span>
                                <span className="block text-[10px] text-blue-700/70">
                                  {o.difficultyLabel} · {o.activityTitle} · {o.resultLabel}
                                </span>
                              </span>
                            </label>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              )}

              <div className="rounded-md bg-gray-50 p-2 text-[11px] text-gray-600">
                <p>
                  Esta línea cubre <strong>{editing.slots.length}</strong> lección
                  {editing.slots.length === 1 ? '' : 'es'} este mes.
                </p>
              </div>

              {!readOnly && (
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    onClick={clearSlot}
                    className="rounded-md border border-rose-200 px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-50"
                  >
                    Vaciar lección
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="ml-auto rounded-md bg-gray-900 px-3 py-1.5 text-xs text-white hover:bg-gray-800"
                  >
                    Listo
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  )
}

const DAY_LABELS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
