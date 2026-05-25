'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type ApplicationSummary = {
  applicationId: string
  attemptNumber: number
  startedAt: string
  lastSavedAt: string
  completedAt: string | null
  itemResultsCount: number
}

type TestSummary = {
  testId: string
  difficultyLabel: string
  gradeLabel: string
  activitiesCount: number
  applications: ApplicationSummary[]
  completedCount: number
  hasOpenAttempt: boolean
}

type Props = {
  studentId: string
}

/**
 * Lista compacta de pruebas diagnósticas aplicadas para evidenciar en VI §7.
 * Solo lectura: el docente edita en /estudiantes/[id]/pruebas.
 */
export function ViSectionDiagnosticTests({ studentId }: Props) {
  const [loading, setLoading] = useState(true)
  const [tests, setTests] = useState<TestSummary[]>([])

  useEffect(() => {
    fetch(`/api/students/${studentId}/diagnostic-tests`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.tests) {
          const withAny: TestSummary[] = data.tests.filter(
            (t: TestSummary) => t.applications.length > 0,
          )
          setTests(withAny)
        }
      })
      .finally(() => setLoading(false))
  }, [studentId])

  if (loading) {
    return (
      <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-3 text-xs text-gray-500">
        Cargando pruebas diagnósticas…
      </p>
    )
  }

  if (tests.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-center text-xs text-gray-500">
        <p>No hay pruebas diagnósticas aplicadas todavía.</p>
        <Link
          href={`/estudiantes/${studentId}/pruebas`}
          className="mt-2 inline-block text-blue-600 hover:underline"
        >
          Ir a pruebas diagnósticas →
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-700">Pruebas diagnósticas aplicadas</p>
        <Link
          href={`/estudiantes/${studentId}/pruebas`}
          className="text-xs text-blue-600 hover:underline"
        >
          Editar →
        </Link>
      </div>
      <ul className="space-y-1.5">
        {tests.map((t) => {
          const completed = t.applications.some((a) => !!a.completedAt)
          const open = !completed && t.applications.length > 0
          const tone =
            completed ? 'bg-green-100 text-green-800'
            : open ? 'bg-amber-100 text-amber-800'
            : 'bg-gray-100 text-gray-700'
          const status =
            completed ? `Completada${t.completedCount > 1 ? ` (${t.completedCount}×)` : ''}`
            : open ? 'En proceso'
            : 'Sin aplicar'
          return (
            <li
              key={t.testId}
              className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {t.difficultyLabel}
                  </p>
                  <p className="text-xs text-gray-500">
                    {t.gradeLabel} · {t.applications.length} aplicación{t.applications.length === 1 ? '' : 'es'}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${tone}`}>
                  {status}
                </span>
              </div>
            </li>
          )
        })}
      </ul>
      <p className="text-[11px] text-gray-500">
        Los items marcados <strong>Logrado</strong>, <strong>En proceso</strong> o
        <strong> Presenta dificultad</strong> alimentan automáticamente las secciones 4, 5, 6 y 9
        de esta VI cuando se complete la integración (sesión E′-2).
      </p>
    </div>
  )
}
