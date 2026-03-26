// app/api/catalogs/instruments/route.ts
//
// GET  — Lista instrumentos disponibles para el docente:
//         • todos los "approved" (isCore o aprobados)
//         • los propios con status "pendingApproval" (solo el que los sugirió los ve)
//
// POST — Docente sugiere un instrumento nuevo (status: "pendingApproval")
//         Si el label coincide con uno existente (mismo docente) devuelve 409.

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.teacherId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const teacherId = token.teacherId as string

  const instruments = await prisma.assessmentInstrument.findMany({
    where: {
      active: true,
      OR: [
        { status: 'approved' },
        { status: 'pendingApproval', suggestedBy: teacherId },
      ],
    },
    orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    select: {
      id:          true,
      code:        true,
      label:       true,
      category:    true,
      isCore:      true,
      status:      true,
      suggestedBy: true,
      description: true,
    },
  })

  return NextResponse.json(instruments)
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.teacherId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const teacherId = token.teacherId as string

  const body = await req.json()
  const label = typeof body.label === 'string' ? body.label.trim() : ''
  const category = typeof body.category === 'string' ? body.category.trim() : 'otro'
  const description = typeof body.description === 'string' ? body.description.trim() : undefined

  if (!label) {
    return NextResponse.json({ error: 'El campo "label" es obligatorio' }, { status: 400 })
  }

  // Evitar duplicados del mismo docente
  const existing = await prisma.assessmentInstrument.findFirst({
    where: {
      label:       { equals: label, mode: 'insensitive' },
      suggestedBy: teacherId,
    },
  })
  if (existing) {
    return NextResponse.json(
      { error: 'Ya tienes un instrumento con ese nombre', instrument: existing },
      { status: 409 }
    )
  }

  // También evitar duplicado con instrumentos aprobados (mismo nombre, cualquier docente)
  const approvedDuplicate = await prisma.assessmentInstrument.findFirst({
    where: {
      label:  { equals: label, mode: 'insensitive' },
      status: 'approved',
    },
  })
  if (approvedDuplicate) {
    return NextResponse.json(
      { error: 'Ya existe un instrumento aprobado con ese nombre', instrument: approvedDuplicate },
      { status: 409 }
    )
  }

  // Genera código único para instrumentos personalizados
  const code = `CUSTOM_${Date.now()}_${Math.random().toString(36).slice(2, 7).toUpperCase()}`

  const instrument = await prisma.assessmentInstrument.create({
    data: {
      code,
      label,
      category,
      description: description || null,
      isCore:      false,
      status:      'pendingApproval',
      suggestedBy: teacherId,
      sortOrder:   999,
      active:      true,
    },
  })

  return NextResponse.json(instrument, { status: 201 })
}
