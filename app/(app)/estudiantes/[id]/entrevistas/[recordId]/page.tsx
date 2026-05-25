'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { InterviewFormat, InterviewModality, InterviewType } from '@prisma/client'
import { PageHeader } from '@/components/ui/page-header'
import { LoadingState } from '@/components/ui/loading-state'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { InterviewContentForm } from '@/components/capa2/interview-content-form'
import {
  FormGuidanceProvider,
  FormGuidanceToggle,
} from '@/components/capa2/form-guidance-context'
import { ApplyToViButton } from '@/components/capa2/apply-to-vi-button'
import { AssistantPanel } from '@/components/capa2/assistant-panel'
import {
  emptyInterviewContent,
  INTERVIEW_FORMAT_LABELS,
  INTERVIEW_MODALITY_LABELS,
  INTERVIEW_TYPE_LABELS,
  parseInterviewContent,
} from '@/lib/capa2-types'

export default function EditarEntrevistaPage() {
  const router = useRouter()
  const params = useParams()
  const studentId = params.id as string
  const recordId = params.recordId as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [studentName, setStudentName] = useState('')
  const [interviewType, setInterviewType] = useState<InterviewType>('FAMILIA')
  const [applied, setApplied] = useState(false)

  const [conductedAt, setConductedAt] = useState('')
  const [format, setFormat] = useState<InterviewFormat>('SEMIESTRUCTURADA')
  const [modality, setModality] = useState<InterviewModality>('PRESENCIAL')
  const [participantName, setParticipantName] = useState('')
  const [consentRecorded, setConsentRecorded] = useState(false)
  const [content, setContent] = useState(emptyInterviewContent())

  const needsConsent = interviewType === 'FAMILIA' || interviewType === 'ESTUDIANTE'

  const load = useCallback(async () => {
    const [sRes, rRes] = await Promise.all([
      fetch(`/api/students/${studentId}`),
      fetch(`/api/students/${studentId}/interviews/${recordId}`),
    ])
    if (!sRes.ok || !rRes.ok) throw new Error('no data')
    setStudentName((await sRes.json()).name)
    const r = await rRes.json()
    setInterviewType(r.interviewType)
    setApplied(!!r.appliedToAssessment)
    setConductedAt(r.conductedAt?.slice(0, 10) ?? '')
    setFormat(r.format)
    setModality(r.modality)
    setParticipantName(r.participantName ?? '')
    setConsentRecorded(!!r.consentRecorded)
    setContent(parseInterviewContent(r.content))
  }, [recordId, studentId])

  useEffect(() => {
    load()
      .catch(() => router.push(`/estudiantes/${studentId}/entrevistas`))
      .finally(() => setLoading(false))
  }, [load, router, studentId])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (needsConsent && !consentRecorded) {
      alert('Debe registrar el consentimiento (Ley 8968).')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/students/${studentId}/interviews/${recordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conductedAt,
          format,
          modality,
          participantName,
          consentRecorded,
          content,
        }),
      })
      if (!res.ok) throw new Error('Error al guardar')
      alert('Entrevista actualizada.')
    } catch {
      alert('No se pudo guardar.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Eliminar este registro de entrevista?')) return
    const res = await fetch(`/api/students/${studentId}/interviews/${recordId}`, {
      method: 'DELETE',
    })
    if (res.ok) router.push(`/estudiantes/${studentId}/entrevistas`)
    else alert('No se pudo eliminar.')
  }

  if (loading) return <LoadingState message="Cargando entrevista…" />

  return (
    <>
      <PageHeader
        title={INTERVIEW_TYPE_LABELS[interviewType]}
        subtitle={studentName}
        backHref={`/estudiantes/${studentId}/entrevistas`}
        backLabel="← Entrevistas"
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
            value={conductedAt}
            onChange={(e) => setConductedAt(e.target.value)}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Formato">
            <Select value={format} onChange={(e) => setFormat(e.target.value as InterviewFormat)}>
              {(Object.keys(INTERVIEW_FORMAT_LABELS) as InterviewFormat[]).map((k) => (
                <option key={k} value={k}>
                  {INTERVIEW_FORMAT_LABELS[k]}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Modalidad">
            <Select
              value={modality}
              onChange={(e) => setModality(e.target.value as InterviewModality)}
            >
              {(Object.keys(INTERVIEW_MODALITY_LABELS) as InterviewModality[]).map((k) => (
                <option key={k} value={k}>
                  {INTERVIEW_MODALITY_LABELS[k]}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <FormField label="Nombre entrevistado">
          <Input value={participantName} onChange={(e) => setParticipantName(e.target.value)} />
        </FormField>

        {needsConsent && (
          <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-3">
            <input
              type="checkbox"
              className="mt-1"
              checked={consentRecorded}
              onChange={(e) => setConsentRecorded(e.target.checked)}
            />
            <span className="text-sm">Consentimiento Ley 8968 registrado</span>
          </label>
        )}

        <InterviewContentForm content={content} onChange={setContent} />

        <AssistantPanel
          studentId={studentId}
          variant="interview"
          interviewType={interviewType}
          interviewContent={content}
          recordId={recordId}
          onAppendInterviewNotes={(text) =>
            setContent((c) => ({
              ...c,
              notes: c.notes.trim() ? `${c.notes.trim()}\n\n${text}` : text,
            }))
          }
        />

        <Button type="submit" fullWidth disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </Button>

        <ApplyToViButton
          applyUrl={`/api/students/${studentId}/interviews/${recordId}/apply-to-assessment`}
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
