import { NextRequest, NextResponse } from 'next/server'
import { getAuthTeacher, getStudentForTeacher } from '@/lib/student-access'
import { buildDerivedObjectives, detectProgressBetweenAttempts } from '@/lib/diagnostic-objectives'

/**
 * GET /api/students/[id]/objectives
 *
 * Devuelve los objetivos derivados (con preferencias del docente aplicadas)
 * + los avances entre intentos para mostrar histórico.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthTeacher(req)
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id: studentId } = await params
  const student = await getStudentForTeacher(studentId, auth.teacherId)
  if (!student) return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 })

  const [objectives, progress] = await Promise.all([
    buildDerivedObjectives(studentId),
    detectProgressBetweenAttempts(studentId),
  ])

  return NextResponse.json({ objectives, progress })
}
