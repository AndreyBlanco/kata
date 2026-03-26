// app/estudiantes/[id]/objetivos/page.tsx
//
// Seguimiento de objetivos de apoyo del estudiante.
// Los objetivos son los ítems de las herramientas de valoración diagnóstica
// clasificados como NO o CON APOYO. El docente los trabaja hasta que el
// estudiante los logre (SI). Cuando todos estén logrados se sugiere el alta.

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'

// ─────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────

type ResultValue = 'yes' | 'no' | 'withSupport'

interface AssessmentResult {
  id: string
  objectiveId: string
  result: ResultValue
  assessedAt: string
  objective: {
    code: string
    difficulty: string
    difficultyLabel: string
    areaCode: string
    areaLabel: string
    level: string
    levelLabel: string
    levelSort: number
    itemOrder: number
    description: string
  }
}

type FilterTab = 'pending' | 'all' | 'achieved'

// ─────────────────────────────────────────────
// Helpers de etiqueta / color
// ─────────────────────────────────────────────

function resultBadge(result: ResultValue) {
  switch (result) {
    case 'yes':
      return { label: 'Logrado', classes: 'bg-green-100 text-green-700 border-green-200' }
    case 'withSupport':
      return { label: 'Con apoyo', classes: 'bg-amber-100 text-amber-700 border-amber-200' }
    case 'no':
      return { label: 'No logrado', classes: 'bg-red-100 text-red-600 border-red-200' }
  }
}

const LEVEL_SORT: Record<string, number> = { B: 0, '1': 1, '2': 2, '3': 3, S: 99 }

// ─────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────

export default function ObjetivosPage() {
  const router  = useRouter()
  const params  = useParams()
  const studentId = params.id as string

  const [studentName, setStudentName] = useState('')
  const [results, setResults]         = useState<AssessmentResult[]>([])
  const [loading, setLoading]         = useState(true)
  const [savingId, setSavingId]       = useState<string | null>(null)
  const [filter, setFilter]           = useState<FilterTab>('pending')

  // ── Carga inicial ──────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      const [sRes, rRes] = await Promise.all([
        fetch(`/api/students/${studentId}`),
        fetch(`/api/assessments/${studentId}/results?withObjective=true`),
      ])

      if (!sRes.ok) { router.push('/estudiantes'); return }
      const sData = await sRes.json()
      setStudentName(sData.name)

      if (rRes.ok) {
        const rData: AssessmentResult[] = await rRes.json()
        // Solo los resultados que tienen objetivo (withObjective=true puede devolver sin)
        setResults(rData.filter((r) => r.objective))
      }
    } catch {
      router.push('/estudiantes')
    } finally {
      setLoading(false)
    }
  }, [studentId, router])

  useEffect(() => { loadData() }, [loadData])

  // ── Marcar objetivo ────────────────────────────────────────────────────────

  const markResult = async (objectiveId: string, newResult: ResultValue) => {
    setSavingId(objectiveId)
    try {
      const res = await fetch(`/api/assessments/${studentId}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ objectiveId, result: newResult }]),
      })
      if (res.ok) {
        setResults((prev) =>
          prev.map((r) =>
            r.objectiveId === objectiveId ? { ...r, result: newResult } : r
          )
        )
      }
    } finally {
      setSavingId(null)
    }
  }

  // ── Derivados ───────────────────────────────────────────────────────────────

  // Todos los resultados evaluados (no, withSupport, yes)
  const evaluated = results.filter((r) =>
    r.result === 'no' || r.result === 'withSupport' || r.result === 'yes'
  )

  const pending  = evaluated.filter((r) => r.result !== 'yes')
  const achieved = evaluated.filter((r) => r.result === 'yes')

  const total      = evaluated.length
  const doneCount  = achieved.length
  const pct        = total > 0 ? Math.round((doneCount / total) * 100) : 0
  const allDone    = total > 0 && doneCount === total

  // Filtrar según pestaña
  const visible = filter === 'pending'
    ? pending
    : filter === 'achieved'
    ? achieved
    : evaluated

  // Agrupar por dificultad → área → objetivos
  type AreaGroup   = { areaLabel: string; levelSort: number; items: AssessmentResult[] }
  type DiffGroup   = { difficultyLabel: string; areas: Map<string, AreaGroup> }
  const grouped    = new Map<string, DiffGroup>()

  for (const r of visible) {
    const { difficulty, difficultyLabel, areaCode, areaLabel, levelSort } = r.objective
    if (!grouped.has(difficulty)) {
      grouped.set(difficulty, { difficultyLabel, areas: new Map() })
    }
    const dg = grouped.get(difficulty)!
    if (!dg.areas.has(areaCode)) {
      dg.areas.set(areaCode, { areaLabel, levelSort, items: [] })
    }
    dg.areas.get(areaCode)!.items.push(r)
  }

  // Ordenar items dentro de cada área: no → withSupport → yes, luego por levelSort + itemOrder
  for (const [, dg] of grouped) {
    for (const [, ag] of dg.areas) {
      ag.items.sort((a, b) => {
        const priority = { no: 0, withSupport: 1, yes: 2 }
        const pp = priority[a.result] - priority[b.result]
        if (pp !== 0) return pp
        const ls = (LEVEL_SORT[a.objective.level] ?? 0) - (LEVEL_SORT[b.objective.level] ?? 0)
        if (ls !== 0) return ls
        return a.objective.itemOrder - b.objective.itemOrder
      })
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ── */}
      <div className="bg-white border-b px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => router.push(`/estudiantes/${studentId}`)}
            className="text-sm text-blue-600 mb-2 hover:underline"
          >
            ← {studentName}
          </button>
          <h1 className="text-xl font-bold text-gray-900">Objetivos de Apoyo</h1>
          <p className="text-sm text-gray-500">
            Ítems clasificados como No logrado o Con apoyo en la valoración diagnóstica
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">

        {/* ── Sin datos ── */}
        {total === 0 && (
          <div className="bg-white rounded-lg border p-8 text-center">
            <p className="text-gray-400 font-medium">Sin objetivos de apoyo registrados</p>
            <p className="text-sm text-gray-400 mt-1">
              Completa las herramientas de valoración diagnóstica para generar objetivos.
            </p>
            <button
              onClick={() => router.push(`/estudiantes/${studentId}/valoracion`)}
              className="mt-4 text-sm text-blue-600 hover:underline"
            >
              Ir a Valoración Integral
            </button>
          </div>
        )}

        {total > 0 && (
          <>
            {/* ── Barra de progreso general ── */}
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-900">Progreso general</span>
                <span className="text-sm font-bold text-gray-700">
                  {doneCount} / {total} logrado{doneCount !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-3 bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex justify-between mt-1 text-xs text-gray-400">
                <span>{pending.length} pendiente{pending.length !== 1 ? 's' : ''}</span>
                <span>{pct}%</span>
              </div>
            </div>

            {/* ── Banner de alta sugerida ── */}
            {allDone && (
              <div className="bg-green-50 border border-green-300 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🎓</span>
                  <div>
                    <p className="text-sm font-semibold text-green-900">
                      ¡Todos los objetivos logrados!
                    </p>
                    <p className="text-sm text-green-800 mt-0.5">
                      El estudiante ha superado todos los ítems de la valoración diagnóstica.
                      Se sugiere evaluar el alta del estudiante del sistema de apoyo educativo.
                    </p>
                    <button
                      onClick={() => router.push(`/estudiantes/${studentId}/plan`)}
                      className="mt-2 text-sm text-green-700 underline hover:no-underline font-medium"
                    >
                      Revisar Plan de Apoyo para continuar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Pestañas de filtro ── */}
            <div className="flex bg-white rounded-lg border overflow-hidden">
              {([
                ['pending',  `Pendientes (${pending.length})`],
                ['all',      `Todos (${total})`],
                ['achieved', `Logrados (${doneCount})`],
              ] as [FilterTab, string][]).map(([tab, label]) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                    filter === tab
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* ── Sin resultados en filtro ── */}
            {visible.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm">
                  {filter === 'pending'
                    ? 'No hay objetivos pendientes — ¡excelente progreso!'
                    : 'No hay objetivos en esta categoría.'}
                </p>
              </div>
            )}

            {/* ── Lista agrupada ── */}
            {[...grouped.entries()].map(([diff, dg]) => {
              const diffItems    = visible.filter((r) => r.objective.difficulty === diff)
              const diffAchieved = diffItems.filter((r) => r.result === 'yes').length
              const diffTotal    = diffItems.length
              const diffPct      = diffTotal > 0 ? Math.round((diffAchieved / diffTotal) * 100) : 0

              // Contar totales sin filtro para badge
              const allDiffItems = evaluated.filter((r) => r.objective.difficulty === diff)
              const allDiffDone  = allDiffItems.filter((r) => r.result === 'yes').length

              return (
                <div key={diff} className="bg-white rounded-lg border overflow-hidden">

                  {/* Cabecera de dificultad */}
                  <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-blue-900 text-sm">
                        {dg.difficultyLabel}
                      </span>
                      <span className="text-xs text-blue-600 font-medium">
                        {allDiffDone} / {allDiffItems.length}
                      </span>
                    </div>
                    {/* Mini barra por dificultad */}
                    <div className="mt-2 h-1.5 bg-blue-100 rounded-full overflow-hidden">
                      <div
                        className="h-1.5 bg-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${diffPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Áreas */}
                  {[...dg.areas.entries()].map(([areaCode, ag]) => (
                    <div key={areaCode}>
                      {/* Sub-cabecera de área */}
                      <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          {ag.areaLabel}
                        </span>
                      </div>

                      {/* Objetivos del área */}
                      <div className="divide-y divide-gray-100">
                        {ag.items.map((r) => {
                          const badge    = resultBadge(r.result)
                          const isSaving = savingId === r.objectiveId
                          const isDone   = r.result === 'yes'

                          return (
                            <div
                              key={r.objectiveId}
                              className={`px-4 py-3 flex items-start gap-3 transition-colors ${
                                isDone ? 'bg-green-50/50' : ''
                              }`}
                            >
                              {/* Indicador de estado */}
                              <div className="mt-0.5 shrink-0">
                                {isDone ? (
                                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white text-xs font-bold">
                                    ✓
                                  </span>
                                ) : (
                                  <span className={`flex h-5 w-5 items-center justify-center rounded-full border text-xs font-bold ${
                                    r.result === 'no'
                                      ? 'border-red-300 text-red-400 bg-red-50'
                                      : 'border-amber-300 text-amber-500 bg-amber-50'
                                  }`}>
                                    {r.result === 'no' ? '✗' : '~'}
                                  </span>
                                )}
                              </div>

                              {/* Contenido */}
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm leading-snug ${isDone ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                                  {r.objective.description}
                                </p>
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                  <span className="text-xs text-gray-400">
                                    {r.objective.levelLabel}
                                  </span>
                                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${badge.classes}`}>
                                    {badge.label}
                                  </span>
                                </div>
                              </div>

                              {/* Acción */}
                              <div className="shrink-0 flex flex-col gap-1">
                                {!isDone ? (
                                  <button
                                    onClick={() => markResult(r.objectiveId, 'yes')}
                                    disabled={isSaving}
                                    className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-md
                                               font-medium hover:bg-green-700 transition-colors
                                               disabled:bg-green-300"
                                  >
                                    {isSaving ? '...' : 'Logrado'}
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => markResult(r.objectiveId, 'withSupport')}
                                    disabled={isSaving}
                                    className="text-xs px-3 py-1.5 border border-gray-300 text-gray-500
                                               rounded-md hover:bg-gray-50 transition-colors
                                               disabled:opacity-50"
                                  >
                                    {isSaving ? '...' : 'Deshacer'}
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}

            {/* ── Nota al pie ── */}
            {filter !== 'achieved' && pending.length > 0 && (
              <p className="text-xs text-center text-gray-400 pb-2">
                Marca cada objetivo como <strong>Logrado</strong> conforme el estudiante lo supere.
                Al completar todos, se sugerirá el proceso de alta.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
