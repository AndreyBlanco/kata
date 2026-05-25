import { NextRequest, NextResponse } from 'next/server'
import {
  getAuthTeacher,
  getStudentForTeacher,
  resolvePeriodForRequest,
} from '@/lib/student-access'
import { prisma } from '@/lib/prisma'
import { INTERVIEW_TYPE_LABELS } from '@/lib/capa2-types'
import { loadInstrumentCatalog } from '@/lib/instruments'
import {
  buildDerivedInstruments,
  buildDerivedParticipants,
  buildViSectionFeeds,
} from '@/lib/vi-capa2-derived'

const OBS_CONTEXT_LABELS: Record<string, string> = {
  AULA: 'Aula',
  INSTITUCIONAL: 'Institucional',
  OTRO: 'Otro',
}

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

  const [consultation, interviews, observations, assessment] = await Promise.all([
    prisma.expedienteConsultation.findUnique({
      where: { studentId_schoolPeriod: { studentId, schoolPeriod } },
    }),
    prisma.interviewRecord.findMany({
      where: { studentId, schoolPeriod },
      select: {
        id: true,
        interviewType: true,
        conductedAt: true,
        appliedToAssessment: true,
        linkedInstrumentCode: true,
        participantRoleCode: true,
      },
      orderBy: { conductedAt: 'desc' },
    }),
    prisma.observationRecord.findMany({
      where: { studentId, schoolPeriod },
      select: {
        id: true,
        context: true,
        observedAt: true,
        dimensionNotes: true,
        appliedToAssessment: true,
        linkedInstrumentCode: true,
      },
      orderBy: { observedAt: 'desc' },
    }),
    prisma.integralAssessment.findUnique({ where: { studentId } }),
  ])

  const hasFamilyInterview = interviews.some((i) => i.interviewType === 'FAMILIA')
  const hasStudentOrTeacherInterview = interviews.some(
    (i) =>
      i.interviewType === 'ESTUDIANTE' ||
      i.interviewType === 'DOCENTE_GRADO' ||
      i.interviewType === 'DOCENTE_GUIA',
  )
  const classroomObservations = observations.filter((o) => o.context === 'AULA')
  const aulaWithDimensions = classroomObservations.filter((o) => {
    const notes = o.dimensionNotes as Record<string, string>
    return Object.values(notes ?? {}).filter((v) => typeof v === 'string' && v.trim()).length >= 3
  })

  const pendingInterviews = interviews.filter((i) => !i.appliedToAssessment).length
  const pendingObservations = observations.filter((o) => !o.appliedToAssessment).length

  const catalog = await loadInstrumentCatalog()
  const participantRoles = await prisma.participantRole.findMany({
    where: { active: true },
    select: { code: true, label: true },
  })
  const roleCodeToLabel = Object.fromEntries(participantRoles.map((r) => [r.code, r.label]))
  const derivedInstruments = buildDerivedInstruments(interviews, observations, catalog)
  const derivedParticipants = buildDerivedParticipants(interviews, roleCodeToLabel)
  const sectionFeeds = buildViSectionFeeds(interviews, observations)

  return NextResponse.json({
    schoolPeriod,
    serviceIntakeType: assessment?.serviceIntakeType ?? null,
    consultation: consultation
      ? {
          id: consultation.id,
          consultedAt: consultation.consultedAt,
          expedienteReviewed: consultation.expedienteReviewed,
          documentsReviewed: consultation.documentsReviewed,
        }
      : null,
    interviews: interviews.map((i) => ({
      ...i,
      label: INTERVIEW_TYPE_LABELS[i.interviewType] ?? i.interviewType,
    })),
    observations: observations.map((o) => ({
      id: o.id,
      context: o.context,
      observedAt: o.observedAt,
      appliedToAssessment: o.appliedToAssessment,
      label: OBS_CONTEXT_LABELS[o.context] ?? o.context,
    })),
    pendingApply: {
      interviews: pendingInterviews,
      observations: pendingObservations,
      total: pendingInterviews + pendingObservations,
    },
    derivedInstruments,
    derivedParticipants,
    sectionFeeds,
    checklist: {
      expedienteReviewed: !!consultation?.expedienteReviewed,
      hasClassroomObservation: aulaWithDimensions.length > 0,
      hasFamilyInterview,
      hasStudentOrTeacherInterview,
      interviewCount: interviews.length,
      observationCount: observations.length,
    },
  })
}
