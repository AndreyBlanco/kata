'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
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
import { AssistantPanel } from '@/components/capa2/assistant-panel'
import {
  emptyInterviewContent,
  INTERVIEW_FORMAT_LABELS,
  INTERVIEW_MODALITY_LABELS,
  INTERVIEW_TYPE_LABELS,
} from '@/lib/capa2-types'

const VALID_TYPES = new Set([
  'FAMILIA',
  'ESTUDIANTE',
  'DOCENTE_GRADO',
  'DOCENTE_GUIA',
  'OTRO_PROFESIONAL',
])

export default function NuevaEntrevistaPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const studentId = params.id as string

  const tipoParam = searchParams.get('tipo') ?? 'FAMILIA'
  const interviewType = VALID_TYPES.has(tipoParam)
    ? (tipoParam as InterviewType)
    : 'FAMILIA'

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [studentName, setStudentName] = useState('')

  const [conductedAt, setConductedAt] = useState('')
  const [format, setFormat] = useState<InterviewFormat>('SEMIESTRUCTURADA')
  const [modality, setModality] = useState<InterviewModality>('PRESENCIAL')
  const [participantName, setParticipantName] = useState('')
  const [consentRecorded, setConsentRecorded] = useState(false)
  const [content, setContent] = useState(emptyInterviewContent())

  const needsConsent = interviewType === 'FAMILIA' || interviewType === 'ESTUDIANTE'

  useEffect(() => {
    fetch(`/api/students/${studentId}`)
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((s) => {
        setStudentName(s.name)
        setConductedAt(new Date().toISOString().slice(0, 10))
        setLoading(false)
      })
      .catch(() => router.push(`/estudiantes/${studentId}/entrevistas`))
  }, [router, studentId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (needsConsent && !consentRecorded) {
      alert('Debe registrar el consentimiento (Ley 8968).')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/students/${studentId}/interviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewType,
          conductedAt,
          format,
          modality,
          participantName,
          consentRecorded: needsConsent ? consentRecorded : false,
          content,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Error')
      }
      const record = await res.json()
      router.push(`/estudiantes/${studentId}/entrevistas/${record.id}`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo guardar.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState message="Preparando formulario…" />

  return (
    <>
      <PageHeader
        title={`Nueva entrevista — ${INTERVIEW_TYPE_LABELS[interviewType]}`}
        subtitle={studentName}
        backHref={`/estudiantes/${studentId}/entrevistas`}
        backLabel="← Entrevistas"
      />

      <FormGuidanceProvider>
      <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-4 p-4 pb-24">
        <FormGuidanceToggle />

        <FormField label="Fecha de la entrevista" required>
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

        <FormField label="Nombre de la persona entrevistada">
          <Input value={participantName} onChange={(e) => setParticipantName(e.target.value)} />
        </FormField>

        {needsConsent && (
          <Card padding="sm">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1"
                checked={consentRecorded}
                onChange={(e) => setConsentRecorded(e.target.checked)}
              />
              <span className="text-sm text-gray-900">
                Registro con consentimiento del titular o representante legal para el tratamiento
                de datos personales (Ley 8968).
              </span>
            </label>
          </Card>
        )}

        <InterviewContentForm
          content={content}
          onChange={setContent}
          showFamilyBlock={interviewType === 'FAMILIA' || interviewType === 'ESTUDIANTE'}
        />

        <AssistantPanel
          studentId={studentId}
          variant="interview"
          interviewType={interviewType}
          interviewContent={content}
          onAppendInterviewNotes={(text) =>
            setContent((c) => ({
              ...c,
              notes: c.notes.trim() ? `${c.notes.trim()}\n\n${text}` : text,
            }))
          }
        />

        <Button type="submit" fullWidth disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar entrevista'}
        </Button>
      </form>
      </FormGuidanceProvider>
    </>
  )
}
