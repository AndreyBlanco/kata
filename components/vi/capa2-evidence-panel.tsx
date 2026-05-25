'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { SectionCard } from '@/components/ui/section-card'
import { Button } from '@/components/ui/button'

type EvidenceItem = {
  id: string
  label: string
  conductedAt?: string
  observedAt?: string
  appliedToAssessment: boolean
}

type EvidenceData = {
  schoolPeriod: string
  consultation: {
    id: string
    consultedAt: string
    expedienteReviewed: boolean
  } | null
  interviews: EvidenceItem[]
  observations: EvidenceItem[]
  pendingApply: { interviews: number; observations: number; total: number }
}

type Props = {
  studentId: string
  disabled?: boolean
  onApplied: () => void
}

export function Capa2EvidencePanel({ studentId, disabled, onApplied }: Props) {
  const [data, setData] = useState<EvidenceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [open, setOpen] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/students/${studentId}/capa2-evidence`)
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [studentId])

  useEffect(() => {
    load()
  }, [load])

  const handleApply = async () => {
    if (!data?.pendingApply.total) return
    const confirmed = window.confirm(
      `¿Incorporar ${data.pendingApply.total} registro(s) pendiente(s) a la valoración integral? ` +
        'El texto existente se conservará; solo se añadirá contenido nuevo.',
    )
    if (!confirmed) return

    setApplying(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch(
        `/api/students/${studentId}/capa2-evidence/apply-to-assessment?schoolPeriod=${encodeURIComponent(data.schoolPeriod)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ onlyUnapplied: true, overwrite: false }),
        },
      )
      if (!res.ok) throw new Error('No se pudo incorporar la evidencia')
      const result = await res.json()
      setMessage(
        `Incorporados: ${result.appliedCount} registro(s) con cambios. ` +
          `${result.skippedCount} sin cambios nuevos.`,
      )
      await load()
      onApplied()
    } catch {
      setError('Error al incorporar evidencia. Intente de nuevo.')
    } finally {
      setApplying(false)
    }
  }

  const hasEvidence =
    !!data?.consultation ||
    (data?.interviews.length ?? 0) > 0 ||
    (data?.observations.length ?? 0) > 0

  return (
    <SectionCard
      title="Evidencia Capa 2 del periodo"
      hasContent={hasEvidence}
      isOpen={open}
      onToggle={() => setOpen((v) => !v)}
      badge={
        data?.pendingApply.total ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
            {data.pendingApply.total} sin incorporar
          </span>
        ) : undefined
      }
    >
      {loading && <p className="text-xs text-gray-500">Cargando evidencia...</p>}

      {!loading && !hasEvidence && (
        <p className="text-xs text-gray-500">
          No hay registros de Capa 2 en el periodo activo. Complete entrevistas, observaciones o
          consulta de expediente desde el hub del estudiante.
        </p>
      )}

      {!loading && hasEvidence && data && (
        <div className="space-y-3 text-sm">
          {data.consultation && (
            <div className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
              <p className="text-xs font-medium text-gray-800">Consulta expediente único (1.6)</p>
              <p className="text-xs text-gray-500">
                {new Date(data.consultation.consultedAt).toLocaleDateString('es-CR')} ·{' '}
                {data.consultation.expedienteReviewed ? 'Revisado' : 'Pendiente de marcar'}
              </p>
              <Link
                href={`/estudiantes/${studentId}/expediente/consulta`}
                className="text-xs text-blue-600 hover:underline"
              >
                Ver registro
              </Link>
            </div>
          )}

          {data.interviews.length > 0 && (
            <EvidenceList
              title="Entrevistas"
              items={data.interviews}
              studentId={studentId}
              basePath="entrevistas"
              dateKey="conductedAt"
            />
          )}

          {data.observations.length > 0 && (
            <EvidenceList
              title="Observaciones"
              items={data.observations}
              studentId={studentId}
              basePath="observaciones"
              dateKey="observedAt"
            />
          )}

          {message && <p className="text-xs text-green-700">{message}</p>}
          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              className="px-3 py-1.5 text-xs"
              disabled={disabled || applying || data.pendingApply.total === 0}
              onClick={handleApply}
            >
              {applying
                ? 'Incorporando...'
                : `Incorporar evidencia del periodo (${data.pendingApply.total})`}
            </Button>
            <Link
              href={`/estudiantes/${studentId}/expediente`}
              className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            >
              Ir al hub Capa 2
            </Link>
          </div>
        </div>
      )}
    </SectionCard>
  )
}

function EvidenceList({
  title,
  items,
  studentId,
  basePath,
  dateKey,
}: {
  title: string
  items: EvidenceItem[]
  studentId: string
  basePath: string
  dateKey: 'conductedAt' | 'observedAt'
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-gray-700">{title}</p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-2 rounded border border-gray-100 px-2 py-1.5 text-xs"
          >
            <span className="text-gray-800">
              {item.label}
              {item[dateKey] && (
                <span className="text-gray-400">
                  {' '}
                  · {new Date(item[dateKey]!).toLocaleDateString('es-CR')}
                </span>
              )}
            </span>
            <span className="flex shrink-0 items-center gap-2">
              {item.appliedToAssessment ? (
                <span className="text-green-600">En VI</span>
              ) : (
                <span className="text-amber-600">Pendiente</span>
              )}
              <Link
                href={`/estudiantes/${studentId}/${basePath}/${item.id}`}
                className="text-blue-600 hover:underline"
              >
                Abrir
              </Link>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
