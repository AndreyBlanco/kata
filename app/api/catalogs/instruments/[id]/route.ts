// app/api/catalogs/instruments/[id]/route.ts
//
// PATCH — Aprobar o rechazar un instrumento sugerido
//          body: { status: "approved" | "rejected" }
//          Cualquier docente autenticado puede aprobar/rechazar (modelo piloto — sin rol admin).
//
// DELETE — El docente que sugirió el instrumento puede eliminarlo si está pendiente.

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.teacherId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const newStatus = body.status

  if (!['approved', 'rejected'].includes(newStatus)) {
    return NextResponse.json(
      { error: 'status debe ser "approved" o "rejected"' },
      { status: 400 }
    )
  }

  const instrument = await prisma.assessmentInstrument.findUnique({ where: { id } })
  if (!instrument) {
    return NextResponse.json({ error: 'Instrumento no encontrado' }, { status: 404 })
  }
  if (instrument.isCore) {
    return NextResponse.json(
      { error: 'No se pueden modificar los instrumentos del sistema' },
      { status: 403 }
    )
  }
  if (instrument.status !== 'pendingApproval') {
    return NextResponse.json(
      { error: 'Solo se pueden aprobar/rechazar instrumentos en estado pendiente' },
      { status: 400 }
    )
  }

  const updated = await prisma.assessmentInstrument.update({
    where: { id },
    data:  { status: newStatus },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.teacherId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const teacherId = token.teacherId as string

  const { id } = await params
  const instrument = await prisma.assessmentInstrument.findUnique({ where: { id } })

  if (!instrument) {
    return NextResponse.json({ error: 'Instrumento no encontrado' }, { status: 404 })
  }
  if (instrument.isCore) {
    return NextResponse.json(
      { error: 'No se pueden eliminar los instrumentos del sistema' },
      { status: 403 }
    )
  }
  if (instrument.suggestedBy !== teacherId) {
    return NextResponse.json({ error: 'Solo el docente que lo sugirió puede eliminarlo' }, { status: 403 })
  }
  if (instrument.status === 'approved') {
    return NextResponse.json(
      { error: 'No se puede eliminar un instrumento ya aprobado. Contacta al administrador.' },
      { status: 403 }
    )
  }

  await prisma.assessmentInstrument.update({
    where: { id },
    data:  { active: false },
  })

  return NextResponse.json({ ok: true })
}
