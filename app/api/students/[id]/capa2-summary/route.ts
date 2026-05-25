import { NextRequest, NextResponse } from 'next/server'
import {
  getAuthTeacher,
  getStudentForTeacher,
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

  const [consultation, interviews, observations] = await Promise.all([
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
      },
      orderBy: { observedAt: 'desc' },
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

  return NextResponse.json({
    schoolPeriod,
    expedienteConsultation: consultation,
    interviews,
    observations,
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
