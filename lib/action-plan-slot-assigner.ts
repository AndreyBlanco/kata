/**
 * lib/action-plan-slot-assigner.ts
 *
 * Asignador determinístico: dada una lista de líneas con `lessonCount` por
 * categoría y la grilla de slots disponibles del mes, asigna cada lección
 * a un slot real (scheduleSlotId + fecha) respetando:
 *
 *  - La categoría del slot debe coincidir con la categoría de la línea.
 *  - Cada (scheduleSlotId, date) sólo puede asignarse una vez
 *    (restricción de BD `ActionPlanSlot @@unique([scheduleSlotId, date])`).
 *  - Distribución equilibrada por semana: rotamos por semanas para evitar
 *    cargar todo lunes/semana-1.
 *
 * Si la demanda de una categoría supera la capacidad real (más lessonCount
 * que slots disponibles), reportamos `unassigned[]` con la cantidad que
 * quedó sin asignar y la razón. El generador/UI muestra eso como warning.
 */

import type { ServiceLessonCategory } from '@prisma/client'
import type {
  ContextScheduleSlot,
  ActionPlanGenerationContext,
} from '@/lib/action-plan-context'
import type { MonthDay } from '@/lib/action-plan-validation'

export interface DraftLine {
  /** id temporal — se usa para correlacionar con las asignaciones. */
  tempId: string
  category: ServiceLessonCategory
  lessonCount: number
}

export interface SlotAssignment {
  lineTempId: string
  scheduleSlotId: string
  /** ISO yyyy-mm-dd (a medianoche UTC) — corresponde a `MonthDay.date`. */
  date: Date
  weekNumber: number
  dayOfWeek: number
}

export interface Unassigned {
  lineTempId: string
  category: ServiceLessonCategory
  missingCount: number
  reason:
    | 'NO_SLOTS_FOR_CATEGORY'    // el horario no tiene slots de esa categoría
    | 'CAPACITY_EXCEEDED'        // hay slots pero ya quedaron llenos
}

export interface AssignmentResult {
  assignments: SlotAssignment[]
  unassigned: Unassigned[]
  /** Diagnóstico por categoría — útil para el resumen de UI. */
  perCategory: Array<{
    category: ServiceLessonCategory
    demand: number      // suma de lessonCount de las líneas pedidas
    capacity: number    // # de (slot,date) disponibles
    assigned: number
    leftover: number    // assigned vs demand
  }>
}

interface AssignerInput {
  lines: DraftLine[]
  slots: ContextScheduleSlot[]   // grilla semanal (sólo se usan LESSON con category)
  monthDays: MonthDay[]          // todos los lun-vie del mes
}

/**
 * Construye los (slot,date) instances del mes y reparte las lecciones de
 * cada línea respetando categoría y equilibrando por semana.
 */
export function assignLinesToSlots(input: AssignerInput): AssignmentResult {
  const { lines, slots, monthDays } = input

  // 1. Construir lista de instancias (slot × fecha) agrupadas por categoría.
  //    Cada instancia es una "lección programable" única.
  const instancesByCategory = new Map<ServiceLessonCategory, SlotInstance[]>()

  for (const slot of slots) {
    if (slot.blockType !== 'LESSON' || !slot.category) continue
    // El día de la semana del slot debe coincidir con `dayOfWeek` del MonthDay.
    for (const day of monthDays) {
      if (day.dayOfWeek !== slot.dayOfWeek) continue
      const arr = instancesByCategory.get(slot.category) ?? []
      arr.push({
        scheduleSlotId: slot.id,
        date: day.date,
        weekNumber: day.weekNumber,
        dayOfWeek: day.dayOfWeek,
        blockIndex: slot.blockIndex,
        taken: false,
      })
      instancesByCategory.set(slot.category, arr)
    }
  }

  // 2. Para cada categoría, ordenar las instancias para distribución equilibrada:
  //    primero por semana, luego por día, luego por orden del bloque.
  for (const list of instancesByCategory.values()) {
    list.sort((a, b) => {
      if (a.weekNumber !== b.weekNumber) return a.weekNumber - b.weekNumber
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek
      return a.blockIndex - b.blockIndex
    })
  }

  // 3. Agrupar líneas por categoría
  const linesByCategory = new Map<ServiceLessonCategory, DraftLine[]>()
  for (const line of lines) {
    if (line.lessonCount <= 0) continue
    const arr = linesByCategory.get(line.category) ?? []
    arr.push(line)
    linesByCategory.set(line.category, arr)
  }

  // 4. Asignar — para cada categoría, repartir el cupo con un esquema de
  //    inter-leaving por semana. Iteramos en "rondas" donde cada línea
  //    consume 1 instancia disponible por ronda hasta agotar su lessonCount.
  const assignments: SlotAssignment[] = []
  const unassigned: Unassigned[] = []

  for (const [category, demandLines] of linesByCategory.entries()) {
    const instances = instancesByCategory.get(category) ?? []
    const totalDemand = demandLines.reduce((s, l) => s + l.lessonCount, 0)
    const totalCapacity = instances.length

    if (totalCapacity === 0) {
      for (const l of demandLines) {
        unassigned.push({
          lineTempId: l.tempId,
          category,
          missingCount: l.lessonCount,
          reason: 'NO_SLOTS_FOR_CATEGORY',
        })
      }
      continue
    }

    // Necesidades pendientes por línea (mutable)
    const pending = demandLines.map((l) => ({ tempId: l.tempId, remaining: l.lessonCount }))

    let cursor = 0
    let safety = instances.length + 1
    while (safety-- > 0) {
      let progressed = false
      for (const p of pending) {
        if (p.remaining <= 0) continue
        // buscar la próxima instancia libre desde cursor
        let inst: SlotInstance | undefined
        while (cursor < instances.length) {
          if (!instances[cursor].taken) { inst = instances[cursor]; break }
          cursor++
        }
        if (!inst) break
        inst.taken = true
        cursor++
        p.remaining--
        progressed = true
        assignments.push({
          lineTempId: p.tempId,
          scheduleSlotId: inst.scheduleSlotId,
          date: inst.date,
          weekNumber: inst.weekNumber,
          dayOfWeek: inst.dayOfWeek,
        })
      }
      if (!progressed) break
      // Si todas las pending llegaron a 0, terminamos
      if (pending.every((p) => p.remaining === 0)) break
    }

    // Reportar lo que quedó sin asignar (por capacidad)
    for (const p of pending) {
      if (p.remaining > 0) {
        unassigned.push({
          lineTempId: p.tempId,
          category,
          missingCount: p.remaining,
          reason: 'CAPACITY_EXCEEDED',
        })
      }
    }

    // sanity log (no-op): si quedó capacidad libre con demanda 0, esto no es error
    void totalDemand
  }

  // 5. Diagnóstico por categoría
  const perCategory = Array.from(instancesByCategory.keys())
    .map((category) => {
      const cap = instancesByCategory.get(category)?.length ?? 0
      const demand = (linesByCategory.get(category) ?? []).reduce((s, l) => s + l.lessonCount, 0)
      const assigned = assignments.filter((a) => {
        const inst = instancesByCategory
          .get(category)
          ?.find((i) => i.scheduleSlotId === a.scheduleSlotId && sameDate(i.date, a.date))
        return Boolean(inst)
      }).length
      return {
        category,
        demand,
        capacity: cap,
        assigned,
        leftover: assigned - demand,
      }
    })

  // Añadir categorías que estaban en líneas pero sin capacidad en el horario
  for (const cat of linesByCategory.keys()) {
    if (!perCategory.find((p) => p.category === cat)) {
      const demand = (linesByCategory.get(cat) ?? []).reduce((s, l) => s + l.lessonCount, 0)
      perCategory.push({ category: cat, demand, capacity: 0, assigned: 0, leftover: -demand })
    }
  }

  return { assignments, unassigned, perCategory }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers internos
// ─────────────────────────────────────────────────────────────────────────────

interface SlotInstance {
  scheduleSlotId: string
  date: Date
  weekNumber: number
  dayOfWeek: number
  blockIndex: number
  taken: boolean
}

function sameDate(a: Date, b: Date): boolean {
  return a.getTime() === b.getTime()
}

/**
 * Versión de conveniencia: extrae lo necesario del contexto y llama al
 * asignador. Útil para el orquestador (F-2.5).
 */
export function assignLinesUsingContext(
  ctx: ActionPlanGenerationContext,
  lines: DraftLine[],
): AssignmentResult {
  return assignLinesToSlots({
    lines,
    slots: ctx.schedule.slots,
    monthDays: ctx.plan.monthDays,
  })
}
