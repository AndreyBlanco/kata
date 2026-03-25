// app/api/assessments/[studentId]/curricular-subjects/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ studentId: string }> }

/**
 * GET /api/assessments/[studentId]/curricular-subjects
 *
 * Devuelve las entradas de desempeño curricular por asignatura (sección 6 del
 * Informe de Valoración Integral 2026).
 */
export async function GET(req: NextRequest, { params }: Params) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.teacherId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { studentId } = await params

  const student = await prisma.student.findFirst({
    where: { id: studentId, teacherId: token.teacherId as string },
    select: { id: true, assessment: { select: { id: true } } },
  })
  if (!student) {
    return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 })
  }
  if (!student.assessment) {
    return NextResponse.json([])
  }

  const entries = await prisma.curricularSubjectEntry.findMany({
    where: { assessmentId: student.assessment.id },
    select: {
      id:             true,
      subject:        true,
      goalsToAchieve: true,
      progress:       true,
      supportNeeds:   true,
      sortOrder:      true,
    },
    orderBy: { sortOrder: 'asc' },
  })

  return NextResponse.json(entries)
}

/**
 * PUT /api/assessments/[studentId]/curricular-subjects
 *
 * Reemplaza la lista completa de entradas curriculares para el estudiante.
 * Si no existe la valoración integral se crea automáticamente.
 *
 * Body: Array de objetos
 * [
 *   { subject, goalsToAchieve, progress, supportNeeds, sortOrder? },
 *   ...
 * ]
 */
export async function PUT(req: NextRequest, { params }: Params) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.teacherId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { studentId } = await params

  const student = await prisma.student.findFirst({
    where: { id: studentId, teacherId: token.teacherId as string },
    select: { id: true, assessment: { select: { id: true } } },
  })
  if (!student) {
    return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  if (!Array.isArray(body)) {
    return NextResponse.json({ error: 'Se esperaba un arreglo de asignaturas' }, { status: 400 })
  }

  type SubjectInput = {
    subject: string
    goalsToAchieve?: string
    progress?: string
    supportNeeds?: string
    sortOrder?: number
  }

  const rows = body as SubjectInput[]
  for (const row of rows) {
    if (!row.subject || typeof row.subject !== 'string') {
      return NextResponse.json({ error: 'Cada entrada debe tener un campo "subject" (texto)' }, { status: 400 })
    }
  }

  // Obtener o crear la valoración integral
  let assessmentId = student.assessment?.id
  if (!assessmentId) {
    const newAssessment = await prisma.integralAssessment.create({
      data: { studentId },
      select: { id: true },
    })
    assessmentId = newAssessment.id
  }

  // Reemplazar todas las entradas existentes en una transacción
  const result = await prisma.$transaction(async (tx) => {
    await tx.curricularSubjectEntry.deleteMany({ where: { assessmentId } })

    const created = await Promise.all(
      rows.map((row, idx) =>
        tx.curricularSubjectEntry.create({
          data: {
            assessmentId,
            subject:        row.subject,
            goalsToAchieve: row.goalsToAchieve ?? '',
            progress:       row.progress       ?? '',
            supportNeeds:   row.supportNeeds   ?? '',
            sortOrder:      row.sortOrder       ?? idx,
          },
          select: {
            id:             true,
            subject:        true,
            goalsToAchieve: true,
            progress:       true,
            supportNeeds:   true,
            sortOrder:      true,
          },
        })
      )
    )

    return created
  })

  return NextResponse.json(result)
}
