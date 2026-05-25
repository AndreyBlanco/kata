/**
 * GET /api/teacher/students-with-objectives
 *
 * Lista compacta de estudiantes (sólo activos en el servicio) con sus
 * objetivos derivados activos.  Pensado para el selector de la planificación
 * de acciones — permite vincular líneas del plan a items específicos sin
 * tener que cargar cada perfil individualmente.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthTeacher } from '@/lib/student-access'
import { prisma } from '@/lib/prisma'
import { buildDerivedObjectives } from '@/lib/diagnostic-objectives'

export async function GET(req: NextRequest) {
  const auth = await getAuthTeacher(req)
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const students = await prisma.student.findMany({
    where: { teacherId: auth.teacherId },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      grade: true,
      assessment: { select: { requiresSupport: true } },
    },
  })

  const active = students.filter((s) => s.assessment?.requiresSupport !== false)
  const results = await Promise.all(
    active.map(async (s) => {
      const objectives = await buildDerivedObjectives(s.id)
      return {
        id: s.id,
        name: s.name,
        grade: s.grade,
        objectives: objectives
          .filter((o) => o.isActive)
          .map((o) => ({
            itemId: o.itemId,
            description: o.description,
            difficultyLabel: o.difficultyLabel,
            activityTitle: o.activityTitle,
            result: o.result,
            resultLabel: o.resultLabel,
          })),
      }
    }),
  )

  return NextResponse.json({ students: results })
}
