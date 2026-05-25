import { NextRequest, NextResponse } from 'next/server'
import { getAuthTeacher, getStudentForTeacher } from '@/lib/student-access'
import { prisma } from '@/lib/prisma'
import { DIAGNOSTIC_ITEM_RESULTS, isDiagnosticItemResult } from '@/lib/diagnostic-test-helpers'
import { Prisma } from '@prisma/client'
import type { DiagnosticItemResult } from '@prisma/client'

/**
 * GET  /api/students/[id]/diagnostic-test-applications/[applicationId]
 * Devuelve la estructura completa de la prueba con datos guardados +
 * borrador (draftPayload) si existe.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; applicationId: string }> },
) {
  const auth = await getAuthTeacher(req)
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id: studentId, applicationId } = await params
  const student = await getStudentForTeacher(studentId, auth.teacherId)
  if (!student) return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 })

  const application = await prisma.studentDiagnosticTest.findFirst({
    where: { id: applicationId, studentId },
    include: {
      test: {
        include: {
          activities: {
            orderBy: { sortOrder: 'asc' },
            include: {
              items:           { orderBy: { sortOrder: 'asc' } },
              recommendations: { orderBy: { sortOrder: 'asc' } },
            },
          },
        },
      },
      itemResults: true,
      activityObservations: true,
      recommendationSelections: true,
    },
  })
  if (!application) return NextResponse.json({ error: 'Aplicación no encontrada' }, { status: 404 })

  return NextResponse.json(application)
}

/**
 * PUT  /api/students/[id]/diagnostic-test-applications/[applicationId]
 * Promueve el contenido del payload (itemResults + observations + recommendationSelections)
 * a las tablas hijas y limpia el borrador. Es el "guardar explícito".
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; applicationId: string }> },
) {
  const auth = await getAuthTeacher(req)
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id: studentId, applicationId } = await params
  const student = await getStudentForTeacher(studentId, auth.teacherId)
  if (!student) return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 })

  const application = await prisma.studentDiagnosticTest.findFirst({
    where: { id: applicationId, studentId },
    select: { id: true, completedAt: true },
  })
  if (!application) return NextResponse.json({ error: 'Aplicación no encontrada' }, { status: 404 })

  type Payload = {
    itemResults?: Record<string, { result: string; notes?: string | null }>
    observations?: Record<string, string>
    recommendationSelections?: Record<string, boolean>
    clearDraft?: boolean
  }
  const body = (await req.json().catch(() => null)) as Payload | null
  if (!body) return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })

  const itemResults = body.itemResults ?? {}
  const observations = body.observations ?? {}
  const recSel = body.recommendationSelections ?? {}

  // Validar items
  const itemIds = Object.keys(itemResults)
  if (itemIds.length) {
    const dbItems = await prisma.diagnosticTestItem.findMany({
      where: { id: { in: itemIds } },
      select: { id: true },
    })
    const dbSet = new Set(dbItems.map((i) => i.id))
    for (const id of itemIds) if (!dbSet.has(id)) {
      return NextResponse.json({ error: `Item desconocido: ${id}` }, { status: 400 })
    }
    for (const id of itemIds) {
      const v = itemResults[id]?.result
      if (!isDiagnosticItemResult(v)) {
        return NextResponse.json(
          { error: `Resultado inválido para item ${id}. Esperado: ${DIAGNOSTIC_ITEM_RESULTS.join(' | ')}` },
          { status: 400 },
        )
      }
    }
  }

  const activityIds = Object.keys(observations)
  if (activityIds.length) {
    const dbActs = await prisma.diagnosticTestActivity.findMany({
      where: { id: { in: activityIds } },
      select: { id: true },
    })
    const set = new Set(dbActs.map((a) => a.id))
    for (const id of activityIds) if (!set.has(id)) {
      return NextResponse.json({ error: `Actividad desconocida: ${id}` }, { status: 400 })
    }
  }

  const recIds = Object.keys(recSel)
  if (recIds.length) {
    const dbRecs = await prisma.diagnosticTestRecommendation.findMany({
      where: { id: { in: recIds } },
      select: { id: true },
    })
    const set = new Set(dbRecs.map((r) => r.id))
    for (const id of recIds) if (!set.has(id)) {
      return NextResponse.json({ error: `Recomendación desconocida: ${id}` }, { status: 400 })
    }
  }

  await prisma.$transaction(
    async (tx) => {
      // Items
      for (const itemId of itemIds) {
        const payload = itemResults[itemId]
        await tx.studentDiagnosticItemResult.upsert({
          where: { studentTestId_itemId: { studentTestId: applicationId, itemId } },
          update: {
            result: payload.result as DiagnosticItemResult,
            notes:  payload.notes ?? null,
            assessedAt: new Date(),
          },
          create: {
            studentTestId: applicationId,
            itemId,
            result: payload.result as DiagnosticItemResult,
            notes:  payload.notes ?? null,
          },
        })
      }

      // Observations
      for (const activityId of activityIds) {
        const text = observations[activityId]?.trim() ?? ''
        if (text) {
          await tx.studentDiagnosticActivityObservation.upsert({
            where: { studentTestId_activityId: { studentTestId: applicationId, activityId } },
            update: { text },
            create: { studentTestId: applicationId, activityId, text },
          })
        } else {
          await tx.studentDiagnosticActivityObservation.deleteMany({
            where: { studentTestId: applicationId, activityId },
          })
        }
      }

      // Recommendation selections
      for (const recommendationId of recIds) {
        if (recSel[recommendationId]) {
          await tx.studentRecommendationSelection.upsert({
            where: {
              studentTestId_recommendationId: { studentTestId: applicationId, recommendationId },
            },
            update: { selected: true },
            create: { studentTestId: applicationId, recommendationId, selected: true },
          })
        } else {
          await tx.studentRecommendationSelection.deleteMany({
            where: { studentTestId: applicationId, recommendationId },
          })
        }
      }

      const update: Prisma.StudentDiagnosticTestUpdateInput = {
        lastSavedAt: new Date(),
      }
      if (body.clearDraft !== false) update.draftPayload = Prisma.DbNull
      await tx.studentDiagnosticTest.update({
        where: { id: applicationId },
        data: update,
      })
    },
    { timeout: 60000, maxWait: 15000 },
  )

  const reload = await prisma.studentDiagnosticTest.findUnique({
    where: { id: applicationId },
    include: { itemResults: true, activityObservations: true, recommendationSelections: true },
  })

  return NextResponse.json(reload)
}

/** DELETE → descarta la aplicación. */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; applicationId: string }> },
) {
  const auth = await getAuthTeacher(req)
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id: studentId, applicationId } = await params
  const student = await getStudentForTeacher(studentId, auth.teacherId)
  if (!student) return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 })

  const app = await prisma.studentDiagnosticTest.findFirst({
    where: { id: applicationId, studentId },
    select: { id: true },
  })
  if (!app) return NextResponse.json({ error: 'Aplicación no encontrada' }, { status: 404 })

  await prisma.studentDiagnosticTest.delete({ where: { id: applicationId } })
  return NextResponse.json({ ok: true })
}
