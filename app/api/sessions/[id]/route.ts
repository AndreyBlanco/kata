// app/api/sessions/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'

// GET — Detalle de sesión
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.teacherId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params

  const session = await prisma.generatedSession.findFirst({
    where: { id },
    include: {
      student: { select: { name: true, grade: true, teacherId: true } },
      supportObjective: { select: { macroArea: true, specificGoal: true } },
    },
  })

  if (!session || session.student.teacherId !== token.teacherId) {
    return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })
  }

  return NextResponse.json(session)
}

// PUT — Registrar/actualizar sesión (SessionLog)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.teacherId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()

  // Verificar que la sesión pertenece al docente
  const existing = await prisma.generatedSession.findFirst({
    where: { id },
    include: { student: { select: { teacherId: true } } },
  })

  if (!existing || existing.student.teacherId !== token.teacherId) {
    return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })
  }

  const {
    executedDate,
    attendance,
    outcome,
    supportLevel,
    observationTags,
    freeText,
  } = body

  const session = await prisma.generatedSession.update({
    where: { id },
    data: {
      executedDate: executedDate ? new Date(executedDate) : null,
      attendance: attendance || null,
      outcome: outcome || null,
      supportLevel: supportLevel || null,
      observationTags: observationTags || [],
      freeText: freeText || null,
    },
  })

  return NextResponse.json(session)
}