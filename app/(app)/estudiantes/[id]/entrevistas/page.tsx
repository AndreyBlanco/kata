'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PageHeader } from '@/components/ui/page-header'
import { LoadingState } from '@/components/ui/loading-state'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { INTERVIEW_TYPE_LABELS } from '@/lib/capa2-types'
import type { InterviewType } from '@prisma/client'

type InterviewRow = {
  id: string
  interviewType: InterviewType
  conductedAt: string
  appliedToAssessment: boolean
}

const NEW_TYPES: { type: InterviewType; label: string }[] = [
  { type: 'FAMILIA', label: 'Familia' },
  { type: 'ESTUDIANTE', label: 'Estudiante' },
  { type: 'DOCENTE_GRADO', label: 'Docente de grado' },
  { type: 'DOCENTE_GUIA', label: 'Docente guía' },
  { type: 'OTRO_PROFESIONAL', label: 'Otro profesional' },
]

export default function EntrevistasListPage() {
  const router = useRouter()
  const params = useParams()
  const studentId = params.id as string

  const [loading, setLoading] = useState(true)
  const [studentName, setStudentName] = useState('')
  const [records, setRecords] = useState<InterviewRow[]>([])

  const load = useCallback(async () => {
    const [sRes, iRes] = await Promise.all([
      fetch(`/api/students/${studentId}`),
      fetch(`/api/students/${studentId}/interviews`),
    ])
    if (!sRes.ok) throw new Error('no student')
    setStudentName((await sRes.json()).name)
    if (iRes.ok) {
      const data = await iRes.json()
      setRecords(data.records ?? [])
    }
  }, [studentId])

  useEffect(() => {
    load()
      .catch(() => router.push(`/estudiantes/${studentId}/expediente`))
      .finally(() => setLoading(false))
  }, [load, router, studentId])

  if (loading) return <LoadingState message="Cargando entrevistas…" />

  return (
    <>
      <PageHeader
        title="Entrevistas"
        subtitle={studentName}
        backHref={`/estudiantes/${studentId}/expediente`}
        backLabel="← Expediente"
      />

      <div className="mx-auto max-w-lg space-y-4 p-4">
        <Card padding="sm">
          <p className="mb-2 text-xs text-gray-600">Nueva entrevista por tipo:</p>
          <div className="flex flex-wrap gap-2">
            {NEW_TYPES.map(({ type, label }) => (
              <Button
                key={type}
                variant="secondary"
                className="text-xs"
                onClick={() =>
                  router.push(`/estudiantes/${studentId}/entrevistas/nueva?tipo=${type}`)
                }
              >
                + {label}
              </Button>
            ))}
          </div>
        </Card>

        {records.length === 0 ? (
          <p className="text-center text-sm text-gray-500">Sin entrevistas registradas.</p>
        ) : (
          <ul className="space-y-2">
            {records.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => router.push(`/estudiantes/${studentId}/entrevistas/${r.id}`)}
                  className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white p-3 text-left shadow-sm hover:border-kata-primary/40"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {INTERVIEW_TYPE_LABELS[r.interviewType]}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(r.conductedAt).toLocaleDateString('es-CR')}
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
