/**
 * POST   /api/action-plans/[id]/approve   — marca el plan como APROBADO
 * DELETE /api/action-plans/[id]/approve   — reabre el plan a BORRADOR
 *
 * El docente aprueba el plan cuando lo considera listo (P5). Katà no
 * fiscaliza si fue entregado a dirección — al aprobar se asume autorización.
 * Reabrir simplemente cambia el estado: el contenido queda intacto y
 * editable. Al volver a aprobar, se sobrescribe el `approvedAt` anterior.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthTeacher } from '@/lib/student-access'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthTeacher(req)
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const plan = await prisma.actionPlan.findFirst({
    where: { id, teacherId: auth.teacherId },
    select: { id: true, status: true },
  })
  if (!plan) return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })

  const updated = await prisma.actionPlan.update({
    where: { id },
    data: {
      status: 'APROBADO',
      approvedAt: new Date(),
    },
    select: { id: true, status: true, approvedAt: true },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthTeacher(req)
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const plan = await prisma.actionPlan.findFirst({
    where: { id, teacherId: auth.teacherId },
    select: { id: true },
  })
  if (!plan) return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })

  const updated = await prisma.actionPlan.update({
    where: { id },
    data: {
      status: 'BORRADOR',
      // Conservamos approvedAt como referencia histórica (no se borra)
    },
    select: { id: true, status: true, approvedAt: true },
  })
  return NextResponse.json(updated)
}
