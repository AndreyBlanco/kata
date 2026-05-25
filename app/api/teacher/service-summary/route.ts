/**
 * GET /api/teacher/service-summary?schoolPeriod=2026-I
 *
 * Cabecera resumen para `/planificacion` (P9):
 *  - cuántos estudiantes activos en el servicio
 *  - distribución por grado
 *  - distribución por dificultad (de pruebas con al menos un item en
 *    EN_PROCESO o PRESENTA_DIFICULTAD — fuente: pruebas diagnósticas)
 *  - cuántos tienen plan de apoyo / VI iniciada
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthTeacher, resolvePeriodForRequest } from '@/lib/student-access'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const auth = await getAuthTeacher(req)
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const schoolPeriod = await resolvePeriodForRequest(
    auth.teacherId,
    searchParams.get('schoolPeriod'),
  )

  const students = await prisma.student.findMany({
    where: { teacherId: auth.teacherId },
    select: {
      id: true,
      grade: true,
      assessment: { select: { requiresSupport: true, status: true } },
      supportPlan: { select: { id: true } },
    },
  })

  // Estudiantes "activos" en el servicio: requiresSupport != false (incluye null y true).
  const active = students.filter((s) => s.assessment?.requiresSupport !== false)
  const withPlan = active.filter((s) => !!s.supportPlan).length
  const withVi = active.filter((s) => !!s.assessment).length

  // Por grado
  const byGrade = new Map<string, number>()
  for (const s of active) {
    byGrade.set(s.grade, (byGrade.get(s.grade) ?? 0) + 1)
  }

  // Por dificultad — vía pruebas con al menos un item en proceso / con dificultad
  const activeIds = active.map((s) => s.id)
  let byDifficulty: Array<{ difficulty: string; label: string; students: number }> = []
  if (activeIds.length > 0) {
    const results = await prisma.studentDiagnosticItemResult.findMany({
      where: {
        studentTest: { studentId: { in: activeIds } },
        result: { in: ['EN_PROCESO', 'PRESENTA_DIFICULTAD'] },
      },
      select: {
        studentTest: { select: { studentId: true } },
        item: {
          select: {
            activity: {
              select: {
                test: { select: { difficulty: true, difficultyLabel: true } },
              },
            },
          },
        },
      },
    })
    const map = new Map<string, { label: string; students: Set<string> }>()
    for (const r of results) {
      const code = r.item.activity.test.difficulty
      const label = r.item.activity.test.difficultyLabel
      if (!map.has(code)) map.set(code, { label, students: new Set() })
      map.get(code)!.students.add(r.studentTest.studentId)
    }
    byDifficulty = Array.from(map.entries())
      .map(([difficulty, v]) => ({
        difficulty,
        label: v.label,
        students: v.students.size,
      }))
      .sort((a, b) => b.students - a.students)
  }

  return NextResponse.json({
    schoolPeriod,
    activeStudents: active.length,
    totalStudents: students.length,
    withPlan,
    withVi,
    byGrade: Array.from(byGrade.entries())
      .map(([grade, count]) => ({ grade, count }))
      .sort((a, b) => a.grade.localeCompare(b.grade)),
    byDifficulty,
  })
}
