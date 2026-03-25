// app/api/catalogs/participant-roles/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/catalogs/participant-roles
 *
 * Devuelve todos los roles activos para la sección de participantes
 * de la valoración integral, agrupados por categoría y ordenados
 * por sortOrder.
 *
 * Query params opcionales:
 *   ?category=servicio_apoyo   → filtra por una categoría específica
 *   ?coreOnly=true             → devuelve solo los roles isCore=true
 *   ?grouped=true              → agrupa por categoría en el JSON de respuesta
 */
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.teacherId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category') ?? undefined
  const coreOnly = searchParams.get('coreOnly') === 'true'
  const grouped = searchParams.get('grouped') === 'true'

  const roles = await prisma.participantRole.findMany({
    where: {
      active: true,
      ...(category ? { category } : {}),
      ...(coreOnly ? { isCore: true } : {}),
    },
    select: {
      id: true,
      code: true,
      label: true,
      category: true,
      isCore: true,
      sortOrder: true,
    },
    orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
  })

  if (!grouped) {
    return NextResponse.json(roles)
  }

  // Agrupar por categoría manteniendo el orden de sortOrder del primer item
  const groupMap = new Map<string, { category: string; roles: typeof roles }>()
  for (const role of roles) {
    if (!groupMap.has(role.category)) {
      groupMap.set(role.category, { category: role.category, roles: [] })
    }
    groupMap.get(role.category)!.roles.push(role)
  }

  return NextResponse.json(Array.from(groupMap.values()))
}
