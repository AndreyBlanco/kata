import { NextRequest, NextResponse } from 'next/server'
import type { ObservationContext } from '@prisma/client'
import { getAuthTeacher, getStudentForTeacher, parseDateInput } from '@/lib/student-access'
import { parseDimensionNotes } from '@/lib/capa2-types'
import { prisma } from '@/lib/prisma'

async function loadRecord(studentId: string, recordId: string, teacherId: string) {
  const student = await getStudentForTeacher(studentId, teacherId)
  if (!student) return { error: 'Estudiante no encontrado', status: 404 as const }

  const record = await prisma.observationRecord.findFirst({
    where: { id: recordId, studentId },
  })
  if (!record) return { error: 'Registro no encontrado', status: 404 as const }
  return { record }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; recordId: string }> },
) {
  const auth = await getAuthTeacher(req)
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id: studentId, recordId } = await params
  const result = await loadRecord(studentId, recordId, auth.teacherId)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json(result.record)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; recordId: string }> },
) {
  const auth = await getAuthTeacher(req)
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id: studentId, recordId } = await params
  const result = await loadRecord(studentId, recordId, auth.teacherId)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  const body = await req.json()
  const observedAt = body.observedAt
    ? parseDateInput(body.observedAt)
    : result.record.observedAt
  if (!observedAt) {
    return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 })
  }

  const record = await prisma.observationRecord.update({
    where: { id: recordId },
    data: {
      context: (body.context as ObservationContext) ?? result.record.context,
      subjectOrSpace:
        body.subjectOrSpace !== undefined
          ? body.subjectOrSpace?.trim() || null
          : result.record.subjectOrSpace,
      observedAt,
      dimensionNotes:
        body.dimensionNotes !== undefined
          ? parseDimensionNotes(body.dimensionNotes)
          : parseDimensionNotes(result.record.dimensionNotes),
      generalNotes:
        body.generalNotes !== undefined
          ? String(body.generalNotes).trim()
          : result.record.generalNotes,
      linkedInstrumentCode:
        body.linkedInstrumentCode !== undefined
          ? body.linkedInstrumentCode?.trim() || null
          : result.record.linkedInstrumentCode,
      appliedToAssessment:
        body.appliedToAssessment !== undefined
          ? !!body.appliedToAssessment
          : result.record.appliedToAssessment,
    },
  })

  return NextResponse.json(record)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; recordId: string }> },
) {
  const auth = await getAuthTeacher(req)
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id: studentId, recordId } = await params
  const result = await loadRecord(studentId, recordId, auth.teacherId)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  await prisma.observationRecord.delete({ where: { id: recordId } })
  return NextResponse.json({ success: true })
}
