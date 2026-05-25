import { NextRequest, NextResponse } from 'next/server'
import type { InterviewFormat, InterviewModality } from '@prisma/client'
import { getAuthTeacher, getStudentForTeacher, parseDateInput } from '@/lib/student-access'
import { parseInterviewContent } from '@/lib/capa2-types'
import { prisma } from '@/lib/prisma'

const CONSENT_REQUIRED = new Set(['FAMILIA', 'ESTUDIANTE'])

async function loadRecord(studentId: string, recordId: string, teacherId: string) {
  const student = await getStudentForTeacher(studentId, teacherId)
  if (!student) return { error: 'Estudiante no encontrado', status: 404 as const }

  const record = await prisma.interviewRecord.findFirst({
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
  const interviewType = body.interviewType ?? result.record.interviewType

  if (CONSENT_REQUIRED.has(interviewType)) {
    const consent =
      body.consentRecorded !== undefined
        ? !!body.consentRecorded
        : result.record.consentRecorded
    if (!consent) {
      return NextResponse.json(
        { error: 'Consentimiento requerido para este tipo de entrevista.' },
        { status: 400 },
      )
    }
  }

  const conductedAt = body.conductedAt
    ? parseDateInput(body.conductedAt)
    : result.record.conductedAt
  if (!conductedAt) {
    return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 })
  }

  const consentRecorded =
    body.consentRecorded !== undefined
      ? !!body.consentRecorded
      : result.record.consentRecorded

  const record = await prisma.interviewRecord.update({
    where: { id: recordId },
    data: {
      format: (body.format as InterviewFormat) ?? result.record.format,
      modality: (body.modality as InterviewModality) ?? result.record.modality,
      conductedAt,
      participantName:
        body.participantName !== undefined
          ? body.participantName?.trim() || null
          : result.record.participantName,
      participantRoleCode:
        body.participantRoleCode !== undefined
          ? body.participantRoleCode?.trim() || null
          : result.record.participantRoleCode,
      content:
        body.content !== undefined
          ? parseInterviewContent(body.content)
          : parseInterviewContent(result.record.content),
      consentRecorded,
      consentRecordedAt: consentRecorded
        ? result.record.consentRecordedAt ?? new Date()
        : null,
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

  await prisma.interviewRecord.delete({ where: { id: recordId } })
  return NextResponse.json({ success: true })
}
