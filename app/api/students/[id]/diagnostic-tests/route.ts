import { NextRequest, NextResponse } from 'next/server'
import { getAuthTeacher, getStudentForTeacher } from '@/lib/student-access'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/students/[id]/diagnostic-tests
 *
 * Devuelve el catálogo de pruebas disponibles para el grado del estudiante,
 * con resumen de aplicaciones realizadas y estado (sin aplicar / en proceso / completada).
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

  const grade = normalizeGrade(student.grade)

  const tests = await prisma.diagnosticTest.findMany({
    where: { active: true, ...(grade ? { grade } : {}) },
    select: {
      id: true,
      code: true,
      difficulty: true,
      difficultyLabel: true,
      grade: true,
      gradeLabel: true,
      title: true,
      sortOrder: true,
      _count: { select: { activities: true } },
    },
    orderBy: { sortOrder: 'asc' },
  })

  const applications = await prisma.studentDiagnosticTest.findMany({
    where: { studentId },
    select: {
      id: true,
      testId: true,
      attemptNumber: true,
      startedAt: true,
      lastSavedAt: true,
      completedAt: true,
      _count: { select: { itemResults: true } },
    },
    orderBy: [{ testId: 'asc' }, { attemptNumber: 'asc' }],
  })

  const byTest = new Map<string, typeof applications>()
  for (const app of applications) {
    if (!byTest.has(app.testId)) byTest.set(app.testId, [] as typeof applications)
    byTest.get(app.testId)!.push(app)
  }

  const items = tests.map((t) => {
    const apps = byTest.get(t.id) ?? []
    const completed = apps.filter((a) => a.completedAt).length
    const open = apps.filter((a) => !a.completedAt)
    return {
      testId:          t.id,
      code:            t.code,
      difficulty:      t.difficulty,
      difficultyLabel: t.difficultyLabel,
      grade:           t.grade,
      gradeLabel:      t.gradeLabel,
      title:           t.title,
      sortOrder:       t.sortOrder,
      activitiesCount: t._count.activities,
      applications: apps.map((a) => ({
        applicationId: a.id,
        attemptNumber: a.attemptNumber,
        startedAt:     a.startedAt,
        lastSavedAt:   a.lastSavedAt,
        completedAt:   a.completedAt,
        itemResultsCount: a._count.itemResults,
      })),
      completedCount: completed,
      hasOpenAttempt: open.length > 0,
    }
  })

  return NextResponse.json({
    studentGrade: grade,
    tests: items,
  })
}

/**
 * Normaliza el campo `grade` del Student al código usado en DiagnosticTest ("1"…"6").
 */
function normalizeGrade(grade: string): string | null {
  if (!grade) return null
  const trimmed = grade.trim()
  const direct = trimmed.match(/^[1-6]$/)
  if (direct) return trimmed
  const prefix = trimmed.match(/^([1-6])/)
  if (prefix) return prefix[1]
  const lower = trimmed.toLowerCase()
  const map: Record<string, string> = {
    'primero':      '1',
    'primer':       '1',
    'primer grado': '1',
    'segundo':      '2',
    'tercero':      '3',
    'tercer':       '3',
    'cuarto':       '4',
    'quinto':       '5',
    'sexto':        '6',
  }
  for (const k of Object.keys(map)) {
    if (lower.includes(k)) return map[k]
  }
  return null
}
