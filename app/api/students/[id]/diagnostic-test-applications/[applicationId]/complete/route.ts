import { NextRequest, NextResponse } from 'next/server'
import { getAuthTeacher, getStudentForTeacher } from '@/lib/student-access'
import { prisma } from '@/lib/prisma'

/**
 * POST   → marca la aplicación como completada (set completedAt).
 * DELETE → reabre la aplicación (set completedAt = null).
 */
export async function POST(
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

  const updated = await prisma.studentDiagnosticTest.update({
    where: { id: applicationId },
    data: { completedAt: new Date(), lastSavedAt: new Date() },
    select: { id: true, completedAt: true, lastSavedAt: true },
  })
  return NextResponse.json(updated)
}

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

  const updated = await prisma.studentDiagnosticTest.update({
    where: { id: applicationId },
    data: { completedAt: null },
    select: { id: true, completedAt: true },
  })
  return NextResponse.json(updated)
}
