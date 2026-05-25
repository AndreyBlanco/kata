/**
 * lib/action-plan-context.ts
 *
 * Colector de contexto para la generación IA del plan mensual (Sesión F-2).
 *
 * Reúne en un solo lugar todo lo que la IA necesita ver:
 *   - Datos del docente y del plan (mes, año, periodo, modalidad)
 *   - Horario aprobado del periodo (slots con su categoría)
 *   - Cupos por categoría calculados para el mes (semanas × cupo semanal)
 *   - Documento institucional vigente (oficial o suplente) — si existe
 *   - Estudiantes activos con barreras y objetivos derivados activos
 *
 * Pensado para correr en server (Node). Funciones puras donde se puede.
 */

import type {
  ServiceLessonCategory,
  ScheduleBlockType,
  WorkModality,
  AfternoonVariant,
  InstitutionalDocumentStatus,
} from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { buildDerivedObjectives, type DerivedObjective } from '@/lib/diagnostic-objectives'
import {
  weeksInMonth,
  listMonthWeekdays,
  type MonthDay,
} from '@/lib/action-plan-validation'
import { SERVICE_CATEGORIES, getCategory } from '@/lib/schedule-template'
import type { ActionPlanAnnualPayload } from '@/lib/institutional-document-types'

// ─────────────────────────────────────────────────────────────────────────────
// Tipos del contexto
// ─────────────────────────────────────────────────────────────────────────────

export interface ContextScheduleSlot {
  id: string
  dayOfWeek: number               // 1..5
  blockIndex: number              // orden visual del día
  blockType: ScheduleBlockType    // LESSON | RECESS | LUNCH
  startTime: string
  endTime: string
  durationMinutes: number
  category: ServiceLessonCategory | null
  afternoonVariant: AfternoonVariant | null
}

export interface ContextCategoryQuota {
  code: ServiceLessonCategory
  shortLabel: string
  weeklyQuota: number              // cupo Anexo 1 según modalidad
  monthlyQuota: number             // weeklyQuota × weeksInMonth
  weeklySlotsInSchedule: number    // # de slots LESSON con esta categoría en el horario aprobado
  monthlySlotsAvailable: number    // weeklySlotsInSchedule × weeksInMonth
}

export interface ContextStudentObjective {
  itemId: string
  description: string
  difficultyLabel: string
  activityTitle: string
  resultLabel: string
}

export interface ContextStudent {
  id: string
  name: string
  grade: string
  age: number | null
  /** Resumen libre de barreras/apoyos requeridos (de la VI). */
  barriersSummary: string | null
  objectives: ContextStudentObjective[]
}

export interface ContextInstitutionalDocument {
  id: string
  title: string
  schoolYear: number
  aiGenerated: boolean
  aiSummary: string | null
  payload: ActionPlanAnnualPayload
}

export interface ActionPlanGenerationContext {
  teacher: {
    id: string
    name: string
    centerName: string
    specialty: string
    workModality: WorkModality
    activeSchoolPeriod: string | null
  }
  plan: {
    id: string
    schoolPeriod: string
    year: number
    month: number
    monthLabel: string
    weeksInMonth: number
    monthDays: MonthDay[]
  }
  schedule: {
    id: string
    modality: WorkModality
    slots: ContextScheduleSlot[]
    lessonSlotCount: number
  }
  quotas: ContextCategoryQuota[]
  /** Documento institucional vigente para el año del plan (oficial o suplente). */
  institutionalDocument: ContextInstitutionalDocument | null
  students: ContextStudent[]
  /** Total de estudiantes activos. */
  activeStudentCount: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Colector principal
// ─────────────────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

interface CollectArgs {
  teacherId: string
  planId: string
}

interface CollectionMissing {
  reason:
    | 'PLAN_NOT_FOUND'
    | 'SCHEDULE_NOT_FOUND'
    | 'SCHEDULE_NOT_APPROVED'
    | 'NO_ACTIVE_STUDENTS'
  message: string
}

export type CollectResult =
  | { ok: true; context: ActionPlanGenerationContext }
  | { ok: false; error: CollectionMissing }

/**
 * Reúne todo el contexto necesario. Devuelve un error tipificado si falta
 * algún prerequisito (horario aprobado, estudiantes, etc.).
 */
export async function collectActionPlanContext(args: CollectArgs): Promise<CollectResult> {
  const { teacherId, planId } = args

  const plan = await prisma.actionPlan.findFirst({
    where: { id: planId, teacherId },
    select: {
      id: true,
      schoolPeriod: true,
      year: true,
      month: true,
    },
  })
  if (!plan) {
    return {
      ok: false,
      error: { reason: 'PLAN_NOT_FOUND', message: 'Plan mensual no encontrado.' },
    }
  }

  const teacher = await prisma.teacher.findUniqueOrThrow({
    where: { id: teacherId },
    select: {
      id: true,
      name: true,
      centerName: true,
      specialty: true,
      workModality: true,
      activeSchoolPeriod: true,
    },
  })

  // Horario aprobado para el periodo del plan
  const schedule = await prisma.approvedSchedule.findUnique({
    where: { teacherId_schoolPeriod: { teacherId, schoolPeriod: plan.schoolPeriod } },
    include: {
      slots: {
        orderBy: [{ dayOfWeek: 'asc' }, { blockIndex: 'asc' }],
      },
    },
  })
  if (!schedule) {
    return {
      ok: false,
      error: {
        reason: 'SCHEDULE_NOT_FOUND',
        message: `Aún no tenés un horario configurado para el periodo ${plan.schoolPeriod}. Configurálo desde /horario antes de generar el plan.`,
      },
    }
  }
  if (!schedule.approvedAt) {
    return {
      ok: false,
      error: {
        reason: 'SCHEDULE_NOT_APPROVED',
        message: 'Tu horario aún está en borrador. Aprobálo desde /horario antes de generar el plan.',
      },
    }
  }

  const slots: ContextScheduleSlot[] = schedule.slots.map((s) => ({
    id: s.id,
    dayOfWeek: s.dayOfWeek,
    blockIndex: s.blockIndex,
    blockType: s.blockType,
    startTime: s.startTime,
    endTime: s.endTime,
    durationMinutes: s.durationMinutes,
    category: s.category,
    afternoonVariant: s.afternoonVariant,
  }))

  // Cupos mensuales por categoría (en función de la modalidad y de las
  // semanas del mes). También contamos los slots reales del horario para que
  // el assigner tenga una capacidad superior.
  const weeks = weeksInMonth(plan.year, plan.month)
  const monthDays = listMonthWeekdays(plan.year, plan.month)

  const slotsByCategory = new Map<ServiceLessonCategory, number>()
  for (const s of slots) {
    if (s.blockType !== 'LESSON' || !s.category) continue
    slotsByCategory.set(s.category, (slotsByCategory.get(s.category) ?? 0) + 1)
  }

  const quotas: ContextCategoryQuota[] = SERVICE_CATEGORIES.map((def) => {
    const weeklyQuota = def.weeklyLessons[teacher.workModality]
    const monthlyQuota = weeklyQuota * weeks
    const weeklySlotsInSchedule = slotsByCategory.get(def.code) ?? 0
    return {
      code: def.code,
      shortLabel: def.shortLabel,
      weeklyQuota,
      monthlyQuota,
      weeklySlotsInSchedule,
      monthlySlotsAvailable: weeklySlotsInSchedule * weeks,
    }
  })

  // Documento institucional vigente para el año del plan. Preferimos OFICIAL
  // sobre SUPLENTE; si hay varios, el más reciente.
  const docs = await prisma.institutionalDocument.findMany({
    where: {
      teacherId,
      schoolYear: plan.year,
      status: 'PROCESSED' satisfies InstitutionalDocumentStatus,
      type: 'PLAN_ACCION_ANUAL',
    },
    orderBy: [{ aiGenerated: 'asc' }, { processedAt: 'desc' }],
  })
  const institutionalDocument: ContextInstitutionalDocument | null = docs[0] && docs[0].aiPayload
    ? {
        id: docs[0].id,
        title: docs[0].title,
        schoolYear: docs[0].schoolYear,
        aiGenerated: docs[0].aiGenerated,
        aiSummary: docs[0].aiSummary,
        payload: docs[0].aiPayload as unknown as ActionPlanAnnualPayload,
      }
    : null

  // Estudiantes activos + objetivos derivados activos
  const studentRows = await prisma.student.findMany({
    where: { teacherId },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      grade: true,
      birthDate: true,
      assessment: {
        select: {
          requiresSupport: true,
          barriers: true,
          requiredSupports: true,
        },
      },
    },
  })
  const active = studentRows.filter((s) => s.assessment?.requiresSupport !== false)

  const students: ContextStudent[] = await Promise.all(
    active.map(async (s) => {
      const objectives = await buildDerivedObjectives(s.id)
      return {
        id: s.id,
        name: s.name,
        grade: s.grade,
        age: ageFromBirth(s.birthDate),
        barriersSummary: summarizeBarriers(s.assessment),
        objectives: objectives
          .filter((o) => o.isActive)
          .map(toContextObjective),
      }
    }),
  )

  if (students.length === 0) {
    return {
      ok: false,
      error: {
        reason: 'NO_ACTIVE_STUDENTS',
        message:
          'No hay estudiantes activos en tu servicio. Registrá al menos uno con valoración integral antes de generar el plan.',
      },
    }
  }

  const context: ActionPlanGenerationContext = {
    teacher: {
      id: teacher.id,
      name: teacher.name,
      centerName: teacher.centerName,
      specialty: teacher.specialty,
      workModality: teacher.workModality,
      activeSchoolPeriod: teacher.activeSchoolPeriod,
    },
    plan: {
      id: plan.id,
      schoolPeriod: plan.schoolPeriod,
      year: plan.year,
      month: plan.month,
      monthLabel: `${MONTH_NAMES[plan.month]} ${plan.year}`,
      weeksInMonth: weeks,
      monthDays,
    },
    schedule: {
      id: schedule.id,
      modality: schedule.modality,
      slots,
      lessonSlotCount: slots.filter((s) => s.blockType === 'LESSON').length,
    },
    quotas,
    institutionalDocument,
    students,
    activeStudentCount: students.length,
  }

  return { ok: true, context }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function toContextObjective(o: DerivedObjective): ContextStudentObjective {
  return {
    itemId: o.itemId,
    description: o.description,
    difficultyLabel: o.difficultyLabel,
    activityTitle: o.activityTitle,
    resultLabel: o.resultLabel,
  }
}

function ageFromBirth(birthDate: Date | null | undefined): number | null {
  if (!birthDate) return null
  const now = new Date()
  let age = now.getUTCFullYear() - birthDate.getUTCFullYear()
  const monthDiff = now.getUTCMonth() - birthDate.getUTCMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < birthDate.getUTCDate())) age--
  return age >= 0 && age < 120 ? age : null
}

function summarizeBarriers(assessment: {
  barriers: string | null | undefined
  requiredSupports: string | null | undefined
} | null | undefined): string | null {
  if (!assessment) return null
  const parts: string[] = []
  const b = (assessment.barriers ?? '').trim()
  const r = (assessment.requiredSupports ?? '').trim()
  if (b.length > 0) parts.push(`Barreras: ${truncate(b, 240)}`)
  if (r.length > 0) parts.push(`Apoyos requeridos: ${truncate(r, 240)}`)
  return parts.length === 0 ? null : parts.join(' · ')
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max)}…`
}

/**
 * Versión "presentable" del contexto: lo que vamos a meter en el prompt.
 * Pequeña y autocontenida.
 */
export function summarizeContextForPrompt(ctx: ActionPlanGenerationContext): string {
  const lines: string[] = []
  lines.push(`Docente: ${ctx.teacher.name} (${ctx.teacher.specialty})`)
  lines.push(`Centro: ${ctx.teacher.centerName} · Modalidad: ${ctx.teacher.workModality}`)
  lines.push(`Plan mensual: ${ctx.plan.monthLabel} · Periodo ${ctx.plan.schoolPeriod} · ${ctx.plan.weeksInMonth} semanas hábiles`)
  lines.push('')
  lines.push('Cupos por categoría (Anexo 1) para este mes:')
  for (const q of ctx.quotas) {
    lines.push(`  · ${q.code} (${q.shortLabel}): ${q.monthlyQuota} lecciones (${q.weeklyQuota}/sem × ${ctx.plan.weeksInMonth} sem) — slots disponibles en horario: ${q.monthlySlotsAvailable}`)
  }
  lines.push('')
  lines.push(`Estudiantes activos: ${ctx.activeStudentCount}`)
  for (const s of ctx.students) {
    lines.push(`  - ${s.name} (${s.grade}${s.age ? `, ${s.age} años` : ''}) [studentId=${s.id}]`)
    if (s.barriersSummary) lines.push(`      · ${s.barriersSummary}`)
    if (s.objectives.length > 0) {
      lines.push(`      · Objetivos activos (${s.objectives.length}):`)
      for (const o of s.objectives.slice(0, 8)) {
        lines.push(`          - [itemId=${o.itemId}] ${o.description} (${o.difficultyLabel} / ${o.resultLabel})`)
      }
      if (s.objectives.length > 8) {
        lines.push(`          - … y ${s.objectives.length - 8} más`)
      }
    }
  }
  return lines.join('\n')
}

// Re-exports
export { SERVICE_CATEGORIES, getCategory }
