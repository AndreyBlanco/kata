import { NextRequest, NextResponse } from 'next/server'
import { getAuthTeacher } from '@/lib/student-access'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/diagnostic-tests/[testId]
 * Devuelve la estructura completa de la prueba (actividades, items, recomendaciones).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ testId: string }> },
) {
  const auth = await getAuthTeacher(req)
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { testId } = await params

  const test = await prisma.diagnosticTest.findUnique({
    where: { id: testId },
    include: {
      activities: {
        orderBy: { sortOrder: 'asc' },
        include: {
          items:           { orderBy: { sortOrder: 'asc' } },
          recommendations: { orderBy: { sortOrder: 'asc' } },
        },
      },
    },
  })
  if (!test) return NextResponse.json({ error: 'Prueba no encontrada' }, { status: 404 })

  return NextResponse.json(test)
}
