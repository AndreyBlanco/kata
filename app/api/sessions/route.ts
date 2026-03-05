// app/api/sessions/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'

// GET — Listar sesiones con filtros
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.teacherId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const studentId = searchParams.get('studentId')
  const month = searchParams.get('month')
  const pending = searchParams.get('pending') // solo sin registrar

  // Construir filtro
  const where: Record<string, unknown> = {}

  if (studentId) {
    where.studentId = studentId
  } else {
    // Solo sesiones de estudiantes del docente
    const studentIds = await prisma.student.findMany({
      where: { teacherId: token.teacherId },
      select: { id: true },
    })
    where.studentId = { in: studentIds.map((s) => s.id) }
  }

  if (month) {
    where.month = Number(month)
  }

  if (pending === 'true') {
    where.outcome = null
  }

  const sessions = await prisma.generatedSession.findMany({
    where,
    include: {
      student: { select: { name: true, grade: true } },
      supportObjective: { select: { macroArea: true, specificGoal: true } },
    },
    orderBy: [
      { month: 'asc' },
      { weekNumber: 'asc' },
      { createdAt: 'asc' },
    ],
  })

  return NextResponse.json(sessions)
}