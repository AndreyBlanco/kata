import { NextRequest, NextResponse } from 'next/server'
import type { InterviewFormat, InterviewModality, InterviewType } from '@prisma/client'
import {
  getAuthTeacher,
  getStudentForTeacher,
  parseDateInput,
  resolvePeriodForRequest,
} from '@/lib/student-access'
import { parseInterviewContent } from '@/lib/capa2-types'
import { prisma } from '@/lib/prisma'

const INTERVIEW_TYPES = new Set([
  'FAMILIA',
  'ESTUDIANTE',
  'DOCENTE_GRADO',
  'DOCENTE_GUIA',
  'OTRO_PROFESIONAL',
])

const CONSENT_REQUIRED = new Set(['FAMILIA', 'ESTUDIANTE'])

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

  const records = await prisma.interviewRecord.findMany({
    where: { studentId, schoolPeriod },
    orderBy: { conductedAt: 'desc' },
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
  const interviewType = body.interviewType as InterviewType
  if (!INTERVIEW_TYPES.has(interviewType)) {
    return NextResponse.json({ error: 'Tipo de entrevista inválido' }, { status: 400 })
  }

  const conductedAt = parseDateInput(body.conductedAt)
  if (!conductedAt) {
    return NextResponse.json({ error: 'Fecha de entrevista requerida' }, { status: 400 })
  }

  if (CONSENT_REQUIRED.has(interviewType) && !body.consentRecorded) {
    return NextResponse.json(
      {
        error:
          'Debe registrar el consentimiento del titular o representante legal (Ley 8968).',
      },
      { status: 400 },
    )
  }

  const schoolPeriod = await resolvePeriodForRequest(
    auth.teacherId,
    body.schoolPeriod ?? null,
  )

  const content = parseInterviewContent(body.content)
  const consentRecorded = !!body.consentRecorded

  const record = await prisma.interviewRecord.create({
    data: {
      studentId,
      teacherId: auth.teacherId,
      schoolPeriod,
      interviewType,
      format: (body.format as InterviewFormat) ?? 'SEMIESTRUCTURADA',
      modality: (body.modality as InterviewModality) ?? 'PRESENCIAL',
      conductedAt,
      participantName: body.participantName?.trim() || null,
      participantRoleCode: body.participantRoleCode?.trim() || null,
      content,
      consentRecorded,
      consentRecordedAt: consentRecorded ? new Date() : null,
      linkedInstrumentCode: body.linkedInstrumentCode?.trim() || null,
    },
  })

  return NextResponse.json(record, { status: 201 })
}
