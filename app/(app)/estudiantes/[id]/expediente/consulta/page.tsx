'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PageHeader } from '@/components/ui/page-header'
import { LoadingState } from '@/components/ui/loading-state'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export default function ExpedienteConsultaPage() {
  const router = useRouter()
  const params = useParams()
  const studentId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [studentName, setStudentName] = useState('')

  const [consultedAt, setConsultedAt] = useState('')
  const [expedienteReviewed, setExpedienteReviewed] = useState(false)
  const [documentsReviewed, setDocumentsReviewed] = useState('')
  const [familyProvidedDocs, setFamilyProvidedDocs] = useState('')
  const [notes, setNotes] = useState('')

  const load = useCallback(async () => {
    const [sRes, cRes] = await Promise.all([
      fetch(`/api/students/${studentId}`),
      fetch(`/api/students/${studentId}/expediente-consultation`),
    ])
    if (!sRes.ok) throw new Error('no student')
    const s = await sRes.json()
    setStudentName(s.name)

    if (cRes.ok) {
      const { record } = await cRes.json()
      if (record) {
        setConsultedAt(record.consultedAt?.slice(0, 10) ?? '')
        setExpedienteReviewed(!!record.expedienteReviewed)
        setDocumentsReviewed(record.documentsReviewed ?? '')
        setFamilyProvidedDocs(record.familyProvidedDocs ?? '')
        setNotes(record.notes ?? '')
      } else {
        setConsultedAt(new Date().toISOString().slice(0, 10))
      }
    }
  }, [studentId])

  useEffect(() => {
    load()
      .catch(() => router.push(`/estudiantes/${studentId}/expediente`))
      .finally(() => setLoading(false))
  }, [load, router, studentId])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/students/${studentId}/expediente-consultation`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultedAt: consultedAt || new Date().toISOString(),
          expedienteReviewed,
          documentsReviewed,
          familyProvidedDocs,
          notes,
        }),
      })
      if (!res.ok) throw new Error('Error al guardar')
      router.push(`/estudiantes/${studentId}/expediente`)
    } catch {
      alert('No se pudo guardar. Intente de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState message="Cargando…" />

  return (
    <>
      <PageHeader
        title="Consulta expediente único"
        subtitle={studentName}
        backHref={`/estudiantes/${studentId}/expediente`}
        backLabel="← Expediente"
      />

      <form onSubmit={handleSave} className="mx-auto max-w-lg space-y-4 p-4">
        <Card padding="sm">
          <p className="text-xs text-gray-600">
            Acción MEP 1.6: documente que revisó el expediente único del proceso educativo en el
            centro. Katà no sustituye ese expediente institucional.
          </p>
        </Card>

        <FormField label="Fecha de consulta" htmlFor="consultedAt" required>
          <Input
            id="consultedAt"
            type="date"
            required
            value={consultedAt}
            onChange={(e) => setConsultedAt(e.target.value)}
          />
        </FormField>

        <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-3">
          <input
            type="checkbox"
            className="mt-1"
            checked={expedienteReviewed}
            onChange={(e) => setExpedienteReviewed(e.target.checked)}
          />
          <span className="text-sm text-gray-900">
            Confirmo que consulté el expediente único del estudiante en el centro educativo
          </span>
        </label>

        <FormField
          label="Documentos e informes previos revisados"
          hint="Historia educativa, informes de otros profesionales (opcionales, no exigidos para el servicio)."
        >
          <Textarea
            rows={4}
            value={documentsReviewed}
            onChange={(e) => setDocumentsReviewed(e.target.value)}
          />
        </FormField>

        <FormField label="Documentos aportados por la familia (opcional)">
          <Textarea
            rows={2}
            value={familyProvidedDocs}
            onChange={(e) => setFamilyProvidedDocs(e.target.value)}
          />
        </FormField>

        <FormField label="Notas">
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </FormField>

        <Button type="submit" fullWidth disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar consulta'}
        </Button>
      </form>
    </>
  )
}
