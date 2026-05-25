/**
 * lib/schedule-template.ts
 *
 * Plantilla del horario semanal de referencia y catálogo de categorías
 * Anexo 1 (Líneas de Acción 2023, cuadros 1 y 2).
 *
 * Piloto Katà v1 — jornada única con tiempos exactos tomados del archivo
 * `miscelaneos/Horario` (Servicio de Apoyo Fijo). La tarde sólo modela
 * «Semana A»; «Semana B» queda como deuda técnica.
 *
 * Documentado en `plan-trabajo-maestro.md` § Deuda técnica horarios.
 */

import type {
  ScheduleBlockType,
  ServiceLessonCategory,
  WorkModality,
  AfternoonVariant,
} from '@prisma/client'

// ─────────────────────────────────────────────────────────────────────────────
// Categorías Anexo 1
// ─────────────────────────────────────────────────────────────────────────────

export interface ServiceCategoryDefinition {
  code: ServiceLessonCategory
  label: string
  shortLabel: string
  description: string
  /** Cantidad de lecciones por modalidad — Anexo 1 cuadros 1 y 2. */
  weeklyLessons: Record<WorkModality, number>
  /** Color tailwind para la grilla. */
  color: string
}

export const SERVICE_CATEGORIES: ServiceCategoryDefinition[] = [
  {
    code:      'AULA_REGULAR',
    label:     'Acompañamiento en contexto de aula',
    shortLabel:'Aula regular',
    description:
      'Acompañamiento al proceso de aprendizaje del estudiantado que recibe el apoyo personal con su grupo y docentes a cargo.',
    weeklyLessons: { FIJO: 24, ITINERANTE: 20 },
    color: 'bg-sky-100 text-sky-900 border-sky-200',
  },
  {
    code:      'OTROS_ESPACIOS',
    label:     'Apoyo personalizado en otros espacios',
    shortLabel:'Otros espacios',
    description:
      'Acompañamiento al proceso de aprendizaje en otros espacios, de forma grupal o personalizada.',
    weeklyLessons: { FIJO: 8, ITINERANTE: 14 },
    color: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  },
  {
    code:      'ARTICULACION',
    label:     'Articulación con otros servicios de apoyo',
    shortLabel:'Articulación',
    description:
      'Articulación de acciones con los otros servicios de apoyo educativo del centro educativo.',
    weeklyLessons: { FIJO: 2, ITINERANTE: 2 },
    color: 'bg-violet-100 text-violet-900 border-violet-200',
  },
  {
    code:      'COMUNIDAD_EDUCATIVA',
    label:     'Acciones a la comunidad educativa',
    shortLabel:'Comunidad',
    description:
      'Ejecución de acciones destinadas a la comunidad educativa.',
    weeklyLessons: { FIJO: 2, ITINERANTE: 3 },
    color: 'bg-amber-100 text-amber-900 border-amber-200',
  },
  {
    code:      'FAMILIAS',
    label:     'Acciones a las familias',
    shortLabel:'Familias',
    description:
      'Ejecución de acciones destinadas específicamente a las familias.',
    weeklyLessons: { FIJO: 2, ITINERANTE: 3 },
    color: 'bg-pink-100 text-pink-900 border-pink-200',
  },
  {
    code:      'SERVICIO_PROPIAS',
    label:     'Acciones propias del servicio',
    shortLabel:'Servicio',
    description:
      'Realización de acciones propias del servicio de apoyo educativo en educación especial.',
    weeklyLessons: { FIJO: 2, ITINERANTE: 2 },
    color: 'bg-slate-100 text-slate-900 border-slate-200',
  },
]

const CATEGORY_BY_CODE = new Map(SERVICE_CATEGORIES.map((c) => [c.code, c]))

export function getCategory(code: ServiceLessonCategory): ServiceCategoryDefinition {
  const found = CATEGORY_BY_CODE.get(code)
  if (!found) throw new Error(`Categoría desconocida: ${code}`)
  return found
}

export function totalWeeklyLessons(modality: WorkModality): number {
  return SERVICE_CATEGORIES.reduce((sum, c) => sum + c.weeklyLessons[modality], 0)
}

// ─────────────────────────────────────────────────────────────────────────────
// Plantilla de jornada
// ─────────────────────────────────────────────────────────────────────────────

export interface ScheduleSlotTemplate {
  dayOfWeek: number          // 1..5 (lunes..viernes)
  blockIndex: number         // orden visual dentro del día
  blockType: ScheduleBlockType
  startTime: string          // 'HH:mm'
  endTime: string            // 'HH:mm'
  durationMinutes: number
  label?: string             // p. ej. «Receso», «Almuerzo»
  afternoonVariant?: AfternoonVariant
}

const TIMES_MORNING: Array<{ start: string; end: string; type: ScheduleBlockType; label?: string }> = [
  { start: '07:00', end: '07:40', type: 'LESSON' },               // Lección 1
  { start: '07:40', end: '08:20', type: 'LESSON' },               // Lección 2
  { start: '08:20', end: '08:30', type: 'RECESS', label: 'Receso 10 min' },
  { start: '08:30', end: '09:10', type: 'LESSON' },               // Lección 3
  { start: '09:10', end: '09:50', type: 'LESSON' },               // Lección 4
  { start: '09:50', end: '10:10', type: 'RECESS', label: 'Receso 20 min' },
  { start: '10:10', end: '10:50', type: 'LESSON' },               // Lección 5
  { start: '10:50', end: '11:30', type: 'LESSON' },               // Lección 6
  { start: '11:30', end: '12:10', type: 'LUNCH', label: 'Almuerzo' },
]

const TIMES_AFTERNOON: Array<{ start: string; end: string; type: ScheduleBlockType; label?: string }> = [
  { start: '12:10', end: '12:50', type: 'LESSON' },               // Lección 7
  { start: '12:50', end: '13:30', type: 'LESSON' },               // Lección 8
  { start: '13:30', end: '13:40', type: 'RECESS', label: 'Receso 10 min' },
  { start: '13:40', end: '14:20', type: 'LESSON' },               // Lección 9
  { start: '14:20', end: '15:00', type: 'LESSON' },               // Lección 10 (40 min lectivos)
]

function minutesBetween(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return (eh * 60 + em) - (sh * 60 + sm)
}

/**
 * Genera la grilla semanal completa (5 días × N bloques) con tiempos exactos
 * y placeholders sin categoría asignada. El docente luego elige la categoría
 * por cada lección desde la UI `/horario`.
 *
 * `afternoonVariant = 'A'` para todo el piloto.
 */
export function buildWeeklyScheduleTemplate(): ScheduleSlotTemplate[] {
  const out: ScheduleSlotTemplate[] = []

  for (let day = 1; day <= 5; day++) {
    let blockIndex = 0

    for (const t of TIMES_MORNING) {
      blockIndex++
      out.push({
        dayOfWeek: day,
        blockIndex,
        blockType: t.type,
        startTime: t.start,
        endTime: t.end,
        durationMinutes: minutesBetween(t.start, t.end),
        label: t.label,
        afternoonVariant: null as unknown as AfternoonVariant | undefined,
      })
    }

    for (const t of TIMES_AFTERNOON) {
      blockIndex++
      out.push({
        dayOfWeek: day,
        blockIndex,
        blockType: t.type,
        startTime: t.start,
        endTime: t.end,
        durationMinutes: minutesBetween(t.start, t.end),
        label: t.label,
        afternoonVariant: 'A',
      })
    }
  }

  // limpia nulls del campo opcional
  return out.map((s) => ({
    ...s,
    afternoonVariant: s.afternoonVariant ?? undefined,
  }))
}

/** Cuántos slots LESSON contiene la plantilla (debe coincidir con el cupo de la modalidad). */
export function templateLessonCount(): number {
  const tpl = buildWeeklyScheduleTemplate()
  return tpl.filter((s) => s.blockType === 'LESSON').length
}
