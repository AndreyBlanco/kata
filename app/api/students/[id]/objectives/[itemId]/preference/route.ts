import { NextRequest, NextResponse } from 'next/server'
import { getAuthTeacher, getStudentForTeacher } from '@/lib/student-access'
import { prisma } from '@/lib/prisma'
import { defaultActiveForResult } from '@/lib/diagnostic-objectives'

/**
 * PATCH /api/students/[id]/objectives/[itemId]/preference
 *
 * Crea/actualiza la preferencia de activación del objetivo derivado.
 *
 * Body: { isActive?: boolean; priority?: number; notes?: string | null }
 *
 * Si la preferencia coincide con el default (isActive derivado del resultado,
 * priority 0, notes null), se elimina la fila para mantener limpia la tabla.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const auth = await getAuthTeacher(req)
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id: studentId, itemId } = await params
  const student = await getStudentForTeacher(studentId, auth.teacherId)
  if (!student) return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 })

  // Validar que el item exista y que el estudiante tenga al menos un resultado
  // para él (evita activar objetivos sobre items nunca evaluados).
  const item = await prisma.diagnosticTestItem.findUnique({
    where: { id: itemId },
    select: { id: true },
  })
  if (!item) return NextResponse.json({ error: 'Ítem no encontrado' }, { status: 404 })

  const result = await prisma.studentDiagnosticItemResult.findFirst({
    where: { itemId, studentTest: { studentId } },
    orderBy: { assessedAt: 'desc' },
    select: { result: true },
  })
  if (!result) return NextResponse.json({ error: 'Sin resultado para este ítem' }, { status: 400 })

  const body = (await req.json().catch(() => ({}))) as {
    isActive?: boolean
    priority?: number
    notes?: string | null
  }

  const defaultActive = defaultActiveForResult(result.result)
  const isActive = body.isActive ?? defaultActive
  const priority = body.priority ?? 0
  const notes = body.notes ?? null

  const matchesDefault =
    isActive === defaultActive && priority === 0 && (notes === null || notes === '')

  if (matchesDefault) {
    await prisma.studentObjectivePreference.deleteMany({
      where: { studentId, itemId },
    })
    return NextResponse.json({
      itemId,
      isActive: defaultActive,
      priority: 0,
      notes: null,
      isDefaultActive: true,
    })
  }

  const saved = await prisma.studentObjectivePreference.upsert({
    where: { studentId_itemId: { studentId, itemId } },
    update: { isActive, priority, notes },
    create: { studentId, itemId, isActive, priority, notes },
  })
  return NextResponse.json({
    itemId,
    isActive: saved.isActive,
    priority: saved.priority,
    notes: saved.notes,
    isDefaultActive: false,
  })
}
