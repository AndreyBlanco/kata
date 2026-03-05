// app/api/objectives/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'

// GET — Detalle de un objetivo
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.teacherId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params

  const objective = await prisma.supportObjective.findFirst({
    where: { id, teacherId: token.teacherId },
  })

  if (!objective) {
    return NextResponse.json({ error: 'Objetivo no encontrado' }, { status: 404 })
  }

  return NextResponse.json(objective)
}

// PUT — Editar objetivo
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

  const existing = await prisma.supportObjective.findFirst({
    where: { id, teacherId: token.teacherId },
  })

  if (!existing) {
    return NextResponse.json({ error: 'Objetivo no encontrado' }, { status: 404 })
  }

  const updateData: Record<string, unknown> = {}

  if (body.frequencyPerWeek !== undefined) updateData.frequencyPerWeek = body.frequencyPerWeek
  if (body.duration !== undefined) updateData.duration = body.duration
  if (body.interventionType !== undefined) updateData.interventionType = body.interventionType
  if (body.active !== undefined) updateData.active = body.active
  if (body.linkedProcesses !== undefined) updateData.linkedProcesses = body.linkedProcesses
  if (body.linkedDifficulties !== undefined) updateData.linkedDifficulties = body.linkedDifficulties

  const objective = await prisma.supportObjective.update({
    where: { id },
    data: updateData,
  })

  return NextResponse.json(objective)
}

// DELETE — Eliminar objetivo y sus sesiones
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.teacherId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params

  const existing = await prisma.supportObjective.findFirst({
    where: { id, teacherId: token.teacherId },
  })

  if (!existing) {
    return NextResponse.json({ error: 'Objetivo no encontrado' }, { status: 404 })
  }

  // Eliminar sesiones asociadas primero, luego el objetivo
  await prisma.generatedSession.deleteMany({
    where: { supportObjectiveId: id },
  })

  await prisma.supportObjective.delete({ where: { id } })

  return NextResponse.json({ success: true })
}