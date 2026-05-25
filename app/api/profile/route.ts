// app/api/profile/route.ts
// GET  — devuelve el perfil del docente autenticado
// PATCH — actualiza name, centerName, circuit, specialty

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { type WorkModality } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { isValidSchoolPeriodId } from '@/lib/school-periods'

const PROFILE_SELECT = {
  id:         true,
  name:       true,
  email:      true,
  centerName: true,
  circuit:    true,
  specialty:  true,
  activeSchoolPeriod: true,
  workModality: true,
  createdAt:  true,
} as const

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.teacherId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const teacher = await prisma.teacher.findUnique({
    where: { id: token.teacherId as string },
    select: PROFILE_SELECT,
  })

  if (!teacher) {
    return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
  }

  return NextResponse.json(teacher)
}

const VALID_MODALITIES: WorkModality[] = ['FIJO', 'ITINERANTE']

export async function PATCH(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.teacherId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const { name, centerName, circuit, specialty, activeSchoolPeriod, workModality } = body

  const patch: Record<string, string | WorkModality> = {}

  if (typeof name === 'string' && name.trim()) {
    patch.name = name.trim()
  }
  if (typeof centerName === 'string' && centerName.trim()) {
    patch.centerName = centerName.trim()
  }
  if (typeof circuit === 'string' && circuit.trim()) {
    patch.circuit = circuit.trim()
  }
  if (typeof specialty === 'string' && specialty.trim()) {
    patch.specialty = specialty.trim()
  }
  if (typeof activeSchoolPeriod === 'string' && isValidSchoolPeriodId(activeSchoolPeriod)) {
    patch.activeSchoolPeriod = activeSchoolPeriod
  }
  if (typeof workModality === 'string' && VALID_MODALITIES.includes(workModality as WorkModality)) {
    patch.workModality = workModality as WorkModality
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: 'Se requiere al menos un campo para actualizar' },
      { status: 400 }
    )
  }

  const teacher = await prisma.teacher.update({
    where: { id: token.teacherId as string },
    data: patch,
    select: PROFILE_SELECT,
  })

  return NextResponse.json(teacher)
}
