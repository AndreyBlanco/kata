/**
 * GET    /api/action-plans/[id]
 *   Devuelve el plan con líneas, slots, validación y referencia al horario.
 *
 * PATCH  /api/action-plans/[id]
 *   Reemplaza la lista de líneas y sus slots (autosave/persistencia explícita).
 *   Bloqueado si status = APROBADO (debe reabrirse primero).
 *
 * DELETE /api/action-plans/[id]
 *   Borra el plan completo (sólo si está en BORRADOR).
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  type ServiceLessonCategory,
  type MepProcess,
} from '@prisma/client'
import { getAuthTeacher, resolvePeriodForRequest } from '@/lib/student-access'
import { prisma } from '@/lib/prisma'
import {
  validateMonthlyPlan,
  listMonthWeekdays,
  monthLabel,
} from '@/lib/action-plan-validation'

// ─────────────────────────────────────────────────────────────────────────────
// GET
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthTeacher(req)
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const plan = await prisma.actionPlan.findFirst({
    where: { id, teacherId: auth.teacherId },
    include: {
      lines: {
        orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
        include: {
          slots: {
            orderBy: [{ date: 'asc' }],
            include: { scheduleSlot: true },
          },
        },
      },
    },
  })
  if (!plan) return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })

  // Horario del periodo (para vista calendario)
  const schedule = await prisma.approvedSchedule.findUnique({
    where: {
      teacherId_schoolPeriod: {
        teacherId: auth.teacherId,
        schoolPeriod: plan.schoolPeriod,
      },
    },
    include: {
      slots: { orderBy: [{ dayOfWeek: 'asc' }, { blockIndex: 'asc' }] },
    },
  })

  // Validación de cupos
  const assignments = plan.lines.map((l) => ({
    category: l.category,
    lessonsAssigned: l.slots.length,
  }))
  const modality = schedule?.modality ?? 'FIJO'
  const validation = validateMonthlyPlan({
    modality,
    year: plan.year,
    month: plan.month,
    assignments,
  })

  // Fechas del mes (lun-vie)
  const weekdays = listMonthWeekdays(plan.year, plan.month)

  return NextResponse.json({
    id: plan.id,
    year: plan.year,
    month: plan.month,
    label: monthLabel(plan.month, plan.year),
    schoolPeriod: plan.schoolPeriod,
    status: plan.status,
    approvedAt: plan.approvedAt,
    notes: plan.notes,
    modality,
    lines: plan.lines.map((l) => ({
      id: l.id,
      category: l.category,
      mepProcess: l.mepProcess,
      description: l.description,
      observations: l.observations,
      lessonCount: l.lessonCount,
      studentId: l.studentId,
      linkedItemIds: l.linkedItemIds,
      sortOrder: l.sortOrder,
      aiGenerated: l.aiGenerated,
      sourceDocumentId: l.sourceDocumentId,
      linkedAnnualActivityId: l.linkedAnnualActivityId,
      slots: l.slots.map((s) => ({
        id: s.id,
        scheduleSlotId: s.scheduleSlotId,
        weekNumber: s.weekNumber,
        dayOfWeek: s.dayOfWeek,
        date: s.date.toISOString(),
        startTime: s.scheduleSlot.startTime,
        endTime: s.scheduleSlot.endTime,
        blockIndex: s.scheduleSlot.blockIndex,
      })),
    })),
    schedule: schedule
      ? {
          id: schedule.id,
          modality: schedule.modality,
          slots: schedule.slots,
        }
      : null,
    weekdays: weekdays.map((d) => ({
      date: d.date.toISOString(),
      weekNumber: d.weekNumber,
      dayOfWeek: d.dayOfWeek,
    })),
    validation,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH — reemplaza líneas+slots
// ─────────────────────────────────────────────────────────────────────────────

interface LineInput {
  id?: string
  category: ServiceLessonCategory
  mepProcess?: MepProcess
  description?: string
  observations?: string
  lessonCount?: number
  studentId?: string | null
  linkedItemIds?: string[]
  sortOrder?: number
  aiGenerated?: boolean
  sourceDocumentId?: string | null
  linkedAnnualActivityId?: string | null
  slots?: Array<{
    scheduleSlotId: string
    weekNumber: number
    dayOfWeek: number
    date: string  // ISO
  }>
}

interface PatchBody {
  lines?: LineInput[]
  notes?: string
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthTeacher(req)
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const plan = await prisma.actionPlan.findFirst({
    where: { id, teacherId: auth.teacherId },
    select: { id: true, status: true, schoolPeriod: true, year: true, month: true },
  })
  if (!plan) return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })
  if (plan.status === 'APROBADO') {
    return NextResponse.json(
      { error: 'El plan está aprobado. Reábrelo como borrador para editarlo.' },
      { status: 409 },
    )
  }

  const body = (await req.json().catch(() => ({}))) as PatchBody

  // Validar fechas: deben ser días hábiles del mes
  const validDates = new Set(
    listMonthWeekdays(plan.year, plan.month).map((d) => d.date.toISOString().slice(0, 10)),
  )

  // Validar scheduleSlotIds: deben pertenecer al horario del periodo
  const schedule = await prisma.approvedSchedule.findUnique({
    where: {
      teacherId_schoolPeriod: {
        teacherId: auth.teacherId,
        schoolPeriod: plan.schoolPeriod,
      },
    },
    include: { slots: { select: { id: true, blockType: true } } },
  })
  if (!schedule) {
    return NextResponse.json(
      { error: 'Falta horario base del periodo. Configúralo en /horario antes de planificar.' },
      { status: 400 },
    )
  }
  const lessonSlotIds = new Set(
    schedule.slots.filter((s) => s.blockType === 'LESSON').map((s) => s.id),
  )

  const linesIn = Array.isArray(body.lines) ? body.lines : []
  const errors: string[] = []

  // Saneamiento previo: filtra slots inválidos por línea
  const sanitizedLines = linesIn.map((l, idx) => {
    const slots = (l.slots ?? []).filter((s) => {
      const dateOk = typeof s.date === 'string' && validDates.has(s.date.slice(0, 10))
      const slotOk = lessonSlotIds.has(s.scheduleSlotId)
      const dowOk = Number.isInteger(s.dayOfWeek) && s.dayOfWeek >= 1 && s.dayOfWeek <= 5
      const wkOk = Number.isInteger(s.weekNumber) && s.weekNumber >= 1 && s.weekNumber <= 6
      return dateOk && slotOk && dowOk && wkOk
    })
    return {
      idx,
      category: l.category,
      mepProcess: l.mepProcess ?? 'IMPLEMENTACION',
      description: (l.description ?? '').trim(),
      observations: (l.observations ?? '').trim(),
      lessonCount: Number.isInteger(l.lessonCount) ? Number(l.lessonCount) : slots.length,
      studentId: l.studentId ?? null,
      linkedItemIds: Array.isArray(l.linkedItemIds) ? l.linkedItemIds.filter((x) => typeof x === 'string') : [],
      sortOrder: Number.isInteger(l.sortOrder) ? Number(l.sortOrder) : idx,
      aiGenerated: Boolean(l.aiGenerated),
      sourceDocumentId: l.sourceDocumentId ?? null,
      linkedAnnualActivityId: l.linkedAnnualActivityId ?? null,
      slots: slots.map((s) => ({
        scheduleSlotId: s.scheduleSlotId,
        weekNumber: s.weekNumber,
        dayOfWeek: s.dayOfWeek,
        date: new Date(s.date),
      })),
    }
  })

  // Detectar colisiones (slot+fecha duplicada entre líneas)
  const seen = new Set<string>()
  for (const l of sanitizedLines) {
    for (const s of l.slots) {
      const key = `${s.scheduleSlotId}::${s.date.toISOString().slice(0, 10)}`
      if (seen.has(key)) {
        errors.push(`Slot duplicado detectado (categoría ${l.category}, fecha ${s.date.toISOString().slice(0, 10)})`)
      }
      seen.add(key)
    }
  }
  if (errors.length > 0) {
    return NextResponse.json({ error: 'Conflictos detectados', details: errors }, { status: 400 })
  }

  // Reemplazo atómico: borra líneas viejas y crea nuevas
  await prisma.$transaction(
    async (tx) => {
      await tx.actionPlanLine.deleteMany({ where: { planId: id } })
      for (const l of sanitizedLines) {
        await tx.actionPlanLine.create({
          data: {
            planId: id,
            category: l.category,
            mepProcess: l.mepProcess,
            description: l.description,
            observations: l.observations,
            lessonCount: l.lessonCount,
            studentId: l.studentId,
            linkedItemIds: l.linkedItemIds,
            sortOrder: l.sortOrder,
            aiGenerated: l.aiGenerated,
            sourceDocumentId: l.sourceDocumentId,
            linkedAnnualActivityId: l.linkedAnnualActivityId,
            slots: {
              create: l.slots.map((s) => ({
                scheduleSlotId: s.scheduleSlotId,
                weekNumber: s.weekNumber,
                dayOfWeek: s.dayOfWeek,
                date: s.date,
              })),
            },
          },
        })
      }
      if (typeof body.notes === 'string') {
        await tx.actionPlan.update({
          where: { id },
          data: { notes: body.notes },
        })
      }
    },
    { timeout: 30000, maxWait: 10000 },
  )

  return NextResponse.json({ ok: true, linesSaved: sanitizedLines.length })
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthTeacher(req)
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const plan = await prisma.actionPlan.findFirst({
    where: { id, teacherId: auth.teacherId },
    select: { id: true, status: true },
  })
  if (!plan) return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })
  if (plan.status === 'APROBADO') {
    return NextResponse.json(
      { error: 'No se puede borrar un plan aprobado. Reábrelo como borrador primero.' },
      { status: 409 },
    )
  }
  await prisma.actionPlan.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
