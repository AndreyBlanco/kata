// GET — Lista operativa del servicio PA (estudiantes + estado de servicio)

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'
import {
  deriveServiceStatus,
  matchesServiceFilter,
  parseServiceFilter,
  SERVICE_STATUS_LABELS,
  type ServiceFilter,
} from '@/lib/service-status'

function computeViProgress(a: {
  elaborationDate: Date | null
  bsaReceivedDate: Date | null
  participants: string[]
  classroomContext: string
  institutionalContext: string
  familyContext: string
  strengths: string
  strengthCodes: string[]
  barriers: string
  barrierCodes: string[]
  _curricularCount: number
  instruments: string[]
  integralAnalysis: string
  requiredSupports: string
  supportCodes: string[]
  agreements: string
  followUp: string
  followupCodes: string[]
}): { completed: number; total: number } {
  let count = 0
  if (a.elaborationDate || a.bsaReceivedDate) count++
  if (a.participants.length > 0) count++
  if (a.classroomContext || a.institutionalContext || a.familyContext) count++
  if (a.strengths || a.strengthCodes.length) count++
  if (a.barriers || a.barrierCodes.length) count++
  if (a._curricularCount > 0) count++
  if (a.instruments.length > 0) count++
  if (a.integralAnalysis) count++
  if (a.requiredSupports || a.supportCodes.length) count++
  if (a.agreements) count++
  if (a.followUp || a.followupCodes.length) count++
  return { completed: count, total: 11 }
}

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.teacherId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const filter = parseServiceFilter(req.nextUrl.searchParams.get('filter'))

  const students = await prisma.student.findMany({
    where: { teacherId: token.teacherId },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      grade: true,
      birthDate: true,
      assessment: {
        select: {
          id: true,
          status: true,
          requiresSupport: true,
          bsaReceivedDate: true,
          elaborationDate: true,
          participants: true,
          classroomContext: true,
          institutionalContext: true,
          familyContext: true,
          strengths: true,
          strengthCodes: true,
          barriers: true,
          barrierCodes: true,
          instruments: true,
          integralAnalysis: true,
          requiredSupports: true,
          supportCodes: true,
          agreements: true,
          followUp: true,
          followupCodes: true,
          updatedAt: true,
          _count: { select: { curricularSubjects: true } },
        },
      },
    },
  })

  const rows = students
    .map((s) => {
      const a = s.assessment
      const serviceStatus = deriveServiceStatus(a)
      const viProgress = a
        ? computeViProgress({
            elaborationDate: a.elaborationDate,
            bsaReceivedDate: a.bsaReceivedDate,
            participants: a.participants,
            classroomContext: a.classroomContext,
            institutionalContext: a.institutionalContext,
            familyContext: a.familyContext,
            strengths: a.strengths,
            strengthCodes: a.strengthCodes,
            barriers: a.barriers,
            barrierCodes: a.barrierCodes,
            _curricularCount: a._count.curricularSubjects,
            instruments: a.instruments,
            integralAnalysis: a.integralAnalysis,
            requiredSupports: a.requiredSupports,
            supportCodes: a.supportCodes,
            agreements: a.agreements,
            followUp: a.followUp,
            followupCodes: a.followupCodes,
          })
        : { completed: 0, total: 11 }

      return {
        id: s.id,
        name: s.name,
        grade: s.grade,
        birthDate: s.birthDate,
        requiresSupport: a?.requiresSupport ?? null,
        assessmentStatus: a?.status ?? null,
        bsaReceived: !!a?.bsaReceivedDate,
        bsaReceivedDate: a?.bsaReceivedDate ?? null,
        serviceStatus,
        serviceStatusLabel: SERVICE_STATUS_LABELS[serviceStatus],
        viProgress,
        updatedAt: a?.updatedAt ?? s.birthDate,
      }
    })
    .filter((row) =>
      matchesServiceFilter(
        filter,
        row.assessmentStatus
          ? {
              status: row.assessmentStatus,
              requiresSupport: row.requiresSupport,
              bsaReceivedDate: row.bsaReceivedDate,
            }
          : null,
      ),
    )

  const counts = countByFilter(students.map((s) => s.assessment))

  return NextResponse.json({
    filter,
    counts,
    students: rows,
  })
}

function countByFilter(
  assessments: ({
    status: string
    requiresSupport: boolean | null
    bsaReceivedDate: Date | null
  } | null)[],
) {
  const filters: ServiceFilter[] = ['en_servicio', 'todos', 'valoracion', 'pendientes']
  const result: Record<ServiceFilter, number> = {
    en_servicio: 0,
    todos: 0,
    valoracion: 0,
    pendientes: 0,
  }

  for (const f of filters) {
    result[f] = assessments.filter((a) => {
      return matchesServiceFilter(f, a)
    }).length
  }

  return result
}
