/**
 * Periodos lectivos MEP — configuración mantenida por el equipo de desarrollo (SDLC).
 *
 * Actualizar cada año cuando el MEP publique el calendario escolar:
 * - Noticia: https://www.mep.go.cr/noticias/mep-presenta-calendario-escolar-YYYY
 * - Calendario digital: https://calendario.mep.go.cr/YYYY
 *
 * 2026 (dos periodos): I periodo 23 feb – 3 jul; II periodo 20 jul – 9 dic.
 * @see https://www.mep.go.cr/noticias/mep-presenta-calendario-escolar-2026
 */

export type SchoolPeriodDefinition = {
  /** Identificador estable, ej. "2026-I" */
  id: string
  label: string
  shortLabel: string
  schoolYear: number
  periodNumber: 1 | 2
  /** Meses calendario (1–12) para sesiones e informe en esta fase */
  months: number[]
  /** Texto de referencia (no se parsea en runtime) */
  dateRangeLabel: string
}

/** Año lectivo activo en el piloto */
export const ACTIVE_SCHOOL_YEAR = 2026

export const SCHOOL_PERIOD_SOURCE_URL = 'https://calendario.mep.go.cr/2026'

export const SCHOOL_PERIODS: SchoolPeriodDefinition[] = [
  {
    id: '2026-I',
    label: 'I Periodo lectivo 2026',
    shortLabel: 'I Periodo 2026',
    schoolYear: 2026,
    periodNumber: 1,
    months: [2, 3, 4, 5, 6, 7],
    dateRangeLabel: '23 feb – 3 jul 2026',
  },
  {
    id: '2026-II',
    label: 'II Periodo lectivo 2026',
    shortLabel: 'II Periodo 2026',
    schoolYear: 2026,
    periodNumber: 2,
    months: [7, 8, 9, 10, 11, 12],
    dateRangeLabel: '20 jul – 9 dic 2026',
  },
]

const MONTH_NAMES = [
  '',
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

export function getSchoolPeriod(id: string): SchoolPeriodDefinition | undefined {
  return SCHOOL_PERIODS.find((p) => p.id === id)
}

export function isValidSchoolPeriodId(id: string): boolean {
  return SCHOOL_PERIODS.some((p) => p.id === id)
}

/** Periodo sugerido según la fecha actual y el calendario configurado. */
export function inferSchoolPeriodId(date = new Date()): string {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  if (year < ACTIVE_SCHOOL_YEAR) return SCHOOL_PERIODS[0].id
  if (year > ACTIVE_SCHOOL_YEAR) {
    return SCHOOL_PERIODS[SCHOOL_PERIODS.length - 1].id
  }

  // 2026: II periodo desde 20 jul; I periodo antes
  if (month > 7 || (month === 7 && day >= 20)) return '2026-II'
  if (month === 7 && day < 20) return '2026-I'
  if (month >= 2) return '2026-I'
  return '2026-I'
}

export function resolveSchoolPeriodId(stored: string | null | undefined): string {
  if (stored && isValidSchoolPeriodId(stored)) return stored
  return inferSchoolPeriodId()
}

export function monthsLabel(months: number[]): string {
  return months.map((m) => MONTH_NAMES[m]).join(', ')
}

export { MONTH_NAMES }
