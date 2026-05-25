/**
 * POST /api/action-plans/[id]/ai-generate
 *
 * Genera el contenido del plan mensual con IA (Sesión F-2).
 *
 *  Body:
 *    {
 *      overwriteExisting?: boolean   // default false; debe ser true si el plan ya tiene líneas
 *    }
 *
 *  Auto-detect del modo:
 *    - Si existe un `InstitutionalDocument` del año del plan → Modo A.
 *    - Si no → genera doc SUPLENTE con IA y procede como A.
 *
 *  Reemplaza atómicamente todas las líneas y slots existentes del plan.
 *
 *  Restricciones:
 *    - El plan no puede estar APROBADO (debe estar BORRADOR).
 *    - Si el plan tiene líneas y `overwriteExisting !== true` → 409 con conteo.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthTeacher } from '@/lib/student-access'
import { prisma } from '@/lib/prisma'
import {
  generateMonthlyPlanDraft,
  ActionPlanGenerationError,
} from '@/lib/action-plan-ai-generator'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthTeacher(req)
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const plan = await prisma.actionPlan.findFirst({
    where: { id, teacherId: auth.teacherId },
    select: {
      id: true,
      status: true,
      _count: { select: { lines: true } },
    },
  })
  if (!plan) return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })
  if (plan.status === 'APROBADO') {
    return NextResponse.json(
      { error: 'El plan está aprobado. Reabrilo como borrador para generarlo con IA.' },
      { status: 409 },
    )
  }

  const body = (await req.json().catch(() => ({}))) as {
    overwriteExisting?: boolean
  }
  const existingLines = plan._count.lines
  if (existingLines > 0 && body.overwriteExisting !== true) {
    return NextResponse.json(
      {
        error: 'CONFIRM_OVERWRITE',
        message: `El plan ya tiene ${existingLines} línea${existingLines === 1 ? '' : 's'}. Repetí la solicitud con overwriteExisting=true para reemplazarlas.`,
        existingLines,
      },
      { status: 409 },
    )
  }

  // Llamar al orquestador
  let outcome
  try {
    outcome = await generateMonthlyPlanDraft({
      teacherId: auth.teacherId,
      planId: id,
    })
  } catch (e) {
    if (e instanceof ActionPlanGenerationError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 422 })
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error generando el plan.' },
      { status: 500 },
    )
  }

  // Persistir en una transacción: borra líneas previas y crea las nuevas con sus slots.
  // Mapeo de asignaciones por tempId.
  const assignmentsByLine = new Map<string, typeof outcome.assignment.assignments>()
  for (const a of outcome.assignment.assignments) {
    const arr = assignmentsByLine.get(a.lineTempId) ?? []
    arr.push(a)
    assignmentsByLine.set(a.lineTempId, arr)
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        await tx.actionPlanLine.deleteMany({ where: { planId: id } })

        for (let i = 0; i < outcome.lines.length; i++) {
          const line = outcome.lines[i]
          const lineAssignments = assignmentsByLine.get(line.tempId) ?? []
          await tx.actionPlanLine.create({
            data: {
              planId: id,
              category: line.category,
              mepProcess: line.mepProcess,
              description: line.description,
              observations: '',
              lessonCount: line.lessonCount,
              studentId: line.studentId,
              linkedItemIds: line.linkedItemIds,
              sortOrder: i,
              aiGenerated: true,
              sourceDocumentId: outcome.sourceDocumentId,
              linkedAnnualActivityId: line.linkedAnnualActivityId,
              slots: {
                create: lineAssignments.map((a) => ({
                  scheduleSlotId: a.scheduleSlotId,
                  weekNumber: a.weekNumber,
                  dayOfWeek: a.dayOfWeek,
                  date: a.date,
                })),
              },
            },
          })
        }

        if (outcome.notes) {
          await tx.actionPlan.update({
            where: { id },
            data: { notes: outcome.notes },
          })
        }
      },
      { timeout: 30000, maxWait: 10000 },
    )
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error persistiendo el plan generado.' },
      { status: 500 },
    )
  }

  const totalAssigned = outcome.assignment.assignments.length
  const totalUnassigned = outcome.assignment.unassigned.reduce(
    (s, u) => s + u.missingCount,
    0,
  )

  return NextResponse.json({
    ok: true,
    mode: outcome.mode,
    sourceDocumentId: outcome.sourceDocumentId,
    suplenteGenerated: outcome.suplenteGenerated,
    linesCreated: outcome.lines.length,
    totalAssigned,
    totalUnassigned,
    perCategory: outcome.assignment.perCategory,
    warnings: outcome.warnings,
    aiProvider: outcome.aiProvider,
    aiModel: outcome.aiModel,
    notes: outcome.notes,
  })
}
