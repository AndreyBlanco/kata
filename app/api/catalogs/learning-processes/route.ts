// app/api/catalogs/learning-processes/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/catalogs/learning-processes
 *
 * Devuelve los procesos implicados en el aprendizaje para la sección 5a
 * de la Valoración Integral (y el Plan de Apoyo).
 *
 * Estructura: 6 procesos principales + 5 subprocesos de Funciones Ejecutivas.
 *
 * Query params opcionales:
 *   ?category=proceso              → solo procesos principales
 *   ?category=funcion_ejecutiva    → solo subprocesos de FE
 *   ?parentCode=PROC_FUNCIONES_EJECUTIVAS → subprocesos de un proceso específico
 *   ?coreOnly=true                 → solo ítems isCore=true
 *   ?serviceTag=PA                 → filtra por tag de servicio
 *   ?withChildren=true             → procesos principales con sus subprocesos anidados
 */
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.teacherId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category') ?? undefined
  const parentCode = searchParams.get('parentCode') ?? undefined
  const coreOnly = searchParams.get('coreOnly') === 'true'
  const serviceTag = searchParams.get('serviceTag') ?? undefined
  const withChildren = searchParams.get('withChildren') === 'true'

  const items = await prisma.learningProcessItem.findMany({
    where: {
      active: true,
      ...(category ? { category } : {}),
      ...(parentCode ? { parentCode } : {}),
      ...(coreOnly ? { isCore: true } : {}),
      ...(serviceTag ? { serviceTags: { has: serviceTag } } : {}),
    },
    select: {
      id: true,
      code: true,
      label: true,
      category: true,
      parentCode: true,
      description: true,
      examples: true,
      serviceTags: true,
      isCore: true,
      sortOrder: true,
    },
    orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
  })

  if (!withChildren) {
    return NextResponse.json(items)
  }

  // Construir árbol: procesos principales con sus subprocesos como children[]
  const mainProcesses = items.filter((i) => i.category === 'proceso')
  const subProcesses = items.filter((i) => i.category === 'funcion_ejecutiva')

  const tree = mainProcesses.map((proc) => ({
    ...proc,
    children: subProcesses.filter((sub) => sub.parentCode === proc.code),
  }))

  return NextResponse.json(tree)
}
