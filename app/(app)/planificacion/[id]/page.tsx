'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { ServiceLessonCategory } from '@prisma/client'
import { PageHeader } from '@/components/ui/page-header'
import { LoadingState } from '@/components/ui/loading-state'
import { PlanCalendar } from '@/components/plan/plan-calendar'
import { PlanSlotModal } from '@/components/plan/plan-slot-modal'
import { PlanDocument } from '@/components/plan/plan-document'
import { PlanValidationPanel } from '@/components/plan/plan-validation'
import type {
  PlanData,
  PlanLine,
  PlanSlot,
  ScheduleSlotInfo,
} from '@/components/plan/plan-types'

interface ServerLine {
  id: string
  category: ServiceLessonCategory
  mepProcess: PlanLine['mepProcess']
  description: string
  observations: string | null
  lessonCount: number
  studentId: string | null
  linkedItemIds: string[]
  sortOrder: number
  aiGenerated?: boolean
  sourceDocumentId?: string | null
  linkedAnnualActivityId?: string | null
  slots: Array<{
    id: string
    scheduleSlotId: string
    weekNumber: number
    dayOfWeek: number
    date: string
    startTime: string
    endTime: string
    blockIndex: number
  }>
}

interface ServerPlan {
  id: string
  year: number
  month: number
  label: string
  schoolPeriod: string
  status: PlanData['status']
  approvedAt: string | null
  notes: string | null
  modality: PlanData['modality']
  lines: ServerLine[]
  schedule: PlanData['schedule']
  weekdays: PlanData['weekdays']
  validation: PlanData['validation']
}

interface StudentWithObjectives {
  id: string
  name: string
  grade: string
  objectives: Array<{
    itemId: string
    description: string
    difficultyLabel: string
    activityTitle: string
    resultLabel: string
  }>
}

type Tab = 'calendario' | 'documento' | 'validacion'

function toClientLines(server: ServerLine[]): PlanLine[] {
  return server.map((l, idx) => ({
    id: l.id,
    clientId: l.id,
    category: l.category,
    mepProcess: l.mepProcess,
    description: l.description ?? '',
    observations: l.observations ?? '',
    lessonCount: l.lessonCount,
    studentId: l.studentId,
    linkedItemIds: l.linkedItemIds ?? [],
    sortOrder: l.sortOrder ?? idx,
    aiGenerated: l.aiGenerated ?? false,
    sourceDocumentId: l.sourceDocumentId ?? null,
    linkedAnnualActivityId: l.linkedAnnualActivityId ?? null,
    slots: l.slots.map((s) => ({
      id: s.id,
      scheduleSlotId: s.scheduleSlotId,
      weekNumber: s.weekNumber,
      dayOfWeek: s.dayOfWeek,
      date: s.date.slice(0, 10),
      startTime: s.startTime,
      endTime: s.endTime,
      blockIndex: s.blockIndex,
    } as PlanSlot)),
  }))
}

interface AiGenerateResult {
  ok: boolean
  mode?: 'with_doc' | 'from_records'
  sourceDocumentId?: string
  suplenteGenerated?: boolean
  linesCreated?: number
  totalAssigned?: number
  totalUnassigned?: number
  warnings?: string[]
  aiProvider?: string | null
  aiModel?: string | null
  notes?: string | null
  error?: string
  code?: string
  existingLines?: number
}

export default function PlanDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const planId = params.id

  const [plan, setPlan] = useState<PlanData | null>(null)
  const [lines, setLines] = useState<PlanLine[]>([])
  const [students, setStudents] = useState<StudentWithObjectives[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('calendario')
  const [dirty, setDirty] = useState(false)

  const [modal, setModal] = useState<null | {
    scheduleSlot: ScheduleSlotInfo
    date: string
    weekNumber: number
    dayOfWeek: number
  }>(null)

  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [aiResult, setAiResult] = useState<AiGenerateResult | null>(null)

  const reload = useCallback(async () => {
    const [planRes, studentsRes] = await Promise.all([
      fetch(`/api/action-plans/${planId}`),
      fetch('/api/teacher/students-with-objectives'),
    ])
    if (!planRes.ok) {
      const j = await planRes.json().catch(() => ({}))
      setError(j.error || 'No se pudo cargar el plan')
      return
    }
    const data: ServerPlan = await planRes.json()
    const clientLines = toClientLines(data.lines)
    setPlan({ ...data, lines: clientLines })
    setLines(clientLines)
    setDirty(false)

    if (studentsRes.ok) {
      const s = await studentsRes.json()
      setStudents(s.students)
    }
  }, [planId])

  useEffect(() => {
    reload().finally(() => setLoading(false))
  }, [reload])

  const readOnly = plan?.status === 'APROBADO'

  // Cálculo cliente de validation cada vez que cambian las líneas (visualización rápida)
  const liveValidation = useMemo(() => {
    if (!plan) return null
    const assigned = new Map<ServiceLessonCategory, number>()
    for (const l of lines) {
      assigned.set(l.category, (assigned.get(l.category) ?? 0) + l.slots.length)
    }
    return plan.validation.categories.map((c) => {
      const lessonsAssigned = assigned.get(c.code) ?? 0
      const remaining = c.monthlyQuota - lessonsAssigned
      return {
        ...c,
        lessonsAssigned,
        remaining,
        status:
          lessonsAssigned === c.monthlyQuota
            ? ('ok' as const)
            : lessonsAssigned < c.monthlyQuota
              ? ('under' as const)
              : ('over' as const),
      }
    })
  }, [lines, plan])

  const liveValidationObj = useMemo(() => {
    if (!plan || !liveValidation) return null
    const totalAssigned = liveValidation.reduce((s, c) => s + c.lessonsAssigned, 0)
    return {
      ...plan.validation,
      categories: liveValidation,
      totalAssigned,
      warnings: liveValidation.flatMap((c) =>
        c.status === 'over'
          ? [`${c.label}: ${c.lessonsAssigned - c.monthlyQuota} lección(es) en exceso para el mes.`]
          : [],
      ),
    }
  }, [plan, liveValidation])

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const payload = {
        lines: lines.map((l) => ({
          category: l.category,
          mepProcess: l.mepProcess,
          description: l.description,
          observations: l.observations,
          lessonCount: l.slots.length,
          studentId: l.studentId,
          linkedItemIds: l.linkedItemIds,
          sortOrder: l.sortOrder,
          aiGenerated: l.aiGenerated ?? false,
          sourceDocumentId: l.sourceDocumentId ?? null,
          linkedAnnualActivityId: l.linkedAnnualActivityId ?? null,
          slots: l.slots.map((s) => ({
            scheduleSlotId: s.scheduleSlotId,
            weekNumber: s.weekNumber,
            dayOfWeek: s.dayOfWeek,
            date: s.date,
          })),
        })),
      }
      const res = await fetch(`/api/action-plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Error al guardar')
      }
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function approve() {
    if (dirty) {
      const ok = confirm('Guardar cambios pendientes antes de aprobar?')
      if (!ok) return
      await save()
    }
    const res = await fetch(`/api/action-plans/${planId}/approve`, { method: 'POST' })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error || 'Error al aprobar')
      return
    }
    await reload()
  }

  async function reopen() {
    if (!confirm('Reabrir el plan como borrador para editar?')) return
    const res = await fetch(`/api/action-plans/${planId}/approve`, { method: 'DELETE' })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error || 'Error al reabrir')
      return
    }
    await reload()
  }

  async function remove() {
    if (!confirm('¿Borrar este plan? Esta acción no se puede deshacer.')) return
    const res = await fetch(`/api/action-plans/${planId}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/planificacion')
    } else {
      const j = await res.json().catch(() => ({}))
      setError(j.error || 'Error al borrar')
    }
  }

  async function exportWord() {
    window.open(`/api/action-plans/${planId}/export`, '_blank')
  }

  async function aiGenerate(overwrite: boolean) {
    setAiBusy(true)
    setAiResult(null)
    try {
      const res = await fetch(`/api/action-plans/${planId}/ai-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overwriteExisting: overwrite }),
      })
      const data: AiGenerateResult = await res.json()
      if (!res.ok) {
        setAiResult({ ...data, ok: false })
        return
      }
      setAiResult({ ...data, ok: true })
      await reload()
    } catch (e) {
      setAiResult({ ok: false, error: e instanceof Error ? e.message : 'Error inesperado.' })
    } finally {
      setAiBusy(false)
    }
  }

  function handleLinesChange(next: PlanLine[]) {
    setLines(next)
    setDirty(true)
  }

  function openSlotModal(args: {
    date: string
    weekNumber: number
    dayOfWeek: number
    scheduleSlotId: string
  }) {
    const sched = plan?.schedule?.slots.find((s) => s.id === args.scheduleSlotId)
    if (!sched) return
    setModal({
      scheduleSlot: sched,
      date: args.date,
      weekNumber: args.weekNumber,
      dayOfWeek: args.dayOfWeek,
    })
  }

  if (loading) return <LoadingState message="Cargando plan…" />
  if (!plan) {
    return (
      <div className="p-4 text-sm text-rose-700">
        {error ?? 'Plan no encontrado'}{' '}
        <Link href="/planificacion" className="underline">Volver al listado</Link>
      </div>
    )
  }

  const totalAssigned = lines.reduce((s, l) => s + l.slots.length, 0)

  return (
    <>
      <PageHeader
        title={plan.label}
        subtitle={`Plan ${plan.status === 'APROBADO' ? 'aprobado' : 'en borrador'}`}
        backHref="/planificacion"
      />
      <div className="mx-auto max-w-5xl space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-white p-3 text-xs">
          <div>
            <p className="font-medium text-gray-800">
              {totalAssigned} de {plan.validation.totalMonthlyQuota} lecciones asignadas
              · {lines.length} línea{lines.length === 1 ? '' : 's'}
            </p>
            {plan.approvedAt && (
              <p className="text-[11px] text-emerald-700">
                Aprobado: {new Date(plan.approvedAt).toLocaleString('es-CR')}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {!readOnly && (
              <button
                type="button"
                onClick={() => { setAiResult(null); setAiModalOpen(true) }}
                disabled={saving || aiBusy}
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                ✨ Generar con IA
              </button>
            )}
            {!readOnly && (
              <button
                type="button"
                onClick={save}
                disabled={!dirty || saving}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Guardando…' : 'Guardar borrador'}
              </button>
            )}
            {!readOnly ? (
              <button
                type="button"
                onClick={approve}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
              >
                Aprobar
              </button>
            ) : (
              <button
                type="button"
                onClick={reopen}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
              >
                Reabrir borrador
              </button>
            )}
            <button
              type="button"
              onClick={exportWord}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            >
              Exportar Word
            </button>
            {!readOnly && lines.length === 0 && (
              <button
                type="button"
                onClick={remove}
                className="rounded-md border border-rose-200 px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-50"
              >
                Borrar plan
              </button>
            )}
          </div>
        </div>

        {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}

        <div className="flex gap-2 border-b text-xs">
          {([
            ['calendario', 'Calendario'],
            ['documento', 'Documento (Anexo 5)'],
            ['validacion', 'Validación'],
          ] as Array<[Tab, string]>).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`-mb-px border-b-2 px-3 py-1.5 font-medium transition-colors ${
                tab === id
                  ? 'border-blue-500 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'calendario' && plan.schedule && (
          <PlanCalendar
            weekdays={plan.weekdays}
            scheduleSlots={plan.schedule.slots}
            lines={lines}
            onSlotClick={openSlotModal}
            activeKey={modal ? `${modal.scheduleSlot.id}::${modal.date}` : null}
          />
        )}
        {tab === 'calendario' && !plan.schedule && (
          <div className="rounded-md bg-amber-50 p-3 text-xs text-amber-800">
            No hay horario base aprobado para este periodo.{' '}
            <Link href="/horario" className="underline">Crea el horario</Link> antes de planificar.
          </div>
        )}

        {tab === 'documento' && (
          <PlanDocument lines={lines} year={plan.year} month={plan.month} />
        )}

        {tab === 'validacion' && liveValidationObj && (
          <PlanValidationPanel validation={liveValidationObj} />
        )}

        {modal && (
          <PlanSlotModal
            open={!!modal}
            onClose={() => setModal(null)}
            scheduleSlot={modal.scheduleSlot}
            date={modal.date}
            weekNumber={modal.weekNumber}
            dayOfWeek={modal.dayOfWeek}
            lines={lines}
            students={students}
            readOnly={readOnly === true}
            onChange={handleLinesChange}
          />
        )}

        {aiModalOpen && (
          <AiGenerateModal
            existingLines={lines.length}
            busy={aiBusy}
            result={aiResult}
            onClose={() => setAiModalOpen(false)}
            onGenerate={(overwrite) => aiGenerate(overwrite)}
          />
        )}
      </div>
    </>
  )
}

function AiGenerateModal(props: {
  existingLines: number
  busy: boolean
  result: AiGenerateResult | null
  onClose: () => void
  onGenerate: (overwrite: boolean) => void
}) {
  const { existingLines, busy, result, onClose, onGenerate } = props
  const hasOverwriteConflict = result?.code === 'CONFIRM_OVERWRITE' || (existingLines > 0 && !result)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-lg rounded-t-xl bg-white p-4 shadow-xl sm:rounded-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">✨ Generar plan con IA</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-50"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {!result && (
          <div className="space-y-3 text-xs text-gray-700">
            <p>
              Katà va a leer tu horario aprobado, los expedientes de tus estudiantes activos y, si lo tenés,
              el Plan de Acción Anual oficial del centro para generar las líneas de este mes con asignación
              automática a slots.
            </p>
            <p>
              Si <strong>no hay un Plan de Acción Anual oficial</strong>, Katà generará primero un{' '}
              <strong>documento suplente</strong> a partir de los expedientes (lo vas a poder ver en{' '}
              <em>Documentos institucionales</em>) y luego derivará el plan mensual.
            </p>
            {existingLines > 0 && (
              <p className="rounded-md border border-amber-300 bg-amber-50 p-2 text-amber-900">
                ⚠ Este plan ya tiene <strong>{existingLines} línea{existingLines === 1 ? '' : 's'}</strong>.
                La generación con IA reemplazará todo el contenido actual del mes.
              </p>
            )}
            <p className="text-[11px] text-gray-500">
              El proceso puede tardar entre 20 y 40 segundos. No cierres esta ventana.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => onGenerate(existingLines > 0)}
                disabled={busy}
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {busy
                  ? 'Generando…'
                  : existingLines > 0
                    ? `Reemplazar y generar (${existingLines} → nuevo)`
                    : 'Generar'}
              </button>
            </div>
          </div>
        )}

        {result && !result.ok && (
          <div className="space-y-3 text-xs">
            <div className="rounded-md border border-rose-200 bg-rose-50 p-2 text-rose-800">
              <p className="font-semibold">No se pudo generar el plan</p>
              <p className="mt-1">{result.error ?? 'Error desconocido.'}</p>
              {result.code === 'AI_NOT_CONFIGURED' && (
                <p className="mt-1 text-[11px] text-rose-700">
                  Pedile al administrador del sistema que configure una API key (Google/OpenAI/Anthropic).
                </p>
              )}
            </div>
            {hasOverwriteConflict && (
              <button
                type="button"
                onClick={() => onGenerate(true)}
                disabled={busy}
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {busy ? 'Generando…' : 'Reemplazar y generar de todos modos'}
              </button>
            )}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {result && result.ok && (
          <div className="space-y-3 text-xs">
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-emerald-900">
              <p className="font-semibold">✓ Plan generado</p>
              <p className="mt-1">
                {result.linesCreated} línea{result.linesCreated === 1 ? '' : 's'} ·{' '}
                {result.totalAssigned} lección{result.totalAssigned === 1 ? '' : 'es'} asignada
                {result.totalAssigned === 1 ? '' : 's'}
                {result.totalUnassigned ? ` · ${result.totalUnassigned} sin asignar` : ''}
              </p>
              <p className="mt-1 text-[11px] text-emerald-700">
                Modo: {result.mode === 'with_doc' ? 'Plan oficial del centro' : 'Documento suplente generado por Katà'}
                {result.aiProvider ? ` · IA: ${result.aiProvider}${result.aiModel ? ` (${result.aiModel})` : ''}` : ''}
              </p>
            </div>
            {result.suplenteGenerated && (
              <p className="rounded-md border border-indigo-200 bg-indigo-50 p-2 text-indigo-900">
                ⚙ Se creó un <strong>documento suplente</strong>. Podés revisarlo desde{' '}
                <Link href="/planificacion/documentos" className="underline" onClick={onClose}>
                  Documentos institucionales
                </Link>.
              </p>
            )}
            {result.warnings && result.warnings.length > 0 && (
              <ul className="space-y-0.5 rounded-md bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800">
                {result.warnings.map((w, i) => (
                  <li key={i}>⚠ {w}</li>
                ))}
              </ul>
            )}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
              >
                Revisar plan
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
