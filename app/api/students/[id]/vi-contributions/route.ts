import { NextRequest, NextResponse } from 'next/server'
import { getAuthTeacher, getStudentForTeacher } from '@/lib/student-access'
import {
  buildDiagnosticContributions,
  summarizeForAnalysis,
} from '@/lib/diagnostic-vi-derived'
import type { ViContributionSummary } from '@/lib/vi-contribution-types'

/**
 * GET /api/students/[id]/vi-contributions
 *
 * Devuelve el conjunto consolidado de "aportes Capa 2 → VI" desde todas las
 * fuentes disponibles.  En E′-2 se cargan pruebas diagnósticas; el bus está
 * preparado para añadir observaciones y entrevistas (alimentadas hoy desde
 * `capa2-evidence`) en una sesión futura.
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

  const fromDiagnostic = await buildDiagnosticContributions(studentId)

  const all = [...fromDiagnostic]
  const summary: ViContributionSummary = {
    bySection: {},
    recommendations: [],
    generatedAt: new Date().toISOString(),
  }
  for (const c of all) {
    if (c.category === 'recommendation') {
      summary.recommendations.push(c)
      continue
    }
    // Mapeo se hace en cliente con CONTRIBUTION_TO_VI_SECTION para coherencia;
    // aquí agrupamos directamente por convención simple basada en categoría.
    const sectionKey =
      c.category === 'strength'         ? 'strengths'   :
      c.category === 'barrier'          ? 'barriers'    :
      c.category === 'curricular_to_achieve'
        || c.category === 'curricular_progress'
        || c.category === 'curricular_support' ? 'performance' :
      c.category === 'support'          ? 'supports'    :
      c.category === 'analysis'         ? 'analysis'    : null
    if (!sectionKey) continue
    const bucket = summary.bySection[sectionKey] ?? []
    bucket.push(c)
    summary.bySection[sectionKey] = bucket
  }

  return NextResponse.json({
    contributions: all,
    summary,
    analysisDraft: summarizeForAnalysis(all),
  })
}
