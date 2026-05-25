'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/page-header'
import { LoadingState } from '@/components/ui/loading-state'
import type {
  ActionPlanAnnualPayload,
  AnnualActivity,
  AnnualObjective,
} from '@/lib/institutional-document-types'
import { SERVICE_CATEGORIES } from '@/lib/schedule-template'

interface DocDetail {
  id: string
  type: string
  title: string
  schoolYear: number
  originalFileName: string | null
  fileSizeBytes: number | null
  status: 'UPLOADED' | 'PROCESSING' | 'PROCESSED' | 'ERROR'
  aiProvider: string | null
  aiModel: string | null
  aiSummary: string | null
  aiError: string | null
  aiGenerated: boolean
  notes: string | null
  uploadedAt: string
  processedAt: string | null
  updatedAt: string
  extractedText: string | null
  aiPayload: ActionPlanAnnualPayload | null
  counts: { objectives: number; activities: number; axes: number }
}

const MONTH_LABELS = [
  '', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
]

export default function DocumentoInstitucionalDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id

  const [doc, setDoc] = useState<DocDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showText, setShowText] = useState(false)

  const reload = useCallback(async () => {
    const res = await fetch(`/api/institutional-documents/${id}`)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error || 'No se pudo cargar el documento.')
      return
    }
    setDoc(await res.json())
  }, [id])

  useEffect(() => {
    reload().finally(() => setLoading(false))
  }, [reload])

  async function reprocess() {
    if (!confirm('Reprocesar este documento con la IA?')) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/institutional-documents/${id}/reprocess`, { method: 'POST' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error || 'Error al reprocesar.')
        return
      }
      await reload()
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!confirm('¿Eliminar este documento? No se puede deshacer.')) return
    setBusy(true)
    const res = await fetch(`/api/institutional-documents/${id}`, { method: 'DELETE' })
    setBusy(false)
    if (res.ok) {
      router.push('/planificacion/documentos')
    } else {
      const j = await res.json().catch(() => ({}))
      setError(j.error || 'Error al borrar.')
    }
  }

  // Mapa objectiveId → AnnualObjective para resolver referencias en actividades
  const objMap = useMemo(() => {
    const m = new Map<string, AnnualObjective>()
    if (doc?.aiPayload?.objectives) {
      for (const o of doc.aiPayload.objectives) m.set(o.id, o)
    }
    return m
  }, [doc])

  if (loading) return <LoadingState message="Cargando documento…" />
  if (!doc) {
    return (
      <div className="p-4 text-sm text-rose-700">
        {error ?? 'Documento no encontrado'}{' '}
        <Link href="/planificacion/documentos" className="underline">Volver</Link>
      </div>
    )
  }

  const payload = doc.aiPayload

  return (
    <>
      <PageHeader
        title={doc.title}
        subtitle={`Año ${doc.schoolYear} · Plan de Acción Anual`}
        backHref="/planificacion/documentos"
      />
      <div className="mx-auto max-w-3xl space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-white p-3 text-xs">
          <div>
            <p className="text-gray-700">
              <strong>Estado:</strong>{' '}
              {doc.status === 'PROCESSED'
                ? 'Procesado'
                : doc.status === 'ERROR'
                  ? 'Con error'
                  : doc.status === 'PROCESSING'
                    ? 'Procesando'
                    : 'Subido'}
              {doc.aiProvider && ` · IA: ${doc.aiProvider}${doc.aiModel ? ` (${doc.aiModel})` : ''}`}
            </p>
            <p className="text-[11px] text-gray-500">
              {doc.aiGenerated ? (
                <span className="font-medium text-indigo-700">⚙ Generado por Katà desde expedientes</span>
              ) : (
                <>
                  {doc.originalFileName ?? '(sin archivo)'}
                  {doc.fileSizeBytes ? ` · ${(doc.fileSizeBytes / 1024).toFixed(1)} KB` : ''}
                </>
              )}
              {' · '}Subido {new Date(doc.uploadedAt).toLocaleString('es-CR')}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={reprocess}
              disabled={busy}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {busy ? 'Procesando…' : 'Reprocesar IA'}
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="rounded-md border border-rose-200 px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-50 disabled:opacity-50"
            >
              Borrar
            </button>
          </div>
        </div>

        {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}

        {doc.status === 'ERROR' && (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            <p className="font-semibold">Error en el procesamiento</p>
            <p className="mt-1">{doc.aiError ?? 'Sin detalles disponibles.'}</p>
            <p className="mt-1 text-[11px]">
              Tocá <strong>Reprocesar IA</strong> para intentar de nuevo (por ejemplo, si la IA estaba sobrecargada).
            </p>
          </div>
        )}

        {doc.aiSummary && (
          <section className="rounded-xl border bg-white p-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Resumen
            </h3>
            <p className="mt-1 whitespace-pre-line text-sm text-gray-800">{doc.aiSummary}</p>
          </section>
        )}

        {payload && (
          <>
            {(payload.schoolName || payload.serviceArea || payload.generalObjective || payload.responsibleTeachers.length > 0) && (
              <section className="rounded-xl border bg-white p-3 text-xs">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  Datos del plan
                </h3>
                <dl className="mt-1 grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {payload.schoolName && (
                    <div>
                      <dt className="text-gray-500">Centro educativo</dt>
                      <dd className="text-gray-800">{payload.schoolName}</dd>
                    </div>
                  )}
                  {payload.serviceArea && (
                    <div>
                      <dt className="text-gray-500">Servicio</dt>
                      <dd className="text-gray-800">{payload.serviceArea}</dd>
                    </div>
                  )}
                  {payload.responsibleTeachers.length > 0 && (
                    <div className="sm:col-span-2">
                      <dt className="text-gray-500">Personas docentes</dt>
                      <dd className="text-gray-800">{payload.responsibleTeachers.join(', ')}</dd>
                    </div>
                  )}
                  {payload.generalObjective && (
                    <div className="sm:col-span-2">
                      <dt className="text-gray-500">Objetivo general</dt>
                      <dd className="text-gray-800">{payload.generalObjective}</dd>
                    </div>
                  )}
                </dl>
              </section>
            )}

            {payload.axes.length > 0 && (
              <section className="rounded-xl border bg-white p-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  Ejes estratégicos ({payload.axes.length})
                </h3>
                <ul className="mt-2 space-y-1.5">
                  {payload.axes.map((a) => (
                    <li key={a.id} className="rounded border border-gray-100 bg-gray-50/40 px-2 py-1.5 text-xs">
                      <p className="font-medium text-gray-800">{a.title}</p>
                      {a.description && (
                        <p className="mt-0.5 text-[11px] text-gray-600">{a.description}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="rounded-xl border bg-white p-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Objetivos ({payload.objectives.length})
              </h3>
              {payload.objectives.length === 0 ? (
                <p className="mt-2 text-xs text-gray-500">No se detectaron objetivos.</p>
              ) : (
                <ol className="mt-2 space-y-2">
                  {payload.objectives.map((o, i) => (
                    <li key={o.id} className="rounded border border-gray-100 bg-gray-50/30 px-2 py-1.5 text-xs">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[10px] font-semibold text-blue-700">#{i + 1}</span>
                        <p className="font-medium text-gray-900">{o.title}</p>
                      </div>
                      {o.description && (
                        <p className="mt-0.5 text-[11px] text-gray-700">{o.description}</p>
                      )}
                      <div className="mt-0.5 flex flex-wrap gap-1.5 text-[10px] text-gray-500">
                        {o.axis && <span>Eje: {o.axis}</span>}
                        {o.targetPopulation && <span>Población: {o.targetPopulation}</span>}
                      </div>
                      {o.expectedOutcomes && o.expectedOutcomes.length > 0 && (
                        <ul className="mt-1 list-inside list-disc text-[11px] text-gray-700">
                          {o.expectedOutcomes.map((er, idx) => (
                            <li key={idx}>{er}</li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="rounded-xl border bg-white p-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Actividades ({payload.activities.length})
              </h3>
              {payload.activities.length === 0 ? (
                <p className="mt-2 text-xs text-gray-500">No se detectaron actividades.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {payload.activities.map((a) => (
                    <ActivityCard key={a.id} activity={a} objMap={objMap} />
                  ))}
                </ul>
              )}
            </section>

            {payload.notes && (
              <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                  Notas de la IA
                </h3>
                <p className="mt-1">{payload.notes}</p>
              </section>
            )}
          </>
        )}

        {doc.aiGenerated && (
          <div className="rounded-md border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-900">
            <p className="font-semibold">Documento suplente generado por Katà</p>
            <p className="mt-1">
              Este documento fue inferido a partir de los expedientes de tus estudiantes activos.
              Sustituilo cuando recibás el Plan de Acción Anual oficial de tu centro subiéndolo desde
              la lista de documentos.
            </p>
          </div>
        )}

        {doc.extractedText && (
          <section className="rounded-xl border bg-white p-3 text-xs">
            <button
              type="button"
              onClick={() => setShowText((v) => !v)}
              className="text-[11px] font-medium text-blue-700 hover:underline"
            >
              {showText ? '▼' : '▶'} Ver texto extraído del documento (auditoría)
            </button>
            {showText && (
              <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded bg-gray-50 p-2 text-[11px] text-gray-700">
                {doc.extractedText}
              </pre>
            )}
          </section>
        )}
      </div>
    </>
  )
}

function ActivityCard({
  activity,
  objMap,
}: {
  activity: AnnualActivity
  objMap: Map<string, AnnualObjective>
}) {
  const cat = activity.suggestedCategory
    ? SERVICE_CATEGORIES.find((c) => c.code === activity.suggestedCategory)
    : null

  return (
    <li className="rounded border border-gray-100 bg-gray-50/30 px-2 py-1.5 text-xs">
      <div className="flex flex-wrap items-baseline gap-2">
        <p className="font-medium text-gray-900">{activity.title}</p>
        {cat && (
          <span className={`rounded-full border px-1.5 py-0.5 text-[9px] ${cat.color}`}>
            {cat.shortLabel}
          </span>
        )}
        {activity.suggestedProcess && (
          <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[9px] text-indigo-800">
            {activity.suggestedProcess}
          </span>
        )}
      </div>
      {activity.description && (
        <p className="mt-0.5 text-[11px] text-gray-700">{activity.description}</p>
      )}
      <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] text-gray-500">
        {activity.scheduleText && <span>Cronograma: {activity.scheduleText}</span>}
        {activity.months.length > 0 && (
          <span>
            Meses: {activity.months.map((m) => MONTH_LABELS[m]).join(', ')}
          </span>
        )}
        {activity.responsibles.length > 0 && (
          <span>Responsables: {activity.responsibles.join(', ')}</span>
        )}
      </div>
      {activity.objectiveIds.length > 0 && (
        <ul className="mt-1 space-y-0.5 text-[10px] text-blue-700">
          {activity.objectiveIds.map((oid) => {
            const o = objMap.get(oid)
            return (
              <li key={oid}>
                ↳ {o ? o.title : oid}
              </li>
            )
          })}
        </ul>
      )}
    </li>
  )
}
