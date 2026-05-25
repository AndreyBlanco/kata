'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import type { ActivityProgressSummary } from '@/lib/diagnostic-test-helpers'

type ApplicationSummary = {
  applicationId: string
  attemptNumber: number
  startedAt: string
  lastSavedAt: string
  completedAt: string | null
  itemResultsCount: number
}

type Props = {
  studentId: string
  testId: string
  testTitle: string
  applications: ApplicationSummary[]
  onClose: () => void
}

/**
 * Modal de selección — siempre se muestra cuando hay al menos una aplicación.
 * Permite "Continuar" un intento abierto o "Nueva aplicación".
 * Si no hay aplicaciones, el llamador debe crear directamente la nueva.
 */
export function TestSelectionModal({
  studentId,
  testId,
  testTitle,
  applications,
  onClose,
}: Props) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  // Resumen por aplicación: actividades completadas/parciales/sin aplicar.
  // Se carga on demand para la primera aplicación abierta.
  const [summaries, setSummaries] = useState<Record<string, ActivityProgressSummary[]>>({})
  const [loadingSummary, setLoadingSummary] = useState<Record<string, boolean>>({})

  const sortedApps = useMemo(() => {
    return [...applications].sort((a, b) => b.attemptNumber - a.attemptNumber)
  }, [applications])

  useEffect(() => {
    // Pre-carga el resumen de cada aplicación.
    for (const app of sortedApps) {
      void loadSummary(app.applicationId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadSummary(appId: string) {
    if (summaries[appId] || loadingSummary[appId]) return
    setLoadingSummary((p) => ({ ...p, [appId]: true }))
    try {
      const res = await fetch(`/api/students/${studentId}/diagnostic-test-applications/${appId}`)
      if (!res.ok) return
      type Item = { id: string }
      type Activity = { id: string; letter: string; title: string; items: Item[] }
      const data: {
        test: { activities: Activity[] }
        itemResults: { itemId: string }[]
      } = await res.json()
      const answered = new Set(data.itemResults.map((r) => r.itemId))
      const summary: ActivityProgressSummary[] = data.test.activities.map((a) => {
        const itemsAnswered = a.items.filter((i) => answered.has(i.id)).length
        const status: ActivityProgressSummary['status'] =
          itemsAnswered === 0 ? 'none'
          : itemsAnswered === a.items.length ? 'completed'
          : 'partial'
        return {
          activityId: a.id, letter: a.letter, title: a.title,
          itemsTotal: a.items.length, itemsAnswered, status,
        }
      })
      setSummaries((p) => ({ ...p, [appId]: summary }))
    } finally {
      setLoadingSummary((p) => ({ ...p, [appId]: false }))
    }
  }

  async function createNew() {
    setCreating(true)
    setError('')
    try {
      const res = await fetch(`/api/students/${studentId}/diagnostic-tests/${testId}/applications`, {
        method: 'POST',
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error || 'No se pudo crear la aplicación')
        return
      }
      const data: { id: string } = await res.json()
      router.push(`/estudiantes/${studentId}/pruebas/${data.id}`)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 py-4 sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-gray-900">{testTitle}</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {sortedApps.length === 0
                ? 'Sin aplicaciones previas.'
                : `${sortedApps.length} aplicación${sortedApps.length === 1 ? '' : 'es'} registrada${sortedApps.length === 1 ? '' : 's'}.`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[60vh] space-y-3 overflow-y-auto px-4 py-4">
          {sortedApps.map((app) => {
            const sum = summaries[app.applicationId]
            const completed = sum?.filter((s) => s.status === 'completed') ?? []
            const partials  = sum?.filter((s) => s.status === 'partial')   ?? []
            const empty     = sum?.filter((s) => s.status === 'none')      ?? []
            return (
              <div key={app.applicationId} className="rounded-lg border border-gray-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Aplicación #{app.attemptNumber}
                      {app.completedAt && (
                        <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                          Completada
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">
                      Iniciada {new Date(app.startedAt).toLocaleDateString('es-CR')}
                      {' · '}
                      {app.itemResultsCount} item{app.itemResultsCount === 1 ? '' : 's'} con resultado
                    </p>
                  </div>
                </div>
                {sum ? (
                  <div className="space-y-1 text-xs text-gray-600">
                    {completed.length > 0 && (
                      <div>
                        <span className="font-medium text-green-700">Completadas:</span>{' '}
                        {completed.map((c) => c.title).join(', ')}
                      </div>
                    )}
                    {partials.length > 0 && (
                      <div>
                        <span className="font-medium text-amber-700">Parciales:</span>{' '}
                        {partials.map((p) => `${p.title} (${p.itemsAnswered}/${p.itemsTotal})`).join(', ')}
                      </div>
                    )}
                    {empty.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-500">Sin aplicar:</span>{' '}
                        {empty.map((e) => e.title).join(', ')}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">Cargando resumen…</p>
                )}
                <div className="mt-3 flex justify-end">
                  <Button
                    type="button"
                    variant={app.completedAt ? 'secondary' : 'primary'}
                    onClick={() => router.push(`/estudiantes/${studentId}/pruebas/${app.applicationId}`)}
                  >
                    {app.completedAt ? 'Ver / reabrir' : 'Continuar'} →
                  </Button>
                </div>
              </div>
            )
          })}

          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </div>

        <div className="flex flex-col gap-2 border-t bg-gray-50 px-4 py-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" variant="primary" onClick={createNew} disabled={creating}>
            {creating ? 'Creando…' : '+ Nueva aplicación'}
          </Button>
        </div>
      </div>
    </div>
  )
}
