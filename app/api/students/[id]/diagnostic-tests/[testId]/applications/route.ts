import { NextRequest, NextResponse } from 'next/server'
import { getAuthTeacher, getStudentForTeacher, resolvePeriodForRequest } from '@/lib/student-access'
import { prisma } from '@/lib/prisma'

/**
 * GET  → lista de aplicaciones del estudiante para esta prueba (con conteos).
 * POST → crea una nueva aplicación (attemptNumber = max+1).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; testId: string }> },
) {
  const auth = await getAuthTeacher(req)
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id: studentId, testId } = await params
  const student = await getStudentForTeacher(studentId, auth.teacherId)
  if (!student) return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 })

  const test = await prisma.diagnosticTest.findUnique({
    where: { id: testId },
    select: { id: true, code: true, difficultyLabel: true, gradeLabel: true, title: true },
  })
  if (!test) return NextResponse.json({ error: 'Prueba no encontrada' }, { status: 404 })

  const apps = await prisma.studentDiagnosticTest.findMany({
    where: { studentId, testId },
    orderBy: { attemptNumber: 'asc' },
    select: {
      id: true,
      attemptNumber: true,
      startedAt: true,
      lastSavedAt: true,
      completedAt: true,
      schoolPeriod: true,
      _count: { select: { itemResults: true, activityObservations: true } },
    },
  })

  return NextResponse.json({ test, applications: apps })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; testId: string }> },
) {
  const auth = await getAuthTeacher(req)
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id: studentId, testId } = await params
  const student = await getStudentForTeacher(studentId, auth.teacherId)
  if (!student) return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 })

  const test = await prisma.diagnosticTest.findUnique({
    where: { id: testId },
    select: { id: true },
  })
  if (!test) return NextResponse.json({ error: 'Prueba no encontrada' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const schoolPeriod = await resolvePeriodForRequest(
    auth.teacherId,
    searchParams.get('schoolPeriod'),
  )

  const max = await prisma.studentDiagnosticTest.aggregate({
    where: { studentId, testId },
    _max: { attemptNumber: true },
  })
  const next = (max._max.attemptNumber ?? 0) + 1

  const created = await prisma.studentDiagnosticTest.create({
    data: {
      studentId,
      testId,
      attemptNumber: next,
      schoolPeriod,
    },
    select: { id: true, attemptNumber: true },
  })

  return NextResponse.json(created, { status: 201 })
}
