/**
 * lib/action-plan-validation.ts
 *
 * Funciones puras para validar:
 *  1. Que la suma de lecciones de un plan por categoría respete el cupo
 *     semanal Anexo 1 (cuadros 1 y 2) multiplicado por las semanas del mes.
 *  2. Que el mes elegido pertenezca al periodo lectivo activo (no se permite
 *     planificar fuera del periodo).
 *  3. Que dos líneas no reclamen el mismo slot+fecha (lo refuerza la BD con
 *     @@unique en ActionPlanSlot).
 *
 * No toca BD ni Next.js — sólo lógica pura para reutilizar en API + UI.
 */

import type { ServiceLessonCategory, WorkModality } from '@prisma/client'
import { SERVICE_CATEGORIES, getCategory } from '@/lib/schedule-template'
import { getSchoolPeriod } from '@/lib/school-periods'

// ─────────────────────────────────────────────────────────────────────────────
// Cupos
// ─────────────────────────────────────────────────────────────────────────────

export interface CategoryQuota {
  code: ServiceLessonCategory          // nombre del enum (compat UI)
  label: string                        // etiqueta corta para mostrar
  weeklyQuota: number
  monthlyQuota: number                 // semanas hábiles × weeklyQuota
  lessonsAssigned: number              // suma de ActionPlanSlot por línea de esta categoría
  remaining: number                    // monthlyQuota - lessonsAssigned (puede ser negativo)
  status: 'ok' | 'under' | 'over'
}

export interface MonthlyValidation {
  modality: WorkModality
  year: number
  month: number
  weeksInMonth: number
  totalWeeklyQuota: number
  totalMonthlyQuota: number
  totalAssigned: number
  categories: CategoryQuota[]
  warnings: string[]
  isValid: boolean
}

/**
 * Devuelve las semanas hábiles (lunes–viernes que tienen al menos un día)
 * dentro de un mes calendario. Para v1 simplificamos: contamos el número
 * de semanas ISO que tocan el mes y restringimos a 4–5.
 */
export function weeksInMonth(year: number, month: number): number {
  // month: 1..12
  const firstDay = new Date(Date.UTC(year, month - 1, 1))
  const lastDay = new Date(Date.UTC(year, month, 0))
  // Encontrar el lunes de la semana del primer día
  const firstDow = firstDay.getUTCDay() // 0=dom..6=sáb
  const offsetToMonday = firstDow === 0 ? -6 : 1 - firstDow
  const startMonday = new Date(firstDay)
  startMonday.setUTCDate(firstDay.getUTCDate() + offsetToMonday)

  let weeks = 0
  let cursor = new Date(startMonday)
  while (cursor <= lastDay) {
    weeks++
    cursor.setUTCDate(cursor.getUTCDate() + 7)
  }
  return weeks
}

/**
 * Lista las fechas hábiles (lun-vie) del mes calendario.
 * Útil para que la UI pinte la grilla y que el seed de slots sepa qué fechas
 * existen.
 */
export interface MonthDay {
  date: Date           // a medianoche UTC
  weekNumber: number   // 1..N (semana del mes según el primer lunes que toca)
  dayOfWeek: number    // 1..5 (lunes..viernes)
}

export function listMonthWeekdays(year: number, month: number): MonthDay[] {
  const days: MonthDay[] = []
  const firstDay = new Date(Date.UTC(year, month - 1, 1))
  const lastDay = new Date(Date.UTC(year, month, 0))

  const firstDow = firstDay.getUTCDay() // 0=dom..6=sáb
  const offsetToMonday = firstDow === 0 ? -6 : 1 - firstDow
  const startMonday = new Date(firstDay)
  startMonday.setUTCDate(firstDay.getUTCDate() + offsetToMonday)

  let weekNumber = 0
  let cursor = new Date(startMonday)
  while (cursor <= lastDay) {
    weekNumber++
    for (let i = 0; i < 5; i++) {
      const d = new Date(cursor)
      d.setUTCDate(cursor.getUTCDate() + i)
      if (d.getUTCMonth() === month - 1 && d >= firstDay && d <= lastDay) {
        days.push({
          date: d,
          weekNumber,
          dayOfWeek: i + 1,
        })
      }
    }
    cursor.setUTCDate(cursor.getUTCDate() + 7)
  }
  return days
}

// ─────────────────────────────────────────────────────────────────────────────
// Validación de mes contra periodo lectivo
// ─────────────────────────────────────────────────────────────────────────────

export interface MonthInPeriodResult {
  valid: boolean
  reason?: string
}

export function isMonthInSchoolPeriod(
  schoolPeriod: string,
  year: number,
  month: number,
): MonthInPeriodResult {
  const period = getSchoolPeriod(schoolPeriod)
  if (!period) {
    return { valid: false, reason: `Periodo lectivo ${schoolPeriod} no encontrado.` }
  }
  if (year !== period.schoolYear) {
    return { valid: false, reason: `El año ${year} no corresponde al periodo ${period.label}.` }
  }
  if (!period.months.includes(month)) {
    return {
      valid: false,
      reason: `El mes ${month} no está dentro de los meses del ${period.label} (${period.months.join(', ')}).`,
    }
  }
  return { valid: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// Validación de cupos por categoría
// ─────────────────────────────────────────────────────────────────────────────

export interface AssignedLessonCount {
  category: ServiceLessonCategory
  lessonsAssigned: number  // # de ActionPlanSlot atados a líneas de esta categoría
}

export function validateMonthlyPlan(params: {
  modality: WorkModality
  year: number
  month: number
  assignments: AssignedLessonCount[]
}): MonthlyValidation {
  const { modality, year, month, assignments } = params
  const weeks = weeksInMonth(year, month)

  const assignedByCat = new Map<ServiceLessonCategory, number>()
  for (const a of assignments) {
    assignedByCat.set(a.category, (assignedByCat.get(a.category) ?? 0) + a.lessonsAssigned)
  }

  const categories: CategoryQuota[] = SERVICE_CATEGORIES.map((def) => {
    const weeklyQuota = def.weeklyLessons[modality]
    const monthlyQuota = weeklyQuota * weeks
    const lessonsAssigned = assignedByCat.get(def.code) ?? 0
    const remaining = monthlyQuota - lessonsAssigned
    const status: CategoryQuota['status'] =
      lessonsAssigned === monthlyQuota ? 'ok'
      : lessonsAssigned < monthlyQuota ? 'under'
      : 'over'
    return {
      code: def.code,
      label: def.shortLabel,
      weeklyQuota,
      monthlyQuota,
      lessonsAssigned,
      remaining,
      status,
    }
  })

  const totalWeeklyQuota = categories.reduce((s, c) => s + c.weeklyQuota, 0)
  const totalMonthlyQuota = categories.reduce((s, c) => s + c.monthlyQuota, 0)
  const totalAssigned = categories.reduce((s, c) => s + c.lessonsAssigned, 0)

  const warnings: string[] = []
  for (const c of categories) {
    if (c.status === 'over') {
      warnings.push(`${c.label}: ${c.lessonsAssigned}/${c.monthlyQuota} (excede en ${c.lessonsAssigned - c.monthlyQuota}).`)
    }
  }

  return {
    modality,
    year,
    month,
    weeksInMonth: weeks,
    totalWeeklyQuota,
    totalMonthlyQuota,
    totalAssigned,
    categories,
    warnings,
    isValid: warnings.length === 0,
  }
}

/**
 * Helper de etiqueta para los meses del periodo (UI selector).
 */
export function listMonthOptionsForPeriod(schoolPeriod: string): Array<{ year: number; month: number; label: string }> {
  const period = getSchoolPeriod(schoolPeriod)
  if (!period) return []
  return period.months.map((m) => ({
    year: period.schoolYear,
    month: m,
    label: monthLabel(m, period.schoolYear),
  }))
}

const MONTH_NAMES = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export function monthLabel(month: number, year: number): string {
  return `${MONTH_NAMES[month]} ${year}`
}

// Helper para componentes UI — devuelve solo las clases Tailwind del badge
// (el contenido del badge lo decide el componente).
export function categoryStatusBadge(status: CategoryQuota['status']): string {
  switch (status) {
    case 'ok':    return 'bg-emerald-100 text-emerald-800'
    case 'under': return 'bg-amber-100 text-amber-800'
    case 'over':  return 'bg-rose-100 text-rose-800'
  }
}

// Re-exports utilitarios
export { SERVICE_CATEGORIES, getCategory }
