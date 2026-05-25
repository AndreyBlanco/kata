'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import type { ObservationContext } from '@prisma/client'
import { PageHeader } from '@/components/ui/page-header'
import { LoadingState } from '@/components/ui/loading-state'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { GuidedFormField } from '@/components/capa2/guided-form-field'
import {
  FormGuidanceProvider,
  FormGuidanceToggle,
} from '@/components/capa2/form-guidance-context'
import { AssistantPanel } from '@/components/capa2/assistant-panel'
import { OBSERVATION_CONTEXT_LABELS } from '@/lib/capa2-types'
import {
  OBSERVATION_DIMENSION_EXTRA,
  OBSERVATION_GENERAL_NOTES_GUIDANCE,
  observationGuidanceForDimension,
} from '@/lib/field-guidance'

type DimensionItem = {
  code: string
  label: string
  guideText: string | null
  dimension: string
}

const VALID_CONTEXTS = new Set(['AULA', 'SERVICIO_APOYO', 'OTRO'])

export default function NuevaObservacionPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const studentId = params.id as string

  const ctxParam = searchParams.get('contexto') ?? 'AULA'
  const context = VALID_CONTEXTS.has(ctxParam)
    ? (ctxParam as ObservationContext)
    : 'AULA'

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [studentName, setStudentName] = useState('')
  const [dimensions, setDimensions] = useState<DimensionItem[]>([])

  const [observedAt, setObservedAt] = useState('')
  const [subjectOrSpace, setSubjectOrSpace] = useState('')
  const [dimensionNotes, setDimensionNotes] = useState<Record<string, string>>({})
  const [generalNotes, setGeneralNotes] = useState('')

  useEffect(() => {
    const dimFilter = context === 'AULA' ? 'aula' : 'institucional'
    Promise.all([
      fetch(`/api/students/${studentId}`),
      fetch(`/api/catalogs/context-dimensions?dimension=${dimFilter}`),
    ])
      .then(async ([sRes, dRes]) => {
        if (!sRes.ok) throw new Error()
        setStudentName((await sRes.json()).name)
        if (dRes.ok) {
          const items = (await dRes.json()) as DimensionItem[]
          setDimensions(items)
          const initial: Record<string, string> = {}
          for (const d of items) initial[d.code] = ''
          setDimensionNotes(initial)
        }
        setObservedAt(new Date().toISOString().slice(0, 10))
        setLoading(false)
      })
      .catch(() => router.push(`/estudiantes/${studentId}/observaciones`))
  }, [context, router, studentId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/students/${studentId}/observations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context,
          observedAt,
          subjectOrSpace,
          dimensionNotes,
          generalNotes,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Error')
      }
      const record = await res.json()
      router.push(`/estudiantes/${studentId}/observaciones/${record.id}`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo guardar.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState message="Preparando observación…" />

  return (
    <>
      <PageHeader
        title={`Nueva observación — ${OBSERVATION_CONTEXT_LABELS[context]}`}
        subtitle={studentName}
        backHref={`/estudiantes/${studentId}/observaciones`}
        backLabel="← Observaciones"
      />

      <FormGuidanceProvider>
      <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-4 p-4 pb-24">
        <FormGuidanceToggle />

        <FormField label="Fecha de observación" required>
          <Input
            type="date"
            required
            value={observedAt}
            onChange={(e) => setObservedAt(e.target.value)}
          />
        </FormField>

        <FormField label="Asignatura o espacio" hint="Ej. Matemática, aula 3-B">
          <Input value={subjectOrSpace} onChange={(e) => setSubjectOrSpace(e.target.value)} />
        </FormField>

        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Contexto de aula (Líneas de acción)
        </p>

        {dimensions.map((d) => (
          <GuidedFormField
            key={d.code}
            label={d.label}
            guidance={observationGuidanceForDimension(d.code, d.label, d.guideText)}
            catalogHint={OBSERVATION_DIMENSION_EXTRA[d.code] ? d.guideText : undefined}
          >
            <Textarea
              rows={2}
              value={dimensionNotes[d.code] ?? ''}
              onChange={(e) =>
                setDimensionNotes((prev) => ({ ...prev, [d.code]: e.target.value }))
              }
            />
          </GuidedFormField>
        ))}

        <GuidedFormField
          label="Registro anecdótico / notas generales"
          guidance={OBSERVATION_GENERAL_NOTES_GUIDANCE}
        >
          <Textarea
            rows={4}
            value={generalNotes}
            onChange={(e) => setGeneralNotes(e.target.value)}
          />
        </GuidedFormField>

        <AssistantPanel
          studentId={studentId}
          variant="observation"
          observationContext={context}
          dimensionNotes={dimensionNotes}
          generalNotes={generalNotes}
          onMergeObservationNotes={(text) =>
            setGeneralNotes((n) => (n.trim() ? `${n.trim()}\n\n${text}` : text))
          }
        />

        <Button type="submit" fullWidth disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar observación'}
        </Button>
      </form>
      </FormGuidanceProvider>
    </>
  )
}
