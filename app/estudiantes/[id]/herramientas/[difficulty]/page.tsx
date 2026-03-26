'use client'

// app/estudiantes/[id]/herramientas/[difficulty]/page.tsx
//
// Herramienta de valoración diagnóstica por dificultad específica.
// Muestra todos los objetivos agrupados por área → nivel.
// El docente marca cada ítem como: Sí | No | Con apoyo (o lo limpia).
// Solo los ítems marcados alimentan la valoración integral (sección 6 y 8).
//
// Niveles:
//   B → "Básico (todos los grados)"
//   1 → "1° y 2° Grado"
//   2 → "3° y 4° Grado"
//   3 → "5° y 6° Grado"
//   G → "General"
//   S → "Indicadores socioemocionales"

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

// ─── tipos ────────────────────────────────────────────────────────────────────

type ResultValue = 'yes' | 'no' | 'withSupport'

type Objective = {
  id:             string
  code:           string
  areaCode:       string
  areaLabel:      string
  level:          string
  levelLabel:     string
  levelSort:      number
  itemOrder:      number
  description:    string
  difficultyLabel: string
}

// ─── constantes ───────────────────────────────────────────────────────────────

const LEVEL_LABELS: Record<string, string> = {
  B: 'Básico (todos los grados)',
  '1': '1° y 2° Grado',
  '2': '3° y 4° Grado',
  '3': '5° y 6° Grado',
  G: 'General',
  S: 'Indicadores socioemocionales',
}

const RESULT_BUTTONS: { value: ResultValue; label: string; active: string; inactive: string }[] = [
  {
    value:    'yes',
    label:    'Sí',
    active:   'bg-green-100 border-green-500 text-green-800 font-semibold',
    inactive: 'bg-white border-gray-200 text-gray-500 hover:border-green-300 hover:text-green-700',
  },
  {
    value:    'no',
    label:    'No',
    active:   'bg-red-100 border-red-500 text-red-800 font-semibold',
    inactive: 'bg-white border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-700',
  },
  {
    value:    'withSupport',
    label:    'Con apoyo',
    active:   'bg-yellow-100 border-yellow-500 text-yellow-800 font-semibold',
    inactive: 'bg-white border-gray-200 text-gray-500 hover:border-yellow-300 hover:text-yellow-700',
  },
]

// ─── componente principal ─────────────────────────────────────────────────────

export default function HerramientaPage() {
  const params     = useParams()
  const router     = useRouter()
  const studentId  = params.id as string
  const difficulty = (params.difficulty as string).toUpperCase()

  // ── estado ──────────────────────────────────────────────────────────────────
  const [loading,          setLoading]          = useState(true)
  const [studentName,      setStudentName]      = useState('')
  const [difficultyLabel,  setDifficultyLabel]  = useState(difficulty)
  const [objectives,       setObjectives]       = useState<Objective[]>([])
  // objectiveId → resultado marcado (undefined = sin marcar)
  const [results,          setResults]          = useState<Record<string, ResultValue>>({})
  // objectiveId → está guardando ahora mismo
  const [saving,           setSaving]           = useState<Set<string>>(new Set())

  // Mapa de IDs de resultado en BD (para DELETE) — objectiveId → resultId
  const resultIds = useRef<Record<string, string>>({})

  // ── carga inicial ────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const [sRes, objRes, resRes] = await Promise.all([
          fetch(`/api/students/${studentId}`),
          fetch(`/api/catalogs/assessment-objectives?difficulty=${difficulty}&grouped=areas`),
          fetch(`/api/assessments/${studentId}/results?difficulty=${difficulty}`),
        ])

        if (sRes.ok) {
          const s = await sRes.json()
          setStudentName(s.name)
        }

        if (objRes.ok) {
          const data = await objRes.json()
          // grouped=areas devuelve:
          // [{ difficulty, difficultyLabel, areas: [{ areaCode, areaLabel, levels: [{ level, levelLabel, levelSort, objectives: [...] }] }] }]
          const flat: Objective[] = []
          let dlabel = difficulty
          for (const diffEntry of data) {
            dlabel = diffEntry.difficultyLabel ?? difficulty
            for (const area of (diffEntry.areas ?? [])) {
              for (const lvl of (area.levels ?? [])) {
                for (const obj of (lvl.objectives ?? [])) {
                  flat.push({
                    id:             obj.id,
                    code:           obj.code,
                    areaCode:       area.areaCode,
                    areaLabel:      area.areaLabel,
                    level:          lvl.level,
                    levelLabel:     LEVEL_LABELS[lvl.level] ?? lvl.levelLabel,
                    levelSort:      lvl.levelSort ?? 0,
                    itemOrder:      obj.itemOrder,
                    description:    obj.description,
                    difficultyLabel: dlabel,
                  })
                }
              }
            }
          }
          setObjectives(flat)
          setDifficultyLabel(dlabel)
        }

        if (resRes.ok) {
          const data: { id: string; objectiveId: string; result: ResultValue }[] = await resRes.json()
          const map: Record<string, ResultValue> = {}
          const ids: Record<string, string> = {}
          for (const r of data) {
            map[r.objectiveId]  = r.result
            ids[r.objectiveId]  = r.id
          }
          setResults(map)
          resultIds.current = ids
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [studentId, difficulty])

  // ── guardar/limpiar resultado ─────────────────────────────────────────────
  const setResult = useCallback(async (objectiveId: string, value: ResultValue | null) => {
    // optimistic update
    setResults((prev) => {
      const next = { ...prev }
      if (value === null) delete next[objectiveId]
      else next[objectiveId] = value
      return next
    })
    setSaving((prev) => new Set(prev).add(objectiveId))

    try {
      if (value === null) {
        // Eliminar resultado existente
        await fetch(
          `/api/assessments/${studentId}/results?objectiveId=${objectiveId}`,
          { method: 'DELETE' }
        )
        delete resultIds.current[objectiveId]
      } else {
        const res = await fetch(`/api/assessments/${studentId}/results`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify([{ objectiveId, result: value }]),
        })
        if (res.ok) {
          const data = await res.json()
          if (data.results?.[0]?.id) {
            resultIds.current[objectiveId] = data.results[0].id
          }
        }
      }
    } finally {
      setSaving((prev) => { const s = new Set(prev); s.delete(objectiveId); return s })
    }
  }, [studentId])

  const handleClick = useCallback((objectiveId: string, value: ResultValue) => {
    // Si ya tiene ese valor → limpiar (toggle)
    const current = results[objectiveId]
    setResult(objectiveId, current === value ? null : value)
  }, [results, setResult])

  // ── estadísticas ─────────────────────────────────────────────────────────
  const totalMarked = Object.keys(results).length
  const total       = objectives.length

  // ── agrupación para renderizado ──────────────────────────────────────────
  // area → level → objectives[]
  const grouped = objectives.reduce<
    Record<string, { areaLabel: string; levels: Record<string, { levelLabel: string; levelSort: number; items: Objective[] }> }>
  >((acc, obj) => {
    if (!acc[obj.areaCode]) {
      acc[obj.areaCode] = { areaLabel: obj.areaLabel, levels: {} }
    }
    const key = obj.level
    if (!acc[obj.areaCode].levels[key]) {
      acc[obj.areaCode].levels[key] = { levelLabel: obj.levelLabel, levelSort: obj.levelSort, items: [] }
    }
    acc[obj.areaCode].levels[key].items.push(obj)
    return acc
  }, {})

  const sortedAreas = Object.entries(grouped).sort(([, a], [, b]) =>
    a.areaLabel.localeCompare(b.areaLabel, 'es')
  )

  // ── render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Cargando herramienta…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header fijo */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-start gap-3">
            <Link
              href={`/estudiantes/${studentId}/valoracion`}
              className="mt-0.5 text-gray-400 hover:text-gray-600 text-lg shrink-0"
            >
              ←
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-gray-900 leading-tight">
                {difficultyLabel}
              </h1>
              <p className="text-xs text-gray-500">{studentName}</p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-sm font-semibold text-blue-700">{totalMarked}</span>
              <span className="text-xs text-gray-400"> / {total} evaluados</span>
              {total > 0 && (
                <div className="mt-1 h-1.5 w-24 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${(totalMarked / total) * 100}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Instrucciones */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 mb-4">
          Evalúa cada ítem marcando <strong>Sí</strong>, <strong>No</strong> o <strong>Con apoyo</strong>.
          Vuelve a tocar la opción marcada para borrarla.
          Solo los ítems evaluados se incluirán en la valoración integral.
        </div>
      </div>

      {/* Cuerpo — áreas y niveles */}
      <div className="max-w-2xl mx-auto px-4 pb-8 space-y-6">
        {sortedAreas.map(([areaCode, areaData]) => {
          const areaMarked = objectives
            .filter((o) => o.areaCode === areaCode && results[o.id] !== undefined)
            .length
          const areaTotal = objectives.filter((o) => o.areaCode === areaCode).length

          const sortedLevels = Object.entries(areaData.levels).sort(
            ([, a], [, b]) => a.levelSort - b.levelSort
          )

          return (
            <div key={areaCode} className="bg-white rounded-xl shadow-sm border overflow-hidden">
              {/* Encabezado de área */}
              <div className="px-4 py-3 bg-gray-800 text-white flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide">
                  {areaData.areaLabel}
                </h2>
                <span className="text-xs text-gray-300">
                  {areaMarked}/{areaTotal}
                </span>
              </div>

              {/* Niveles */}
              {sortedLevels.map(([levelKey, levelData]) => {
                const levelMarked = levelData.items.filter((o) => results[o.id] !== undefined).length
                return (
                  <div key={levelKey}>
                    {/* Sub-encabezado de nivel */}
                    <div className="px-4 py-2 bg-gray-50 border-b border-t border-gray-100 flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        {levelData.levelLabel}
                      </span>
                      <span className="text-xs text-gray-400">
                        {levelMarked}/{levelData.items.length}
                      </span>
                    </div>

                    {/* Objetivos */}
                    <div className="divide-y divide-gray-50">
                      {levelData.items
                        .sort((a, b) => a.itemOrder - b.itemOrder)
                        .map((obj) => {
                          const current = results[obj.id]
                          const isSaving = saving.has(obj.id)
                          return (
                            <div
                              key={obj.id}
                              className={`px-4 py-3 transition-colors ${
                                current ? 'bg-white' : 'bg-white'
                              }`}
                            >
                              <p className={`text-sm mb-2.5 leading-relaxed ${
                                current === undefined ? 'text-gray-600' : 'text-gray-800'
                              }`}>
                                {obj.description}
                              </p>
                              <div className="flex items-center gap-2">
                                {RESULT_BUTTONS.map((btn) => (
                                  <button
                                    key={btn.value}
                                    type="button"
                                    disabled={isSaving}
                                    onClick={() => handleClick(obj.id, btn.value)}
                                    className={`px-3 py-1.5 rounded-md text-xs border transition-colors
                                      ${current === btn.value ? btn.active : btn.inactive}
                                      ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  >
                                    {btn.label}
                                  </button>
                                ))}
                                {current !== undefined && (
                                  <button
                                    type="button"
                                    disabled={isSaving}
                                    onClick={() => setResult(obj.id, null)}
                                    className="ml-auto text-xs text-gray-300 hover:text-gray-500 transition-colors"
                                    title="Borrar selección"
                                  >
                                    {isSaving ? '…' : '×'}
                                  </button>
                                )}
                                {isSaving && current !== undefined && (
                                  <span className="ml-auto text-xs text-gray-400 animate-pulse">
                                    guardando…
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}

        {objectives.length === 0 && (
          <div className="bg-white rounded-xl border p-8 text-center text-gray-400 text-sm">
            No hay objetivos disponibles para esta dificultad.
          </div>
        )}

        {/* Botón de regreso al fondo */}
        <Link
          href={`/estudiantes/${studentId}/valoracion`}
          className="block text-center py-3 text-sm text-blue-600 hover:text-blue-800"
        >
          ← Volver a la valoración integral
        </Link>
      </div>
    </div>
  )
}
