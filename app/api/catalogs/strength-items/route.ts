// app/api/catalogs/strength-items/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/catalogs/strength-items
 *
 * Devuelve los ítems de fortalezas, intereses y recursos para la sección 4
 * de la Valoración Integral y la columna 1 del Plan de Apoyo.
 *
 * Query params opcionales:
 *   ?category=academica        → filtra por categoría
 *   ?coreOnly=true             → solo ítems isCore=true
 *   ?serviceTag=PA             → filtra ítems que incluyan el tag del servicio
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
  const serviceTag = searchParams.get('serviceTag') ?? undefined
  const grouped = searchParams.get('grouped') === 'true'

  const items = await prisma.strengthItem.findMany({
    where: {
      active: true,
      ...(category ? { category } : {}),
      ...(coreOnly ? { isCore: true } : {}),
      ...(serviceTag ? { serviceTags: { has: serviceTag } } : {}),
    },
    select: {
      id: true,
      code: true,
      label: true,
      category: true,
      description: true,
      examples: true,
      serviceTags: true,
      isCore: true,
      sortOrder: true,
    },
    orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
  })

  if (!grouped) {
    return NextResponse.json(items)
  }

  const groupMap = new Map<string, { category: string; items: typeof items }>()
  for (const item of items) {
    if (!groupMap.has(item.category)) {
      groupMap.set(item.category, { category: item.category, items: [] })
    }
    groupMap.get(item.category)!.items.push(item)
  }

  return NextResponse.json(Array.from(groupMap.values()))
}
