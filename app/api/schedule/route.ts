/**
 * GET  /api/schedule?schoolPeriod=2026-I
 *   Devuelve el horario aprobado del docente para el periodo (o el activo).
 *   Si no existe, lo crea automáticamente con la plantilla de jornada única.
 *
 * PUT  /api/schedule
 *   Body: { slots: Array<{ id: string; category: ServiceLessonCategory | null }> }
 *   Actualiza la categoría asignada a slots LESSON. Bloques RECESS/LUNCH no se
 *   pueden modificar (categoría null forzada). El docente puede aprobar el
 *   horario marcando `approve: true` en el body — `approvedAt = now()`.
 */

import { NextRequest, NextResponse } from 'next/server'
import { type ServiceLessonCategory } from '@prisma/client'
import { getAuthTeacher, resolvePeriodForRequest } from '@/lib/student-access'
import { prisma } from '@/lib/prisma'
import {
  buildWeeklyScheduleTemplate,
  SERVICE_CATEGORIES,
} from '@/lib/schedule-template'

const VALID_CATEGORIES = new Set<ServiceLessonCategory>(
  SERVICE_CATEGORIES.map((c) => c.code),
)

// ─────────────────────────────────────────────────────────────────────────────
// GET
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await getAuthTeacher(req)
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const schoolPeriod = await resolvePeriodForRequest(
    auth.teacherId,
    searchParams.get('schoolPeriod'),
  )

  const teacher = await prisma.teacher.findUnique({
    where: { id: auth.teacherId },
    select: { id: true, workModality: true },
  })
  if (!teacher) return NextResponse.json({ error: 'Docente no encontrado' }, { status: 404 })

  // Obtener o crear el horario del periodo
  let schedule = await prisma.approvedSchedule.findUnique({
    where: { teacherId_schoolPeriod: { teacherId: auth.teacherId, schoolPeriod } },
    include: {
      slots: {
        orderBy: [{ dayOfWeek: 'asc' }, { blockIndex: 'asc' }],
      },
    },
  })

  if (!schedule) {
    const template = buildWeeklyScheduleTemplate()
    schedule = await prisma.approvedSchedule.create({
      data: {
        teacherId: auth.teacherId,
        schoolPeriod,
        modality: teacher.workModality,
        slots: {
          create: template.map((s) => ({
            dayOfWeek: s.dayOfWeek,
            blockIndex: s.blockIndex,
            blockType: s.blockType,
            startTime: s.startTime,
            endTime: s.endTime,
            durationMinutes: s.durationMinutes,
            label: s.label,
            afternoonVariant: s.afternoonVariant,
          })),
        },
      },
      include: {
        slots: { orderBy: [{ dayOfWeek: 'asc' }, { blockIndex: 'asc' }] },
      },
    })
  }

  return NextResponse.json({
    id: schedule.id,
    teacherId: schedule.teacherId,
    schoolPeriod: schedule.schoolPeriod,
    modality: schedule.modality,
    approvedAt: schedule.approvedAt,
    notes: schedule.notes,
    slots: schedule.slots.map((s) => ({
      id: s.id,
      dayOfWeek: s.dayOfWeek,
      blockIndex: s.blockIndex,
      blockType: s.blockType,
      startTime: s.startTime,
      endTime: s.endTime,
      durationMinutes: s.durationMinutes,
      label: s.label,
      afternoonVariant: s.afternoonVariant,
      category: s.category,
    })),
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT
// ─────────────────────────────────────────────────────────────────────────────

interface PutBody {
  slots?: Array<{ id: string; category: ServiceLessonCategory | null }>
  approve?: boolean
  notes?: string
}

export async function PUT(req: NextRequest) {
  const auth = await getAuthTeacher(req)
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const schoolPeriod = await resolvePeriodForRequest(
    auth.teacherId,
    searchParams.get('schoolPeriod'),
  )

  const schedule = await prisma.approvedSchedule.findUnique({
    where: { teacherId_schoolPeriod: { teacherId: auth.teacherId, schoolPeriod } },
    include: { slots: true },
  })
  if (!schedule) {
    return NextResponse.json({ error: 'Horario no encontrado' }, { status: 404 })
  }

  const body = (await req.json().catch(() => ({}))) as PutBody

  // Mapa de slots existentes para validar y filtrar
  const slotIds = new Set(schedule.slots.map((s) => s.id))
  const slotById = new Map(schedule.slots.map((s) => [s.id, s]))

  const updates: Array<{ id: string; category: ServiceLessonCategory | null }> = []
  if (Array.isArray(body.slots)) {
    for (const u of body.slots) {
      if (!u || typeof u.id !== 'string' || !slotIds.has(u.id)) continue
      const slot = slotById.get(u.id)!
      if (slot.blockType !== 'LESSON') continue // recreos/almuerzo no editables
      const cat = u.category === null ? null
        : (u.category && VALID_CATEGORIES.has(u.category) ? u.category : undefined)
      if (cat === undefined) continue
      updates.push({ id: u.id, category: cat })
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const u of updates) {
      await tx.scheduleSlot.update({
        where: { id: u.id },
        data: { category: u.category },
      })
    }
    await tx.approvedSchedule.update({
      where: { id: schedule.id },
      data: {
        notes: typeof body.notes === 'string' ? body.notes : undefined,
        approvedAt: body.approve === true
          ? new Date()
          : (body.approve === false ? null : undefined),
      },
    })
  })

  const refreshed = await prisma.approvedSchedule.findUnique({
    where: { id: schedule.id },
    include: { slots: { orderBy: [{ dayOfWeek: 'asc' }, { blockIndex: 'asc' }] } },
  })

  return NextResponse.json({
    id: refreshed!.id,
    schoolPeriod: refreshed!.schoolPeriod,
    modality: refreshed!.modality,
    approvedAt: refreshed!.approvedAt,
    notes: refreshed!.notes,
    slots: refreshed!.slots,
    updated: updates.length,
  })
}
