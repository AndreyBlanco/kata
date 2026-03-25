// app/api/catalogs/support-items/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/catalogs/support-items
 *
 * Devuelve los apoyos educativos requeridos (sección 9 del Informe de
 * Valoración Integral).
 * Fuente: Líneas de Acción MEP 2023, Cuaderno N°4.
 *
 * Query params opcionales:
 *   ?category=metodologico   → filtra por categoría
 *   ?coreOnly=true           → solo ítems isCore=true
 *   ?serviceTag=PA           → filtra por tag de servicio
 *   ?grouped=true            → agrupa por categoría en la respuesta
 */
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.teacherId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const category   = searchParams.get('category')   ?? undefined
  const coreOnly   = searchParams.get('coreOnly')   === 'true'
  const serviceTag = searchParams.get('serviceTag') ?? undefined
  const grouped    = searchParams.get('grouped')    === 'true'

  const items = await prisma.supportItem.findMany({
    where: {
      active: true,
      ...(category    ? { category }                        : {}),
      ...(coreOnly    ? { isCore: true }                    : {}),
      ...(serviceTag  ? { serviceTags: { has: serviceTag } } : {}),
    },
    select: {
      id:          true,
      code:        true,
      label:       true,
      category:    true,
      description: true,
      serviceTags: true,
      isCore:      true,
      sortOrder:   true,
    },
    orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
  })

  if (!grouped) {
    return NextResponse.json(items)
  }

  const byCategory: Record<string, typeof items> = {}
  for (const item of items) {
    if (!byCategory[item.category]) byCategory[item.category] = []
    byCategory[item.category].push(item)
  }
  return NextResponse.json(byCategory)
}
