import { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'
import { inferSchoolPeriodId, isValidSchoolPeriodId, resolveSchoolPeriodId } from '@/lib/school-periods'

export type AuthTeacher = {
  teacherId: string
}

export async function getAuthTeacher(
  req: NextRequest,
): Promise<AuthTeacher | null> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.teacherId || typeof token.teacherId !== 'string') return null
  return { teacherId: token.teacherId }
}

export async function getStudentForTeacher(
  studentId: string,
  teacherId: string,
) {
  return prisma.student.findFirst({
    where: { id: studentId, teacherId },
  })
}

export async function resolvePeriodForRequest(
  teacherId: string,
  queryPeriod?: string | null,
): Promise<string> {
  if (queryPeriod && isValidSchoolPeriodId(queryPeriod)) return queryPeriod
  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: { activeSchoolPeriod: true },
  })
  return resolveSchoolPeriodId(teacher?.activeSchoolPeriod)
}

export function parseDateInput(value: unknown): Date | null {
  if (!value || typeof value !== 'string') return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export { inferSchoolPeriodId }
