import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'
import {
  countCapa2Complete,
  countViSectionsComplete,
  isValidServiceIntakeType,
  type ViFieldSnapshot,
} from '@/lib/vi-completeness'
import { resolvePeriodForRequest } from '@/lib/student-access'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.teacherId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { studentId } = await params

  const student = await prisma.student.findFirst({
    where: { id: studentId, teacherId: token.teacherId },
  })
  if (!student) {
    return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 })
  }

  const schoolPeriod = await resolvePeriodForRequest(token.teacherId as string, null)

  const [assessment, capa2Data] = await Promise.all([
    prisma.integralAssessment.findUnique({ where: { studentId } }),
    loadCapa2Checklist(studentId, schoolPeriod),
  ])

  const curricularCount = assessment
    ? await prisma.curricularSubjectEntry.count({ where: { assessmentId: assessment.id } })
    : 0

  const intakeType =
    assessment?.serviceIntakeType && isValidServiceIntakeType(assessment.serviceIntakeType)
      ? assessment.serviceIntakeType
      : null

  const fields: ViFieldSnapshot = {
    bsaReceivedDate: assessment?.bsaReceivedDate?.toISOString().split('T')[0],
    participants: assessment?.participants,
    classroomContext: assessment?.classroomContext,
    institutionalContext: assessment?.institutionalContext,
    familyContext: assessment?.familyContext,
    strengths: assessment?.strengths,
    strengthCodes: assessment?.strengthCodes,
    barriers: assessment?.barriers,
    barrierCodes: assessment?.barrierCodes,
    curricularSubjectCount: curricularCount,
    instruments: assessment?.instruments,
    integralAnalysis: assessment?.integralAnalysis,
    requiredSupports: assessment?.requiredSupports,
    supportCodes: assessment?.supportCodes,
    agreements: assessment?.agreements,
    followUp: assessment?.followUp,
    followupCodes: assessment?.followupCodes,
  }

  const viSectionsComplete = countViSectionsComplete(fields)
  const capa2Complete = countCapa2Complete(capa2Data.checklist, intakeType)

  return NextResponse.json({
    serviceIntakeType: intakeType,
    vi: { sectionsComplete: viSectionsComplete, totalSections: 11 },
    capa2: capa2Complete,
    checklist: capa2Data.checklist,
  })
}

async function loadCapa2Checklist(studentId: string, schoolPeriod: string) {
  const [consultation, interviews, observations] = await Promise.all([
    prisma.expedienteConsultation.findUnique({
      where: { studentId_schoolPeriod: { studentId, schoolPeriod } },
    }),
    prisma.interviewRecord.findMany({
      where: { studentId, schoolPeriod },
      select: { interviewType: true },
    }),
    prisma.observationRecord.findMany({
      where: { studentId, schoolPeriod },
      select: { context: true, dimensionNotes: true },
    }),
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

  return {
    schoolPeriod,
    checklist: {
      expedienteReviewed: !!consultation?.expedienteReviewed,
      hasClassroomObservation: aulaWithDimensions.length > 0,
      hasFamilyInterview,
      hasStudentOrTeacherInterview,
      interviewCount: interviews.length,
      observationCount: observations.length,
    },
  }
}
