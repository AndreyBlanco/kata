'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { ObservationContext } from '@prisma/client'
import { PageHeader } from '@/components/ui/page-header'
import { LoadingState } from '@/components/ui/loading-state'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { OBSERVATION_CONTEXT_LABELS } from '@/lib/capa2-types'

type ObservationRow = {
  id: string
  context: ObservationContext
  subjectOrSpace: string | null
  observedAt: string
  appliedToAssessment: boolean
}

const NEW_CONTEXTS: { context: ObservationContext; label: string }[] = [
  { context: 'AULA', label: 'Aula' },
  { context: 'SERVICIO_APOYO', label: 'Servicio PA' },
  { context: 'OTRO', label: 'Otro' },
]

export default function ObservacionesListPage() {
  const router = useRouter()
  const params = useParams()
  const studentId = params.id as string

  const [loading, setLoading] = useState(true)
  const [studentName, setStudentName] = useState('')
  const [records, setRecords] = useState<ObservationRow[]>([])

  const load = useCallback(async () => {
    const [sRes, oRes] = await Promise.all([
      fetch(`/api/students/${studentId}`),
      fetch(`/api/students/${studentId}/observations`),
    ])
    if (!sRes.ok) throw new Error('no student')
    setStudentName((await sRes.json()).name)
    if (oRes.ok) {
      const data = await oRes.json()
      setRecords(data.records ?? [])
    }
  }, [studentId])

  useEffect(() => {
    load()
      .catch(() => router.push(`/estudiantes/${studentId}/expediente`))
      .finally(() => setLoading(false))
  }, [load, router, studentId])

  if (loading) return <LoadingState message="Cargando observaciones…" />

  return (
    <>
      <PageHeader
        title="Observaciones"
        subtitle={studentName}
        backHref={`/estudiantes/${studentId}/expediente`}
        backLabel="← Expediente"
      />

      <div className="mx-auto max-w-lg space-y-4 p-4">
        <Card padding="sm">
          <p className="mb-2 text-xs text-gray-600">Nueva observación:</p>
          <div className="flex flex-wrap gap-2">
            {NEW_CONTEXTS.map(({ context, label }) => (
              <Button
                key={context}
                variant="secondary"
                className="text-xs"
                onClick={() =>
                  router.push(`/estudiantes/${studentId}/observaciones/nueva?contexto=${context}`)
                }
              >
                + {label}
              </Button>
            ))}
          </div>
        </Card>

        {records.length === 0 ? (
          <p className="text-center text-sm text-gray-500">Sin observaciones registradas.</p>
        ) : (
          <ul className="space-y-2">
            {records.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => router.push(`/estudiantes/${studentId}/observaciones/${r.id}`)}
                  className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white p-3 text-left shadow-sm hover:border-kata-primary/40"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {OBSERVATION_CONTEXT_LABELS[r.context]}
                      {r.subjectOrSpace ? ` — ${r.subjectOrSpace}` : ''}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(r.observedAt).toLocaleDateString('es-CR')}
                    </p>
                  </div>
                  {r.appliedToAssessment ? (
                    <Badge tone="primary">En VI</Badge>
                  ) : (
                    <Badge tone="neutral">Borrador</Badge>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
