// app/api/catalogs/context-dimensions/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/catalogs/context-dimensions
 *
 * Devuelve las dimensiones/indicadores para describir el contexto educativo
 * (sección 3 del Informe de Valoración Integral).
 * Fuente: Líneas de Acción MEP 2023.
 *
 * Query params opcionales:
 *   ?dimension=aula          → filtra por dimensión (aula | institucional | familiar)
 *   ?grouped=true            → agrupa por dimensión en la respuesta
 */
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.teacherId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const dimension = searchParams.get('dimension') ?? undefined
  const grouped   = searchParams.get('grouped')   === 'true'

  const items = await prisma.contextDimension.findMany({
    where: {
      active: true,
      ...(dimension ? { dimension } : {}),
    },
    select: {
      id:          true,
      code:        true,
      label:       true,
      dimension:   true,
      description: true,
      guideText:   true,
      sortOrder:   true,
    },
    orderBy: [{ sortOrder: 'asc' }],
  })

  if (!grouped) {
    return NextResponse.json(items)
  }

  const byDimension: Record<string, typeof items> = {}
  for (const item of items) {
    if (!byDimension[item.dimension]) byDimension[item.dimension] = []
    byDimension[item.dimension].push(item)
  }
  return NextResponse.json(byDimension)
}
