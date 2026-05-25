import { NextRequest, NextResponse } from 'next/server'
import {
  getAuthTeacher,
  getStudentForTeacher,
  parseDateInput,
  resolvePeriodForRequest,
} from '@/lib/student-access'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthTeacher(req)
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id: studentId } = await params
  const student = await getStudentForTeacher(studentId, auth.teacherId)
  if (!student) {
    return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 })
  }

  const { searchParams } = new URL(req.url)
  const schoolPeriod = await resolvePeriodForRequest(
    auth.teacherId,
    searchParams.get('schoolPeriod'),
  )

  const record = await prisma.expedienteConsultation.findUnique({
    where: { studentId_schoolPeriod: { studentId, schoolPeriod } },
  })

  return NextResponse.json({ schoolPeriod, record })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthTeacher(req)
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id: studentId } = await params
  const student = await getStudentForTeacher(studentId, auth.teacherId)
  if (!student) {
    return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 })
  }

  const body = await req.json()
  const schoolPeriod = await resolvePeriodForRequest(
    auth.teacherId,
    body.schoolPeriod ?? null,
  )

  const consultedAt = parseDateInput(body.consultedAt) ?? new Date()

  const record = await prisma.expedienteConsultation.upsert({
    where: { studentId_schoolPeriod: { studentId, schoolPeriod } },
    create: {
      studentId,
      teacherId: auth.teacherId,
      schoolPeriod,
      consultedAt,
      expedienteReviewed: !!body.expedienteReviewed,
      documentsReviewed: String(body.documentsReviewed ?? '').trim(),
      familyProvidedDocs: String(body.familyProvidedDocs ?? '').trim(),
      notes: String(body.notes ?? '').trim(),
    },
    update: {
      teacherId: auth.teacherId,
      consultedAt,
      expedienteReviewed: !!body.expedienteReviewed,
      documentsReviewed: String(body.documentsReviewed ?? '').trim(),
      familyProvidedDocs: String(body.familyProvidedDocs ?? '').trim(),
      notes: String(body.notes ?? '').trim(),
    },
  })

  return NextResponse.json(record)
}
