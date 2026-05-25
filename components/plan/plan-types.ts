/**
 * Tipos compartidos por los componentes de planificación mensual.
 */

import type {
  MepProcess,
  ServiceLessonCategory,
  ScheduleBlockType,
  AfternoonVariant,
  ActionPlanStatus,
  WorkModality,
} from '@prisma/client'

export interface PlanSlot {
  id?: string
  scheduleSlotId: string
  weekNumber: number
  dayOfWeek: number
  date: string  // ISO YYYY-MM-DD
  startTime?: string
  endTime?: string
  blockIndex?: number
}

export interface PlanLine {
  id?: string
  /** Temporary client-side id while line not persisted. */
  clientId: string
  category: ServiceLessonCategory
  mepProcess: MepProcess
  description: string
  observations: string
  lessonCount: number
  studentId: string | null
  linkedItemIds: string[]
  sortOrder: number
  slots: PlanSlot[]
  /** True si la línea fue producida por la IA (Sesión F-2). */
  aiGenerated?: boolean
  /** id local de la actividad anual referenciada (para mostrar trazabilidad). */
  linkedAnnualActivityId?: string | null
  /** Id del InstitutionalDocument del que se desprende. */
  sourceDocumentId?: string | null
}

export interface ScheduleSlotInfo {
  id: string
  dayOfWeek: number
  blockIndex: number
  blockType: ScheduleBlockType
  startTime: string
  endTime: string
  durationMinutes: number
  label: string | null
  afternoonVariant: AfternoonVariant | null
  category: ServiceLessonCategory | null
}

export interface WeekdayInfo {
  date: string  // ISO YYYY-MM-DD
  weekNumber: number
  dayOfWeek: number
}

export interface PlanValidationCategory {
  code: ServiceLessonCategory
  label: string
  weeklyQuota: number
  monthlyQuota: number
  lessonsAssigned: number
  remaining: number
  status: 'ok' | 'under' | 'over'
}

export interface PlanValidation {
  modality: WorkModality
  year: number
  month: number
  weeksInMonth: number
  totalWeeklyQuota: number
  totalMonthlyQuota: number
  totalAssigned: number
  categories: PlanValidationCategory[]
  warnings: string[]
}

export interface PlanData {
  id: string
  year: number
  month: number
  label: string
  schoolPeriod: string
  status: ActionPlanStatus
  approvedAt: string | null
  notes: string | null
  modality: WorkModality
  lines: PlanLine[]
  schedule: {
    id: string
    modality: WorkModality
    slots: ScheduleSlotInfo[]
  } | null
  weekdays: WeekdayInfo[]
  validation: PlanValidation
}
