'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PageHeader } from '@/components/ui/page-header'
import { LoadingState } from '@/components/ui/loading-state'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TestSelectionModal } from '@/components/diagnostic-tests/test-selection-modal'

type ApplicationSummary = {
  applicationId: string
  attemptNumber: number
  startedAt: string
  lastSavedAt: string
  completedAt: string | null
  itemResultsCount: number
}

type TestItem = {
  testId: string
  code: string
  difficulty: string
  difficultyLabel: string
  grade: string
  gradeLabel: string
  title: string
  sortOrder: number
  activitiesCount: number
  applications: ApplicationSummary[]
  completedCount: number
  hasOpenAttempt: boolean
}

type ApiResponse = {
  studentGrade: string | null
  tests: TestItem[]
}

const ALL_DIFFICULTIES: { code: string; label: string; sortOrder: number }[] = [
  { code: 'DISLEXIA',      label: 'Dislexia',          sortOrder: 1 },
  { code: 'DISORTOGRAFIA', label: 'Disortografía',     sortOrder: 2 },
  { code: 'DISGRAFIA',     label: 'Disgrafía',         sortOrder: 3 },
  { code: 'DISPRAXIA',     label: 'Dispraxia',         sortOrder: 4 },
  { code: 'DISCALCULIA',   label: 'Discalculia',       sortOrder: 5 },
  { code: 'APZ_LENTO',     label: 'Aprendizaje lento', sortOrder: 6 },
  { code: 'TDAH',          label: 'TDAH',              sortOrder: 7 },
  { code: 'TANV',          label: 'TANV',              sortOrder: 8 },
]

export default function PruebasListPage() {
  const router = useRouter()
  const params = useParams()
  const studentId = params.id as string

  const [loading, setLoading] = useState(true)
  const [studentName, setStudentName] = useState('')
  const [data, setData] = useState<ApiResponse | null>(null)
  const [creating, setCreating] = useState<string | null>(null)
  const [selected, setSelected] = useState<TestItem | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const [sRes, tRes] = await Promise.all([
      fetch(`/api/students/${studentId}`),
      fetch(`/api/students/${studentId}/diagnostic-tests`),
    ])
    if (!sRes.ok) throw new Error('no student')
    setStudentName((await sRes.json()).name)
    if (tRes.ok) setData(await tRes.json())
  }, [studentId])

  useEffect(() => {
    load()
      .catch(() => router.push(`/estudiantes/${studentId}/expediente`))
      .finally(() => setLoading(false))
  }, [load, router, studentId])

  // Combina catálogo activo con el placeholder TANV "en construcción".
  const rows = useMemo(() => {
    const byDifficulty = new Map<string, TestItem>()
    for (const t of data?.tests ?? []) byDifficulty.set(t.difficulty, t)
    return ALL_DIFFICULTIES.map((d) => ({
      difficulty: d.code,
      difficultyLabel: d.label,
      sortOrder: d.sortOrder,
      test: byDifficulty.get(d.code) ?? null,
    }))
  }, [data])

  async function startOrSelect(t: TestItem) {
    if (t.applications.length === 0) {
      // Sin aplicaciones previas → crear directo.
      setCreating(t.testId)
      setError('')
      try {
        const res = await fetch(`/api/students/${studentId}/diagnostic-tests/${t.testId}/applications`, {
          method: 'POST',
        })
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          setError(d.error || 'No se pudo iniciar la prueba')
          return
        }
        const json: { id: string } = await res.json()
        router.push(`/estudiantes/${studentId}/pruebas/${json.id}`)
      } finally {
        setCreating(null)
      }
      return
    }
    setSelected(t)
  }

  if (loading) return <LoadingState message="Cargando pruebas diagnósticas…" />

  const gradeLabel = data?.studentGrade
    ? gradeToLabel(data.studentGrade)
    : null

  return (
    <>
      <PageHeader
        title="Pruebas diagnósticas"
        subtitle={`${studentName}${gradeLabel ? ` · ${gradeLabel}` : ''}`}
        backHref={`/estudiantes/${studentId}/expediente`}
      />
      <div className="mx-auto max-w-lg space-y-4 px-4 py-5">
        {!data?.studentGrade && (
          <Card>
            <p className="text-sm text-amber-700">
              No fue posible determinar el grado del estudiante. Verifique el dato en el
              perfil para mostrar las pruebas correspondientes.
            </p>
          </Card>
        )}

        <Card padding="sm">
          <p className="text-xs leading-relaxed text-gray-600">
            Aplique las pruebas que considere pertinentes según el perfil que se va
            construyendo en la Valoración Integral. Los resultados quedan registrados aquí y
            alimentan automáticamente el expediente. La conclusión es siempre del docente:
            las pruebas son evidencia, no diagnóstico.
          </p>
        </Card>

        {error && (
          <Card>
            <p className="text-sm text-red-700">{error}</p>
          </Card>
        )}

        <div className="space-y-2">
          {rows.map((row) => {
            const t = row.test
            if (!t) {
              return (
                <Card key={row.difficulty} padding="sm" className="opacity-70">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-700">
                        {row.sortOrder}. {row.difficultyLabel}
                      </p>
                      <p className="text-xs text-gray-500">En construcción</p>
                    </div>
                    <Badge tone="neutral">Pendiente</Badge>
                  </div>
                </Card>
              )
            }
            const status = t.completedCount > 0
              ? `${t.completedCount} aplicación${t.completedCount === 1 ? '' : 'es'} completada${t.completedCount === 1 ? '' : 's'}`
              : t.hasOpenAttempt
                ? `${t.applications.length} en proceso`
                : 'Sin aplicar'
            const tone =
              t.completedCount > 0 ? 'success'
              : t.hasOpenAttempt ? 'warning'
              : 'neutral'
            return (
              <Card key={t.testId} padding="sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900">
                      {row.sortOrder}. {t.difficultyLabel}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {t.gradeLabel} · {t.activitiesCount} actividades
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge tone={tone}>{status}</Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => startOrSelect(t)}
                      disabled={creating === t.testId}
                    >
                      {creating === t.testId
                        ? 'Iniciando…'
                        : t.applications.length === 0
                          ? 'Aplicar →'
                          : 'Abrir →'}
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {selected && (
        <TestSelectionModal
          studentId={studentId}
          testId={selected.testId}
          testTitle={`${selected.difficultyLabel} · ${selected.gradeLabel}`}
          applications={selected.applications}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}

function gradeToLabel(g: string): string {
  const map: Record<string, string> = {
    '1': 'Primer grado',
    '2': 'Segundo grado',
    '3': 'Tercer grado',
    '4': 'Cuarto grado',
    '5': 'Quinto grado',
    '6': 'Sexto grado',
  }
  return map[g] ?? g
}
