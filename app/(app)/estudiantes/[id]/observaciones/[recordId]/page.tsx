'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { ObservationContext } from '@prisma/client'
import { PageHeader } from '@/components/ui/page-header'
import { LoadingState } from '@/components/ui/loading-state'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ApplyToViButton } from '@/components/capa2/apply-to-vi-button'
import { AssistantPanel } from '@/components/capa2/assistant-panel'
import { GuidedFormField } from '@/components/capa2/guided-form-field'
import {
  FormGuidanceProvider,
  FormGuidanceToggle,
} from '@/components/capa2/form-guidance-context'
import { OBSERVATION_CONTEXT_LABELS, parseDimensionNotes } from '@/lib/capa2-types'
import {
  OBSERVATION_DIMENSION_EXTRA,
  OBSERVATION_GENERAL_NOTES_GUIDANCE,
  observationGuidanceForDimension,
} from '@/lib/field-guidance'

type DimensionItem = {
  code: string
  label: string
  guideText: string | null
}

export default function EditarObservacionPage() {
  const router = useRouter()
  const params = useParams()
  const studentId = params.id as string
  const recordId = params.recordId as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [studentName, setStudentName] = useState('')
  const [context, setContext] = useState<ObservationContext>('AULA')
  const [applied, setApplied] = useState(false)
  const [dimensions, setDimensions] = useState<DimensionItem[]>([])

  const [observedAt, setObservedAt] = useState('')
  const [subjectOrSpace, setSubjectOrSpace] = useState('')
  const [dimensionNotes, setDimensionNotes] = useState<Record<string, string>>({})
  const [generalNotes, setGeneralNotes] = useState('')

  const load = useCallback(async () => {
    const [sRes, rRes] = await Promise.all([
      fetch(`/api/students/${studentId}`),
      fetch(`/api/students/${studentId}/observations/${recordId}`),
    ])
    if (!sRes.ok || !rRes.ok) throw new Error('no data')
    setStudentName((await sRes.json()).name)
    const r = await rRes.json()
    setContext(r.context)
    setApplied(!!r.appliedToAssessment)
    setObservedAt(r.observedAt?.slice(0, 10) ?? '')
    setSubjectOrSpace(r.subjectOrSpace ?? '')
    setGeneralNotes(r.generalNotes ?? '')
    const notes = parseDimensionNotes(r.dimensionNotes)

    const dimFilter = r.context === 'AULA' ? 'aula' : 'institucional'
    const dRes = await fetch(`/api/catalogs/context-dimensions?dimension=${dimFilter}`)
    if (dRes.ok) {
      const items = (await dRes.json()) as DimensionItem[]
      setDimensions(items)
      const merged: Record<string, string> = {}
      for (const d of items) merged[d.code] = notes[d.code] ?? ''
      setDimensionNotes(merged)
    } else {
      setDimensionNotes(notes)
    }
  }, [recordId, studentId])

  useEffect(() => {
    load()
      .catch(() => router.push(`/estudiantes/${studentId}/observaciones`))
      .finally(() => setLoading(false))
  }, [load, router, studentId])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/students/${studentId}/observations/${recordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          observedAt,
          subjectOrSpace,
          dimensionNotes,
          generalNotes,
        }),
      })
      if (!res.ok) throw new Error('Error')
      alert('Observación actualizada.')
    } catch {
      alert('No se pudo guardar.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Eliminar esta observación?')) return
    const res = await fetch(`/api/students/${studentId}/observations/${recordId}`, {
      method: 'DELETE',
    })
    if (res.ok) router.push(`/estudiantes/${studentId}/observaciones`)
    else alert('No se pudo eliminar.')
  }

  if (loading) return <LoadingState message="Cargando observación…" />

  return (
    <>
      <PageHeader
        title={OBSERVATION_CONTEXT_LABELS[context]}
        subtitle={studentName}
        backHref={`/estudiantes/${studentId}/observaciones`}
        backLabel="← Observaciones"
      />

      <FormGuidanceProvider>
      <form onSubmit={handleSave} className="mx-auto max-w-lg space-y-4 p-4 pb-32">
        <FormGuidanceToggle />

        {applied && (
          <Card padding="sm">
            <p className="text-xs text-kata-primary-dark">Ya se aplicó un borrador a la VI.</p>
          </Card>
        )}

        <FormField label="Fecha" required>
          <Input
            type="date"
            required
            value={observedAt}
            onChange={(e) => setObservedAt(e.target.value)}
          />
        </FormField>

        <FormField label="Asignatura o espacio">
          <Input value={subjectOrSpace} onChange={(e) => setSubjectOrSpace(e.target.value)} />
        </FormField>

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
          label="Notas generales"
          guidance={OBSERVATION_GENERAL_NOTES_GUIDANCE}
        >
          <Textarea rows={4} value={generalNotes} onChange={(e) => setGeneralNotes(e.target.value)} />
        </GuidedFormField>

        <AssistantPanel
          studentId={studentId}
          variant="observation"
          observationContext={context}
          dimensionNotes={dimensionNotes}
          generalNotes={generalNotes}
          recordId={recordId}
          onMergeObservationNotes={(text) =>
            setGeneralNotes((n) => (n.trim() ? `${n.trim()}\n\n${text}` : text))
          }
        />

        <Button type="submit" fullWidth disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </Button>

        <ApplyToViButton
          applyUrl={`/api/students/${studentId}/observations/${recordId}/apply-to-assessment`}
          onApplied={() => {
            setApplied(true)
            load()
          }}
        />

        <Button type="button" variant="ghost" fullWidth onClick={() => router.push(`/estudiantes/${studentId}/valoracion`)}>
          Abrir valoración integral
        </Button>

        <Button type="button" variant="danger" fullWidth onClick={handleDelete}>
          Eliminar registro
        </Button>
      </form>
      </FormGuidanceProvider>
    </>
  )
}
