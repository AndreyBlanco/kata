// app/api/catalogs/followup-schedules/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/catalogs/followup-schedules
 *
 * Devuelve las opciones de seguimiento para el plan de apoyo y la valoración
 * (sección 11 del Informe de Valoración Integral).
 * Fuente: Cuaderno N°4 MEP 2023, Proceso 3 – Reflexión para la mejora continua.
 *
 * Query params opcionales:
 *   ?type=periodicidad       → filtra por tipo (periodicidad | modalidad | responsable)
 *   ?grouped=true            → agrupa por tipo en la respuesta
 */
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.teacherId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const type    = searchParams.get('type')    ?? undefined
  const grouped = searchParams.get('grouped') === 'true'

  const items = await prisma.followupSchedule.findMany({
    where: {
      active: true,
      ...(type ? { type } : {}),
    },
    select: {
      id:          true,
      code:        true,
      label:       true,
      type:        true,
      description: true,
      sortOrder:   true,
    },
    orderBy: [{ sortOrder: 'asc' }],
  })

  if (!grouped) {
    return NextResponse.json(items)
  }

  const byType: Record<string, typeof items> = {}
  for (const item of items) {
    if (!byType[item.type]) byType[item.type] = []
    byType[item.type].push(item)
  }
  return NextResponse.json(byType)
}
