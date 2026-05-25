'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PageHeader } from '@/components/ui/page-header'
import { LoadingState } from '@/components/ui/loading-state'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MdBlock } from '@/components/diagnostic-tests/md-block'
import {
  DIAGNOSTIC_ITEM_RESULTS,
  DIAGNOSTIC_RESULT_LABELS,
  type DiagnosticItemResultValue,
} from '@/lib/diagnostic-test-helpers'

// ──────────────────────────────────────────────────────────────────────────────
// Tipos
// ──────────────────────────────────────────────────────────────────────────────

type Item = { id: string; itemNumber: number; description: string }
type Recommendation = { id: string; text: string }

type Activity = {
  id: string
  letter: string
  title: string
  purpose: string | null
  modality: string | null
  estimatedTime: string | null
  materials: string | null
  teacherInstructions: string | null
  applicationMaterial: string | null
  crossDifficulties: string | null
  items: Item[]
  recommendations: Recommendation[]
}

type ApplicationResponse = {
  id: string
  attemptNumber: number
  startedAt: string
  lastSavedAt: string
  completedAt: string | null
  draftPayload: DraftPayload | null
  test: {
    id: string
    title: string
    difficultyLabel: string
    gradeLabel: string
    description: string | null
    activities: Activity[]
  }
  itemResults: { itemId: string; result: DiagnosticItemResultValue; notes: string | null }[]
  activityObservations: { activityId: string; text: string }[]
  recommendationSelections: { recommendationId: string; selected: boolean }[]
}

type ItemState = { result: DiagnosticItemResultValue | null; notes: string }
type DraftPayload = {
  itemResults: Record<string, { result: DiagnosticItemResultValue; notes?: string }>
  observations: Record<string, string>
  recommendationSelections: Record<string, boolean>
}

// ──────────────────────────────────────────────────────────────────────────────
// Página
// ──────────────────────────────────────────────────────────────────────────────

export default function ApplicationPage() {
  const router = useRouter()
  const params = useParams()
  const studentId = params.id as string
  const applicationId = params.applicationId as string

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ApplicationResponse | null>(null)
  const [studentName, setStudentName] = useState('')
  const [error, setError] = useState('')

  // Estado local de cambios (incluye persisted + dirty)
  const [items, setItems] = useState<Record<string, ItemState>>({})
  const [observations, setObservations] = useState<Record<string, string>>({})
  const [selections, setSelections] = useState<Record<string, boolean>>({})
  const [dirty, setDirty] = useState(false)
  const [savingFinal, setSavingFinal] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showExitModal, setShowExitModal] = useState(false)

  // Autosave timer
  const draftTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastSnapshotRef = useRef('')

  const load = useCallback(async () => {
    const [sRes, aRes] = await Promise.all([
      fetch(`/api/students/${studentId}`),
      fetch(`/api/students/${studentId}/diagnostic-test-applications/${applicationId}`),
    ])
    if (!sRes.ok || !aRes.ok) throw new Error('not found')
    setStudentName((await sRes.json()).name)
    const app: ApplicationResponse = await aRes.json()
    setData(app)

    // Inicializa el estado desde lo persistido + draftPayload
    const itemsInit: Record<string, ItemState> = {}
    for (const r of app.itemResults) itemsInit[r.itemId] = { result: r.result, notes: r.notes ?? '' }
    const obsInit: Record<string, string> = {}
    for (const o of app.activityObservations) obsInit[o.activityId] = o.text
    const selInit: Record<string, boolean> = {}
    for (const s of app.recommendationSelections) selInit[s.recommendationId] = s.selected

    if (app.draftPayload) {
      for (const [id, v] of Object.entries(app.draftPayload.itemResults ?? {})) {
        itemsInit[id] = { result: v.result, notes: v.notes ?? itemsInit[id]?.notes ?? '' }
      }
      for (const [id, t] of Object.entries(app.draftPayload.observations ?? {})) {
        obsInit[id] = t
      }
      for (const [id, b] of Object.entries(app.draftPayload.recommendationSelections ?? {})) {
        selInit[id] = b
      }
      setDirty(true)
    }

    setItems(itemsInit)
    setObservations(obsInit)
    setSelections(selInit)
    lastSnapshotRef.current = JSON.stringify({ itemsInit, obsInit, selInit })
  }, [studentId, applicationId])

  useEffect(() => {
    load()
      .catch(() => router.push(`/estudiantes/${studentId}/pruebas`))
      .finally(() => setLoading(false))
  }, [load, router, studentId])

  // ── Autosave del draft (cada 1.5s tras pausar de escribir) ───────────────
  useEffect(() => {
    if (!dirty || !data) return
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    draftTimerRef.current = setTimeout(() => {
      void saveDraft()
    }, 1500)
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, observations, selections, dirty])

  // ── Aviso antes de salir si hay cambios sin guardar ─────────────────────
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (dirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  // ── Mutators ─────────────────────────────────────────────────────────────
  function setItemResult(itemId: string, result: DiagnosticItemResultValue) {
    setItems((p) => ({ ...p, [itemId]: { result, notes: p[itemId]?.notes ?? '' } }))
    setDirty(true)
    setSaved(false)
  }
  function setItemNotes(itemId: string, notes: string) {
    setItems((p) => ({ ...p, [itemId]: { result: p[itemId]?.result ?? null, notes } }))
    setDirty(true)
    setSaved(false)
  }
  function setObservation(activityId: string, text: string) {
    setObservations((p) => ({ ...p, [activityId]: text }))
    setDirty(true)
    setSaved(false)
  }
  function toggleSelection(recommendationId: string) {
    setSelections((p) => ({ ...p, [recommendationId]: !p[recommendationId] }))
    setDirty(true)
    setSaved(false)
  }

  // ── Persistencia ─────────────────────────────────────────────────────────
  const draftPayload = useMemo<DraftPayload>(() => {
    const payload: DraftPayload = { itemResults: {}, observations: {}, recommendationSelections: {} }
    for (const [id, s] of Object.entries(items)) {
      if (s.result) payload.itemResults[id] = { result: s.result, notes: s.notes || undefined }
    }
    for (const [id, t] of Object.entries(observations)) {
      if (t.trim()) payload.observations[id] = t
    }
    for (const [id, b] of Object.entries(selections)) {
      payload.recommendationSelections[id] = b
    }
    return payload
  }, [items, observations, selections])

  async function saveDraft() {
    if (!dirty || !data) return
    try {
      await fetch(`/api/students/${studentId}/diagnostic-test-applications/${applicationId}/draft`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draftPayload),
      })
    } catch {
      // Silencioso (es autosave)
    }
  }

  async function savePersistent() {
    if (!data) return
    setSavingFinal(true)
    setError('')
    try {
      const res = await fetch(`/api/students/${studentId}/diagnostic-test-applications/${applicationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draftPayload),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error || 'No se pudo guardar')
        return
      }
      setDirty(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSavingFinal(false)
    }
  }

  async function complete() {
    if (dirty) await savePersistent()
    if (!data) return
    setCompleting(true)
    try {
      const res = await fetch(`/api/students/${studentId}/diagnostic-test-applications/${applicationId}/complete`, {
        method: 'POST',
      })
      if (res.ok) {
        const upd: { completedAt: string } = await res.json()
        setData((prev) => prev ? { ...prev, completedAt: upd.completedAt } : prev)
      }
    } finally {
      setCompleting(false)
    }
  }

  async function reopen() {
    setCompleting(true)
    try {
      const res = await fetch(`/api/students/${studentId}/diagnostic-test-applications/${applicationId}/complete`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setData((prev) => prev ? { ...prev, completedAt: null } : prev)
      }
    } finally {
      setCompleting(false)
    }
  }

  function attemptExit() {
    if (dirty) setShowExitModal(true)
    else router.push(`/estudiantes/${studentId}/pruebas`)
  }

  async function exitSaving() {
    await savePersistent()
    router.push(`/estudiantes/${studentId}/pruebas`)
  }

  function exitDiscarding() {
    void fetch(`/api/students/${studentId}/diagnostic-test-applications/${applicationId}/draft`, {
      method: 'DELETE',
    })
    router.push(`/estudiantes/${studentId}/pruebas`)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return <LoadingState message="Cargando prueba diagnóstica…" />
  if (!data) return <LoadingState message="Sin datos." />

  const isCompleted = !!data.completedAt
  const totalItems = data.test.activities.reduce((acc, a) => acc + a.items.length, 0)
  const answeredItems = Object.values(items).filter((s) => !!s.result).length

  return (
    <>
      <PageHeader
        title={data.test.difficultyLabel}
        subtitle={`${data.test.gradeLabel} · Aplicación #${data.attemptNumber} · ${studentName}`}
        backHref={`/estudiantes/${studentId}/pruebas`}
      >
        <div className="flex flex-col items-end gap-1">
          {isCompleted
            ? <Badge tone="success">Completada</Badge>
            : <Badge tone={answeredItems > 0 ? 'warning' : 'neutral'}>
                {answeredItems}/{totalItems}
              </Badge>}
          {saved && <span className="text-xs text-green-700">Guardado ✓</span>}
        </div>
      </PageHeader>

      <div className="mx-auto max-w-2xl space-y-4 px-4 py-5 pb-32">
        {/* Aviso normativo */}
        {data.test.description && (
          <Card className="border-amber-200 bg-amber-50">
            <p className="text-xs leading-relaxed text-amber-900">{data.test.description}</p>
          </Card>
        )}

        {/* Acciones rápidas */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
          >
            🖨 Imprimir prueba
          </button>
          {isCompleted ? (
            <Button type="button" variant="ghost" onClick={reopen} disabled={completing}>
              Reabrir aplicación
            </Button>
          ) : (
            <Button type="button" variant="ghost" onClick={complete} disabled={completing}>
              Marcar completada
            </Button>
          )}
        </div>

        {/* Actividades */}
        <div className="space-y-5">
          {data.test.activities.map((activity) => (
            <ActivitySection
              key={activity.id}
              activity={activity}
              items={items}
              observation={observations[activity.id] ?? ''}
              selections={selections}
              disabled={isCompleted}
              onItemResult={setItemResult}
              onItemNotes={setItemNotes}
              onObservation={setObservation}
              onToggleSelection={toggleSelection}
            />
          ))}
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <p className="text-sm text-red-700">{error}</p>
          </Card>
        )}
      </div>

      {/* Barra fija de guardado */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-white px-4 py-3 shadow-[0_-2px_8px_-2px_rgba(0,0,0,0.05)]">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <button
            type="button"
            className="text-sm text-gray-600 hover:underline"
            onClick={attemptExit}
          >
            ← Volver
          </button>
          <div className="flex items-center gap-2">
            {dirty && <span className="text-xs text-amber-700">Cambios sin guardar</span>}
            <Button
              type="button"
              variant="primary"
              onClick={savePersistent}
              disabled={!dirty || savingFinal || isCompleted}
            >
              {savingFinal ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de salida con cambios sin guardar */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">Salir sin guardar?</h3>
            <p className="mt-1 text-sm text-gray-600">
              Tienes cambios pendientes. ¿Qué deseas hacer antes de salir?
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Button type="button" variant="primary" onClick={exitSaving}>
                Guardar y salir
              </Button>
              <Button type="button" variant="secondary" onClick={() => { setShowExitModal(false); router.push(`/estudiantes/${studentId}/pruebas`) }}>
                Salir y conservar borrador
              </Button>
              <Button type="button" variant="danger" onClick={exitDiscarding}>
                Descartar borrador y salir
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowExitModal(false)}>
                Continuar editando
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Subcomponentes
// ──────────────────────────────────────────────────────────────────────────────

function ActivitySection({
  activity,
  items,
  observation,
  selections,
  disabled,
  onItemResult,
  onItemNotes,
  onObservation,
  onToggleSelection,
}: {
  activity: Activity
  items: Record<string, ItemState>
  observation: string
  selections: Record<string, boolean>
  disabled: boolean
  onItemResult: (id: string, r: DiagnosticItemResultValue) => void
  onItemNotes: (id: string, n: string) => void
  onObservation: (activityId: string, t: string) => void
  onToggleSelection: (recId: string) => void
}) {
  const [meta, setMeta] = useState(false)
  const answered = activity.items.filter((i) => items[i.id]?.result).length

  return (
    <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
      <header className="border-b bg-gray-50 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-gray-900">
              {activity.letter}. {activity.title}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {answered}/{activity.items.length} ítem{activity.items.length === 1 ? '' : 's'} con resultado
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMeta((p) => !p)}
            className="text-xs text-kata-primary hover:underline"
          >
            {meta ? 'Ocultar guía' : 'Ver guía'}
          </button>
        </div>
      </header>

      {meta && (
        <div className="space-y-3 border-b bg-amber-50/50 px-4 py-3 text-xs text-gray-700">
          {activity.purpose       && <p><span className="font-semibold">Propósito:</span> {activity.purpose}</p>}
          {activity.modality      && <p><span className="font-semibold">Modalidad:</span> {activity.modality}</p>}
          {activity.estimatedTime && <p><span className="font-semibold">Tiempo:</span> {activity.estimatedTime}</p>}
          {activity.materials     && <p><span className="font-semibold">Materiales:</span> {activity.materials}</p>}
          {activity.teacherInstructions && (
            <div>
              <p className="font-semibold">Instrucciones para el docente:</p>
              <MdBlock>{activity.teacherInstructions}</MdBlock>
            </div>
          )}
          {activity.applicationMaterial && (
            <div>
              <p className="font-semibold">Material para aplicación:</p>
              <MdBlock>{activity.applicationMaterial}</MdBlock>
            </div>
          )}
          {activity.crossDifficulties && (
            <div>
              <p className="font-semibold">Cruces con otras dificultades:</p>
              <MdBlock>{activity.crossDifficulties}</MdBlock>
            </div>
          )}
        </div>
      )}

      {/* Ítems */}
      <div className="space-y-3 px-4 py-3">
        {activity.items.map((it) => (
          <div key={it.id} className="rounded-lg border border-gray-100 bg-gray-50/40 p-3">
            <p className="text-sm text-gray-800">
              <span className="font-medium">{it.itemNumber}.</span> {it.description}
            </p>
            <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-3">
              {DIAGNOSTIC_ITEM_RESULTS.map((opt) => {
                const active = items[it.id]?.result === opt
                const tone =
                  opt === 'LOGRADO'              ? 'border-green-300 bg-green-50 text-green-900'
                  : opt === 'EN_PROCESO'         ? 'border-amber-300 bg-amber-50 text-amber-900'
                                                 : 'border-red-300 bg-red-50 text-red-900'
                return (
                  <button
                    key={opt}
                    type="button"
                    disabled={disabled}
                    onClick={() => onItemResult(it.id, opt)}
                    className={`rounded-md border px-2 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50
                      ${active ? tone : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}
                  >
                    {DIAGNOSTIC_RESULT_LABELS[opt]}
                  </button>
                )
              })}
            </div>
            <input
              type="text"
              disabled={disabled}
              value={items[it.id]?.notes ?? ''}
              onChange={(e) => onItemNotes(it.id, e.target.value)}
              placeholder="Nota breve (opcional)"
              className="mt-2 w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs text-gray-700 placeholder-gray-400 focus:border-kata-primary focus:outline-none"
            />
          </div>
        ))}
      </div>

      {/* Observaciones */}
      <div className="border-t bg-gray-50/60 px-4 py-3">
        <label className="text-xs font-semibold text-gray-700">Observaciones del docente</label>
        <textarea
          value={observation}
          onChange={(e) => onObservation(activity.id, e.target.value)}
          disabled={disabled}
          rows={2}
          className="mt-1 w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-700 placeholder-gray-400 focus:border-kata-primary focus:outline-none"
          placeholder="Patrones, contexto, dudas, próximos pasos…"
        />
      </div>

      {/* Recomendaciones */}
      {activity.recommendations.length > 0 && (
        <div className="border-t px-4 py-3">
          <p className="mb-2 text-xs font-semibold text-gray-700">
            Recomendaciones disponibles
          </p>
          <p className="mb-2 text-[11px] text-gray-500">
            Marque las que aplicarías para este estudiante. Pasarán al plan de apoyo.
          </p>
          <div className="space-y-1.5">
            {activity.recommendations.map((rec) => (
              <label
                key={rec.id}
                className={`flex cursor-pointer items-start gap-2 rounded-md border px-2 py-1.5 text-xs
                  ${selections[rec.id] ? 'border-kata-primary bg-kata-primary/5' : 'border-gray-200 bg-white'}`}
              >
                <input
                  type="checkbox"
                  checked={!!selections[rec.id]}
                  onChange={() => onToggleSelection(rec.id)}
                  disabled={disabled}
                  className="mt-0.5"
                />
                <span className="text-gray-700">{rec.text}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
