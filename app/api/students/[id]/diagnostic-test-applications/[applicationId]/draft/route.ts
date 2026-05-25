import { NextRequest, NextResponse } from 'next/server'
import { getAuthTeacher, getStudentForTeacher } from '@/lib/student-access'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

/**
 * PATCH /api/students/[id]/diagnostic-test-applications/[applicationId]/draft
 * Autosave del borrador (no promueve a tablas hijas).
 */
export async function PATCH(
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

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
  }

  await prisma.studentDiagnosticTest.update({
    where: { id: applicationId },
    data: { draftPayload: body as Prisma.InputJsonValue },
  })

  return NextResponse.json({ ok: true })
}

/** DELETE → descartar borrador sin tocar las tablas hijas ya guardadas. */
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

  await prisma.studentDiagnosticTest.update({
    where: { id: applicationId },
    data: { draftPayload: Prisma.DbNull },
  })

  return NextResponse.json({ ok: true })
}
