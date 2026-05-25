'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/page-header'
import { LoadingState } from '@/components/ui/loading-state'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DIAGNOSTIC_RESULT_LABELS } from '@/lib/diagnostic-test-helpers'
import type { DiagnosticItemResult } from '@prisma/client'

// ─────────────────────────────────────────────────────────────────────────────
// Tipos (espejo del payload de /api/students/[id]/objectives)
// ─────────────────────────────────────────────────────────────────────────────

type DerivedObjective = {
  itemId: string
  itemNumber: number
  description: string
  activityId: string
  activityLetter: string
  activityTitle: string
  testId: string
  difficulty: string
  difficultyLabel: string
  grade: string
  gradeLabel: string
  result: DiagnosticItemResult
  resultLabel: string
  assessedAt: string
  applicationId: string
  attemptNumber: number
  isActive: boolean
  isDefaultActive: boolean
  priority: number
  notes: string | null
}

type ProgressItem = {
  itemId: string
  description: string
  difficulty: string
  difficultyLabel: string
  activityTitle: string
  fromResult: DiagnosticItemResult
  toResult: DiagnosticItemResult
  fromAttemptNumber: number
  toAttemptNumber: number
}

type Filter = 'active' | 'all' | 'strengths'
type GroupBy = 'difficulty' | 'result'

const RESULT_TONE: Record<DiagnosticItemResult, 'success' | 'warning' | 'danger'> = {
  LOGRADO: 'success',
  EN_PROCESO: 'warning',
  PRESENTA_DIFICULTAD: 'danger',
}

// ─────────────────────────────────────────────────────────────────────────────
// Página
// ─────────────────────────────────────────────────────────────────────────────

export default function ObjetivosPage() {
  const router = useRouter()
  const params = useParams()
  const studentId = params.id as string

  const [loading, setLoading] = useState(true)
  const [studentName, setStudentName] = useState('')
  const [objectives, setObjectives] = useState<DerivedObjective[]>([])
  const [progress, setProgress] = useState<ProgressItem[]>([])
  const [filter, setFilter] = useState<Filter>('active')
  const [groupBy, setGroupBy] = useState<GroupBy>('difficulty')
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [sRes, oRes] = await Promise.all([
      fetch(`/api/students/${studentId}`),
      fetch(`/api/students/${studentId}/objectives`),
    ])
    if (!sRes.ok) throw new Error('no student')
    setStudentName((await sRes.json()).name)
    if (oRes.ok) {
      const data: { objectives: DerivedObjective[]; progress: ProgressItem[] } = await oRes.json()
      setObjectives(data.objectives)
      setProgress(data.progress)
    }
  }, [studentId])

  useEffect(() => {
    load()
      .catch(() => router.push(`/estudiantes/${studentId}/expediente`))
      .finally(() => setLoading(false))
  }, [load, router, studentId])

  const counts = useMemo(() => {
    const active = objectives.filter((o) => o.isActive && o.result !== 'LOGRADO').length
    const strengths = objectives.filter((o) => o.result === 'LOGRADO').length
    return { active, strengths, total: objectives.length }
  }, [objectives])

  const filtered = useMemo(() => {
    return objectives.filter((o) => {
      if (filter === 'active') return o.isActive && o.result !== 'LOGRADO'
      if (filter === 'strengths') return o.result === 'LOGRADO'
      return true
    })
  }, [objectives, filter])

  const grouped = useMemo(() => {
    const map = new Map<string, { label: string; items: DerivedObjective[] }>()
    for (const o of filtered) {
      const key = groupBy === 'difficulty' ? o.difficulty : o.result
      const label = groupBy === 'difficulty' ? o.difficultyLabel : DIAGNOSTIC_RESULT_LABELS[o.result]
      if (!map.has(key)) map.set(key, { label, items: [] })
      map.get(key)!.items.push(o)
    }
    // Ordenar items por (resultado severo → leve), (actividad letter), (item number).
    for (const v of map.values()) {
      v.items.sort((a, b) => {
        const rankA = a.result === 'PRESENTA_DIFICULTAD' ? 0 : a.result === 'EN_PROCESO' ? 1 : 2
        const rankB = b.result === 'PRESENTA_DIFICULTAD' ? 0 : b.result === 'EN_PROCESO' ? 1 : 2
        if (rankA !== rankB) return rankA - rankB
        if (a.activityLetter !== b.activityLetter) return a.activityLetter.localeCompare(b.activityLetter)
        return a.itemNumber - b.itemNumber
      })
    }
    return Array.from(map.entries()).sort((a, b) => a[1].label.localeCompare(b[1].label))
  }, [filtered, groupBy])

  async function toggleActive(o: DerivedObjective) {
    const newValue = !o.isActive
    setBusy(o.itemId)
    setObjectives((prev) =>
      prev.map((x) => (x.itemId === o.itemId ? { ...x, isActive: newValue, isDefaultActive: false } : x)),
    )
    try {
      const res = await fetch(`/api/students/${studentId}/objectives/${o.itemId}/preference`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newValue }),
      })
      if (!res.ok) {
        // Revertir si falla
        setObjectives((prev) =>
          prev.map((x) => (x.itemId === o.itemId ? { ...x, isActive: o.isActive, isDefaultActive: o.isDefaultActive } : x)),
        )
      } else {
        const data: { isActive: boolean; isDefaultActive: boolean } = await res.json()
        setObjectives((prev) =>
          prev.map((x) => (x.itemId === o.itemId ? { ...x, isActive: data.isActive, isDefaultActive: data.isDefaultActive } : x)),
        )
      }
    } finally {
      setBusy(null)
    }
  }

  if (loading) return <LoadingState message="Cargando objetivos…" />

  return (
    <>
      <PageHeader
        title="Objetivos de apoyo"
        subtitle={studentName}
        backHref={`/estudiantes/${studentId}/expediente`}
      />
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <Card padding="sm">
          <p className="text-xs leading-relaxed text-gray-600">
            Objetivos derivados de las pruebas diagnósticas aplicadas. Los items marcados como
            <strong> En proceso</strong> o <strong>Presenta dificultad</strong> son objetivos activos
            por defecto. Los items en <strong>Logrado</strong> aparecen como fortalezas.
          </p>
        </Card>

        <div className="grid grid-cols-3 gap-2">
          <Card padding="sm" className="text-center">
            <p className="text-2xl font-semibold text-kata-primary-dark">{counts.active}</p>
            <p className="text-xs text-gray-500">Activos</p>
          </Card>
          <Card padding="sm" className="text-center">
            <p className="text-2xl font-semibold text-green-700">{counts.strengths}</p>
            <p className="text-xs text-gray-500">Fortalezas</p>
          </Card>
          <Card padding="sm" className="text-center">
            <p className="text-2xl font-semibold text-gray-700">{progress.length}</p>
            <p className="text-xs text-gray-500">Avances</p>
          </Card>
        </div>

        {progress.length > 0 && (
          <Card>
            <h2 className="mb-2 text-sm font-semibold text-gray-900">
              Avances entre aplicaciones
            </h2>
            <ul className="space-y-1.5 text-xs text-gray-700">
              {progress.slice(0, 6).map((p) => (
                <li key={p.itemId} className="flex items-start gap-2">
                  <span className="text-green-600">↗</span>
                  <span>
                    <strong>{p.difficultyLabel}</strong> · {p.activityTitle} ·{' '}
                    <em>{p.description}</em>{' '}
                    <span className="text-gray-500">
                      ({DIAGNOSTIC_RESULT_LABELS[p.fromResult]} → {DIAGNOSTIC_RESULT_LABELS[p.toResult]},
                      intento {p.fromAttemptNumber}→{p.toAttemptNumber})
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            {progress.length > 6 && (
              <p className="mt-2 text-xs text-gray-400">+ {progress.length - 6} más</p>
            )}
          </Card>
        )}

        {/* Controles */}
        <div className="flex flex-wrap items-center gap-2">
          <FilterPill label="Activos" current={filter} value="active" onChange={setFilter} />
          <FilterPill label="Fortalezas" current={filter} value="strengths" onChange={setFilter} />
          <FilterPill label="Todos" current={filter} value="all" onChange={setFilter} />
          <span className="ml-auto text-xs text-gray-500">Agrupar:</span>
          <button
            type="button"
            onClick={() => setGroupBy('difficulty')}
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              groupBy === 'difficulty' ? 'bg-kata-primary text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Dificultad
          </button>
          <button
            type="button"
            onClick={() => setGroupBy('result')}
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              groupBy === 'result' ? 'bg-kata-primary text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Resultado
          </button>
        </div>

        {objectives.length === 0 && (
          <Card>
            <p className="text-sm text-gray-600">
              Aún no hay objetivos derivados. Aplica al menos una prueba diagnóstica para generar objetivos.
            </p>
            <Link
              href={`/estudiantes/${studentId}/pruebas`}
              className="mt-3 inline-block text-sm text-kata-primary hover:underline"
            >
              Ir a pruebas diagnósticas →
            </Link>
          </Card>
        )}

        {grouped.map(([key, group]) => (
          <section key={key} className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-900">{group.label}</h2>
            <ul className="space-y-2">
              {group.items.map((o) => (
                <li
                  key={o.itemId}
                  className={`rounded-lg border bg-white p-3 shadow-sm transition-colors ${
                    o.isActive && o.result !== 'LOGRADO' ? 'border-kata-primary/30' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-900">
                        <span className="font-medium text-gray-500">{o.activityLetter}.{o.itemNumber}</span>{' '}
                        {o.description}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {o.activityTitle} · {o.gradeLabel} · aplicado el{' '}
                        {new Date(o.assessedAt).toLocaleDateString('es-CR')}
                        {o.attemptNumber > 1 && ` (intento ${o.attemptNumber})`}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <Badge tone={RESULT_TONE[o.result]}>{o.resultLabel}</Badge>
                      {o.result !== 'LOGRADO' && (
                        <label className="flex items-center gap-1 text-[11px] text-gray-600">
                          <input
                            type="checkbox"
                            checked={o.isActive}
                            disabled={busy === o.itemId}
                            onChange={() => toggleActive(o)}
                            className="h-3.5 w-3.5"
                          />
                          Activo
                        </label>
                      )}
                      <Link
                        href={`/estudiantes/${studentId}/pruebas/${o.applicationId}`}
                        className="text-[11px] text-kata-primary hover:underline"
                      >
                        Ver prueba →
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  )
}

function FilterPill({
  label, current, value, onChange,
}: { label: string; current: Filter; value: Filter; onChange: (v: Filter) => void }) {
  const active = current === value
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active ? 'bg-kata-primary text-white' : 'bg-gray-100 text-gray-700'
      }`}
    >
      {label}
    </button>
  )
}
