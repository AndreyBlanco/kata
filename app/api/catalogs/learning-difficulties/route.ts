// app/api/catalogs/learning-difficulties/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/catalogs/learning-difficulties
 *
 * Devuelve el catálogo de dificultades específicas del aprendizaje para
 * la sección 5b de la Valoración Integral y el Plan de Apoyo.
 *
 * Reemplaza progresivamente al array estático DIFFICULTIES_CATALOG en lib/catalogs.ts.
 *
 * Query params opcionales:
 *   ?category=especifica        → solo dificultades específicas del aprendizaje
 *   ?category=proceso_implicado → solo dificultades en procesos (futuro)
 *   ?coreOnly=true              → solo ítems isCore=true
 *   ?serviceTag=PA              → filtra por tag de servicio
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

  const items = await prisma.specificLearningDifficulty.findMany({
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

  return NextResponse.json(items)
}
