import { NextRequest, NextResponse } from 'next/server'
import type { ObservationContext } from '@prisma/client'
import {
  getAuthTeacher,
  getStudentForTeacher,
  parseDateInput,
  resolvePeriodForRequest,
} from '@/lib/student-access'
import { parseDimensionNotes } from '@/lib/capa2-types'
import { prisma } from '@/lib/prisma'

const CONTEXTS = new Set(['AULA', 'SERVICIO_APOYO', 'OTRO'])

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

  const records = await prisma.observationRecord.findMany({
    where: { studentId, schoolPeriod },
    orderBy: { observedAt: 'desc' },
  })

  return NextResponse.json({ schoolPeriod, records })
}

export async function POST(
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
  const context = body.context as ObservationContext
  if (!CONTEXTS.has(context)) {
    return NextResponse.json({ error: 'Contexto de observación inválido' }, { status: 400 })
  }

  const observedAt = parseDateInput(body.observedAt)
  if (!observedAt) {
    return NextResponse.json({ error: 'Fecha de observación requerida' }, { status: 400 })
  }

  const schoolPeriod = await resolvePeriodForRequest(
    auth.teacherId,
    body.schoolPeriod ?? null,
  )

  const record = await prisma.observationRecord.create({
    data: {
      studentId,
      teacherId: auth.teacherId,
      schoolPeriod,
      context,
      subjectOrSpace: body.subjectOrSpace?.trim() || null,
      observedAt,
      dimensionNotes: parseDimensionNotes(body.dimensionNotes),
      generalNotes: String(body.generalNotes ?? '').trim(),
      linkedInstrumentCode: body.linkedInstrumentCode?.trim() || null,
    },
  })

  return NextResponse.json(record, { status: 201 })
}
