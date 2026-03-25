// app/api/assessments/route.ts
//
// GET — Lista todos los expedientes de valoración del docente autenticado,
//       con datos del estudiante y progreso calculado por sección.
//
// Response: AssessmentSummary[]

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'

function computeProgress(a: {
  elaborationDate:     Date | null
  bsaReceivedDate:     Date | null
  participants:        string[]
  classroomContext:    string
  institutionalContext:string
  familyContext:       string
  strengths:           string
  strengthCodes:       string[]
  barriers:            string
  barrierCodes:        string[]
  _curricularCount:    number
  instruments:         string[]
  integralAnalysis:    string
  requiredSupports:    string
  supportCodes:        string[]
  agreements:          string
  followUp:            string
  followupCodes:       string[]
}): number {
  let count = 0
  if (a.elaborationDate || a.bsaReceivedDate)                         count++ // S1
  if (a.participants.length > 0)                                       count++ // S2
  if (a.classroomContext || a.institutionalContext || a.familyContext)  count++ // S3
  if (a.strengths || a.strengthCodes.length)                           count++ // S4
  if (a.barriers || a.barrierCodes.length)                             count++ // S5
  if (a._curricularCount > 0)                                          count++ // S6
  if (a.instruments.length > 0)                                        count++ // S7
  if (a.integralAnalysis)                                              count++ // S8
  if (a.requiredSupports || a.supportCodes.length)                     count++ // S9
  if (a.agreements)                                                    count++ // S10
  if (a.followUp || a.followupCodes.length)                            count++ // S11
  return count
}

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.teacherId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const assessments = await prisma.integralAssessment.findMany({
    where: {
      student: { teacherId: token.teacherId },
    },
    select: {
      id:               true,
      status:           true,
      requiresSupport:  true,
      elaborationDate:  true,
      bsaReceivedDate:  true,
      participants:     true,
      classroomContext: true,
      institutionalContext: true,
      familyContext:    true,
      strengths:        true,
      strengthCodes:    true,
      barriers:         true,
      barrierCodes:     true,
      instruments:      true,
      integralAnalysis: true,
      requiredSupports: true,
      supportCodes:     true,
      agreements:       true,
      followUp:         true,
      followupCodes:    true,
      updatedAt:        true,
      student: {
        select: { id: true, name: true, grade: true },
      },
      _count: {
        select: { curricularSubjects: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const result = assessments.map((a) => ({
    id:              a.id,
    status:          a.status,
    requiresSupport: a.requiresSupport,
    updatedAt:       a.updatedAt,
    student:         a.student,
    completedSections: computeProgress({
      elaborationDate:      a.elaborationDate,
      bsaReceivedDate:      a.bsaReceivedDate,
      participants:         a.participants,
      classroomContext:     a.classroomContext,
      institutionalContext: a.institutionalContext,
      familyContext:        a.familyContext,
      strengths:            a.strengths,
      strengthCodes:        a.strengthCodes,
      barriers:             a.barriers,
      barrierCodes:         a.barrierCodes,
      _curricularCount:     a._count.curricularSubjects,
      instruments:          a.instruments,
      integralAnalysis:     a.integralAnalysis,
      requiredSupports:     a.requiredSupports,
      supportCodes:         a.supportCodes,
      agreements:           a.agreements,
      followUp:             a.followUp,
      followupCodes:        a.followupCodes,
    }),
    totalSections: 11,
  }))

  return NextResponse.json(result)
}
