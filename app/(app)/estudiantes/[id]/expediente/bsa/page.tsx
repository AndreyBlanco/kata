'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PageHeader } from '@/components/ui/page-header'
import { LoadingState } from '@/components/ui/loading-state'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { SectionCard } from '@/components/ui/section-card'
import {
  BSA_SERVICE_CODES,
  BSA_SERVICE_LABELS,
  type BsaServiceCode,
  type StudentBsaFields,
  checkBsaExportReadiness,
  emptyStudentBsaFields,
} from '@/lib/bsa-types'

type BsaPayload = {
  fields: StudentBsaFields
  sourceFileName: string | null
  uploadedAt: string | null
  updatedAt: string
}

export default function BsaEditPage() {
  const router = useRouter()
  const params = useParams()
  const studentId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  const [meta, setMeta] = useState<{ sourceFileName: string | null; uploadedAt: string | null }>({
    sourceFileName: null,
    uploadedAt: null,
  })
  const [fields, setFields] = useState<StudentBsaFields>(emptyStudentBsaFields())
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set(['institution', 'student', 'request', 'resolution']),
  )

  const exportReadiness = useMemo(() => checkBsaExportReadiness(fields), [fields])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/students/${studentId}/bsa`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'No se pudo cargar la BSA')
      }
      const data: BsaPayload = await res.json()
      setFields(data.fields)
      setMeta({
        sourceFileName: data.sourceFileName,
        uploadedAt: data.uploadedAt,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }, [studentId])

  useEffect(() => {
    void load()
  }, [load])

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveMsg(null)
    setError(null)
    try {
      const res = await fetch(`/api/students/${studentId}/bsa`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar')
      setFields(data.fields)
      setSaveMsg('Cambios guardados')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleExport = async (force = false) => {
    setExporting(true)
    setError(null)
    try {
      const url = force
        ? `/api/students/${studentId}/bsa/export?force=1`
        : `/api/students/${studentId}/bsa/export`
      const res = await fetch(url)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'No se pudo exportar')
      }
      const blob = await res.blob()
      const dispo = res.headers.get('Content-Disposition') ?? ''
      const match = dispo.match(/filename="([^"]+)"/)
      const filename = match?.[1] ?? 'bsa.docx'
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = filename
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al exportar')
    } finally {
      setExporting(false)
    }
  }

  const setInstitution = (key: keyof StudentBsaFields['institution'], value: string) => {
    setFields((f) => ({
      ...f,
      institution: { ...f.institution, [key]: value },
    }))
  }

  const setStudentField = (key: keyof StudentBsaFields['student'], value: string) => {
    setFields((f) => ({
      ...f,
      student: { ...f.student, [key]: value },
    }))
  }

  const setRequest = (key: keyof StudentBsaFields['request'], value: string) => {
    setFields((f) => ({
      ...f,
      request: { ...f.request, [key]: value },
    }))
  }

  const toggleService = (code: BsaServiceCode) => {
    setFields((f) => ({
      ...f,
      request: {
        ...f.request,
        servicesRequested: {
          ...f.request.servicesRequested,
          [code]: !f.request.servicesRequested[code],
        },
      },
    }))
  }

  const setResolution = (key: keyof StudentBsaFields['resolution'], value: string | string[]) => {
    setFields((f) => ({
      ...f,
      resolution: { ...f.resolution, [key]: value },
    }))
  }

  const setViDate = (index: number, value: string) => {
    setFields((f) => {
      const dates = [...f.resolution.viSessionDates]
      dates[index] = value
      return {
        ...f,
        resolution: { ...f.resolution, viSessionDates: dates },
      }
    })
  }

  const addViDate = () => {
    setFields((f) => ({
      ...f,
      resolution: {
        ...f.resolution,
        viSessionDates: [...f.resolution.viSessionDates, ''],
      },
    }))
  }

  const removeViDate = (index: number) => {
    setFields((f) => {
      const dates = f.resolution.viSessionDates.filter((_, i) => i !== index)
      return {
        ...f,
        resolution: {
          ...f.resolution,
          viSessionDates: dates.length > 0 ? dates : [''],
        },
      }
    })
  }

  if (loading) {
    return <LoadingState message="Cargando boleta BSA…" />
  }

  if (error && !fields.student.fullName) {
    return (
      <div className="mx-auto max-w-lg p-4">
        <PageHeader
          title="Boleta BSA"
          backHref={`/estudiantes/${studentId}/expediente`}
          backLabel="← Expediente"
        />
        <Card className="mt-4 border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-900">{error}</p>
          <p className="mt-2 text-xs text-amber-800">
            La BSA se registra al crear el estudiante subiendo el .docx en Nuevo estudiante.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title="Boleta BSA"
        subtitle="Archivo canónico para imprimir la resolución del servicio"
        backHref={`/estudiantes/${studentId}/expediente`}
        backLabel="← Expediente"
      >
        <Badge tone={exportReadiness.ready ? 'primary' : 'warning'}>
          {exportReadiness.ready ? 'Lista para imprimir' : 'Resolución pendiente'}
        </Badge>
      </PageHeader>

      <div className="mx-auto max-w-lg space-y-4 p-4 pb-28">
        {meta.sourceFileName && (
          <Card padding="sm">
            <p className="text-xs text-gray-500">Origen</p>
            <p className="text-sm text-gray-800">{meta.sourceFileName}</p>
            {meta.uploadedAt && (
              <p className="mt-1 text-xs text-gray-500">
                Subida: {new Date(meta.uploadedAt).toLocaleDateString('es-CR')}
              </p>
            )}
          </Card>
        )}

        {!exportReadiness.ready && (
          <Card className="border-amber-200 bg-amber-50" padding="sm">
            <p className="text-xs font-medium text-amber-900">Pendiente para exportar</p>
            <ul className="mt-1 list-inside list-disc text-xs text-amber-800">
              {exportReadiness.missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </Card>
        )}

        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Bloque A — Referencia del docente de grado
        </p>

        <SectionCard
          title="1. Institución educativa"
          hasContent={!!fields.institution.centerName.trim()}
          isOpen={openSections.has('institution')}
          onToggle={() => toggleSection('institution')}
        >
          <div className="space-y-3">
            <FormField label="Centro educativo" htmlFor="bsa-center">
              <Input
                id="bsa-center"
                value={fields.institution.centerName}
                onChange={(e) => setInstitution('centerName', e.target.value)}
              />
            </FormField>
            <FormField label="Circuito" htmlFor="bsa-circuit">
              <Input
                id="bsa-circuit"
                value={fields.institution.circuit}
                onChange={(e) => setInstitution('circuit', e.target.value)}
              />
            </FormField>
            <FormField label="Código presupuestario" htmlFor="bsa-budget">
              <Input
                id="bsa-budget"
                value={fields.institution.budgetCode}
                onChange={(e) => setInstitution('budgetCode', e.target.value)}
              />
            </FormField>
            <FormField label="Director(a)" htmlFor="bsa-director">
              <Input
                id="bsa-director"
                value={fields.institution.directorName}
                onChange={(e) => setInstitution('directorName', e.target.value)}
              />
            </FormField>
            <FormField label="Fecha confección referencia" htmlFor="bsa-ref-date">
              <Input
                id="bsa-ref-date"
                type="date"
                value={fields.institution.referenceDate}
                onChange={(e) => setInstitution('referenceDate', e.target.value)}
              />
            </FormField>
          </div>
        </SectionCard>

        <SectionCard
          title="2. Datos del estudiante"
          hasContent={!!fields.student.fullName.trim()}
          isOpen={openSections.has('student')}
          onToggle={() => toggleSection('student')}
        >
          <div className="space-y-3">
            <FormField label="Nombre completo" htmlFor="bsa-name">
              <Input
                id="bsa-name"
                value={fields.student.fullName}
                onChange={(e) => setStudentField('fullName', e.target.value)}
              />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Fecha nacimiento" htmlFor="bsa-birth">
                <Input
                  id="bsa-birth"
                  type="date"
                  value={fields.student.birthDate}
                  onChange={(e) => setStudentField('birthDate', e.target.value)}
                />
              </FormField>
              <FormField label="Edad (como en BSA)" htmlFor="bsa-age">
                <Input
                  id="bsa-age"
                  value={fields.student.ageAsWritten}
                  onChange={(e) => setStudentField('ageAsWritten', e.target.value)}
                />
              </FormField>
            </div>
            <FormField label="Identificación" htmlFor="bsa-cedula">
              <Input
                id="bsa-cedula"
                value={fields.student.cedula}
                onChange={(e) => setStudentField('cedula', e.target.value)}
              />
            </FormField>
            <FormField label="Encargado legal" htmlFor="bsa-guardian">
              <Input
                id="bsa-guardian"
                value={fields.student.legalGuardian}
                onChange={(e) => setStudentField('legalGuardian', e.target.value)}
              />
            </FormField>
            <FormField label="Teléfono contacto" htmlFor="bsa-phone">
              <Input
                id="bsa-phone"
                value={fields.student.contactPhone}
                onChange={(e) => setStudentField('contactPhone', e.target.value)}
              />
            </FormField>
            <FormField label="Lugar de residencia" htmlFor="bsa-residence">
              <Textarea
                id="bsa-residence"
                rows={2}
                value={fields.student.residence}
                onChange={(e) => setStudentField('residence', e.target.value)}
              />
            </FormField>
            <FormField label="Docente que refiere" htmlFor="bsa-referring">
              <Input
                id="bsa-referring"
                value={fields.student.referringTeacher}
                onChange={(e) => setStudentField('referringTeacher', e.target.value)}
              />
            </FormField>
            <FormField label="Grado que cursa" htmlFor="bsa-grade">
              <Input
                id="bsa-grade"
                value={fields.student.grade}
                onChange={(e) => setStudentField('grade', e.target.value)}
              />
            </FormField>
          </div>
        </SectionCard>

        <SectionCard
          title="3–5. Solicitud de apoyo"
          hasContent={
            !!fields.request.educationalSituations.trim() ||
            BSA_SERVICE_CODES.some((c) => fields.request.servicesRequested[c])
          }
          isOpen={openSections.has('request')}
          onToggle={() => toggleSection('request')}
        >
          <div className="space-y-3">
            <FormField label="Situaciones educativas" htmlFor="bsa-situations">
              <Textarea
                id="bsa-situations"
                rows={5}
                value={fields.request.educationalSituations}
                onChange={(e) => setRequest('educationalSituations', e.target.value)}
              />
            </FormField>
            <FormField label="Horario del estudiante" htmlFor="bsa-schedule">
              <Textarea
                id="bsa-schedule"
                rows={3}
                value={fields.request.studentSchedule}
                onChange={(e) => setRequest('studentSchedule', e.target.value)}
              />
            </FormField>
            <div>
              <p className="mb-2 text-sm font-medium text-gray-900">Servicios solicitados</p>
              <div className="space-y-2">
                {BSA_SERVICE_CODES.map((code) => (
                  <label
                    key={code}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 px-3 py-2"
                  >
                    <input
                      type="checkbox"
                      checked={fields.request.servicesRequested[code]}
                      onChange={() => toggleService(code)}
                      className="h-4 w-4 rounded border-gray-300 text-kata-primary focus:ring-kata-primary"
                    />
                    <span className="text-sm text-gray-800">{BSA_SERVICE_LABELS[code]}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>

        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Bloque B — Resolución del docente PA
        </p>

        <SectionCard
          title="Determinación y fechas VI"
          hasContent={
            !!fields.resolution.supportDetermination.trim() ||
            fields.resolution.viSessionDates.some((d) => d.trim().length > 0)
          }
          isOpen={openSections.has('resolution')}
          onToggle={() => toggleSection('resolution')}
          badge={
            exportReadiness.ready ? (
              <Badge tone="primary">Completo</Badge>
            ) : (
              <Badge tone="warning">Pendiente</Badge>
            )
          }
        >
          <div className="space-y-3">
            <FormField
              label="Determinación del apoyo educativo por brindar"
              htmlFor="bsa-determination"
              required
            >
              <Textarea
                id="bsa-determination"
                rows={5}
                value={fields.resolution.supportDetermination}
                onChange={(e) => setResolution('supportDetermination', e.target.value)}
              />
            </FormField>

            <div>
              <p className="mb-2 text-sm font-medium text-gray-900">
                Fechas de Valoración Integral
              </p>
              <div className="space-y-2">
                {fields.resolution.viSessionDates.map((date, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setViDate(index, e.target.value)}
                      aria-label={`Fecha VI ${index + 1}`}
                    />
                    {fields.resolution.viSessionDates.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => removeViDate(index)}
                      >
                        Quitar
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button type="button" variant="secondary" className="mt-2" onClick={addViDate}>
                + Agregar fecha
              </Button>
            </div>

            <FormField
              label="Consignación de la forma en que se brindará el servicio"
              htmlFor="bsa-provision"
            >
              <Textarea
                id="bsa-provision"
                rows={4}
                value={fields.resolution.serviceProvisionNotes}
                onChange={(e) => setResolution('serviceProvisionNotes', e.target.value)}
              />
            </FormField>
          </div>
        </SectionCard>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saveMsg && <p className="text-sm text-emerald-700">{saveMsg}</p>}
      </div>

      <div className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-40 border-t border-gray-200 bg-white p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        <div className="mx-auto flex max-w-lg gap-2">
          <Button
            type="button"
            variant="secondary"
            fullWidth
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
          <Button
            type="button"
            fullWidth
            disabled={exporting || !exportReadiness.ready}
            onClick={() => void handleExport(false)}
          >
            {exporting ? 'Exportando…' : 'Exportar .docx'}
          </Button>
        </div>
      </div>
    </>
  )
}
