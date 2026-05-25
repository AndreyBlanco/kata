'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/page-header'
import { LoadingState } from '@/components/ui/loading-state'

interface DocRow {
  id: string
  type: string
  title: string
  schoolYear: number
  originalFileName: string | null
  fileSizeBytes: number | null
  status: 'UPLOADED' | 'PROCESSING' | 'PROCESSED' | 'ERROR'
  aiProvider: string | null
  aiModel: string | null
  aiSummary: string | null
  aiError: string | null
  aiGenerated: boolean
  uploadedAt: string
  processedAt: string | null
  counts: { objectives: number; activities: number; axes: number }
}

interface SchoolPeriod {
  id: string
  schoolYear: number
  label: string
}

const STATUS_TONE: Record<DocRow['status'], string> = {
  UPLOADED: 'bg-gray-100 text-gray-700',
  PROCESSING: 'bg-blue-100 text-blue-800',
  PROCESSED: 'bg-emerald-100 text-emerald-800',
  ERROR: 'bg-rose-100 text-rose-800',
}

const STATUS_LABEL: Record<DocRow['status'], string> = {
  UPLOADED: 'Subido',
  PROCESSING: 'Procesando',
  PROCESSED: 'Procesado',
  ERROR: 'Con error',
}

export default function DocumentosInstitucionalesPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [docs, setDocs] = useState<DocRow[]>([])
  const [loading, setLoading] = useState(true)
  const [yearOptions, setYearOptions] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const [title, setTitle] = useState('')
  const [schoolYear, setSchoolYear] = useState<number | ''>('')
  const [file, setFile] = useState<File | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])

  const reload = useCallback(async () => {
    const [docsRes, periodsRes] = await Promise.all([
      fetch('/api/institutional-documents'),
      fetch('/api/school-periods'),
    ])
    if (docsRes.ok) {
      const d = await docsRes.json()
      setDocs(d.documents)
    }
    if (periodsRes.ok) {
      const p = await periodsRes.json()
      const years = Array.from(
        new Set((p.periods as SchoolPeriod[]).map((per) => per.schoolYear)),
      ).sort((a, b) => b - a)
      setYearOptions(years)
      if (years.length > 0 && schoolYear === '') {
        setSchoolYear(p.activeSchoolYear ?? years[0])
      }
    }
  }, [schoolYear])

  useEffect(() => {
    reload().finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setWarnings([])

    if (!file) {
      setError('Seleccioná un archivo PDF o Word.')
      return
    }
    if (!title.trim()) {
      setError('Escribí un título para el documento.')
      return
    }
    if (typeof schoolYear !== 'number') {
      setError('Seleccioná el año lectivo.')
      return
    }

    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('title', title.trim())
      fd.append('schoolYear', String(schoolYear))
      fd.append('type', 'PLAN_ACCION_ANUAL')

      const res = await fetch('/api/institutional-documents', {
        method: 'POST',
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error al subir el documento.')
        return
      }
      setWarnings(data.warnings ?? [])
      setTitle('')
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      await reload()
      if (data.id) router.push(`/planificacion/documentos/${data.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al subir el documento.')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este documento? No se puede deshacer.')) return
    const res = await fetch(`/api/institutional-documents/${id}`, { method: 'DELETE' })
    if (res.ok) await reload()
  }

  async function handleReprocess(id: string) {
    if (!confirm('¿Reprocesar este documento con la IA?')) return
    const res = await fetch(`/api/institutional-documents/${id}/reprocess`, { method: 'POST' })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error || 'Error al reprocesar.')
      return
    }
    await reload()
  }

  if (loading) return <LoadingState message="Cargando documentos institucionales…" />

  return (
    <>
      <PageHeader
        title="Documentos institucionales"
        subtitle="Plan de Acción Anual (Anexo 2)"
        backHref="/planificacion"
      />
      <div className="mx-auto max-w-3xl space-y-4 p-4">
        <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3 text-xs text-blue-900">
          <p>
            Subí el <strong>Plan de Acción Anual</strong> elaborado por los servicios de apoyo de tu centro.
            Katà extraerá los objetivos, actividades y cronograma con ayuda de IA para que estén disponibles
            cuando planifiques tus acciones mensuales.
          </p>
          <p className="mt-1 text-[11px] text-blue-700/80">
            Tipos permitidos: PDF o Word (.docx) · Tamaño máximo: 5 MB · El archivo no se conserva, sólo el texto extraído.
          </p>
        </div>

        <form
          onSubmit={handleUpload}
          className="space-y-3 rounded-xl border bg-white p-4"
        >
          <h2 className="text-sm font-semibold text-gray-900">Cargar nuevo documento</h2>

          <div>
            <label className="block text-[11px] font-medium text-gray-600">
              Título del documento
            </label>
            <input
              type="text"
              className="mt-1 w-full rounded border-gray-300 px-2 py-1.5 text-sm"
              placeholder="Ej. Plan de acción anual 2026 — Escuela San José"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={uploading}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-600">Año lectivo</label>
              <select
                className="mt-1 w-full rounded border-gray-300 px-2 py-1.5 text-sm"
                value={schoolYear}
                onChange={(e) => setSchoolYear(Number.parseInt(e.target.value, 10) || '')}
                disabled={uploading}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-600">Tipo</label>
              <input
                type="text"
                className="mt-1 w-full rounded border-gray-300 bg-gray-50 px-2 py-1.5 text-sm text-gray-500"
                value="Plan de Acción Anual (Anexo 2)"
                disabled
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-600">
              Archivo (PDF o DOCX, máx. 5 MB)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              disabled={uploading}
            />
            {file && (
              <p className="mt-1 text-[11px] text-gray-500">
                {file.name} · {(file.size / 1024).toFixed(1)} KB
              </p>
            )}
          </div>

          {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
          {warnings.length > 0 && (
            <ul className="space-y-0.5 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {warnings.map((w, i) => (
                <li key={i}>⚠ {w}</li>
              ))}
            </ul>
          )}

          <button
            type="submit"
            disabled={uploading || !file || !title.trim()}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading
              ? 'Procesando… (puede tardar hasta 30s)'
              : 'Subir y procesar con IA'}
          </button>
        </form>

        <div>
          <h2 className="mb-2 text-sm font-semibold text-gray-900">Documentos cargados</h2>
          {docs.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-xs text-gray-500">
              Aún no has subido ningún documento institucional.
            </p>
          ) : (
            <ul className="space-y-2">
              {docs.map((d) => (
                <li key={d.id} className="rounded-xl border bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <Link href={`/planificacion/documentos/${d.id}`} className="block">
                        <p className="truncate text-sm font-medium text-gray-900 hover:text-blue-700">
                          {d.title}
                        </p>
                      </Link>
                      <p className="text-[11px] text-gray-500">
                        {d.schoolYear}
                        {d.aiGenerated ? (
                          <> · <span className="font-medium text-indigo-700">⚙ Generado por Katà</span></>
                        ) : (
                          <>
                            {d.originalFileName ? ` · ${d.originalFileName}` : ''}
                            {d.fileSizeBytes ? ` · ${(d.fileSizeBytes / 1024).toFixed(1)} KB` : ''}
                          </>
                        )}
                      </p>
                      {d.status === 'PROCESSED' && d.aiSummary && (
                        <p className="mt-1 line-clamp-2 text-[11px] text-gray-600">{d.aiSummary}</p>
                      )}
                      {d.status === 'ERROR' && d.aiError && (
                        <p className="mt-1 line-clamp-2 text-[11px] text-rose-700">⚠ {d.aiError}</p>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-gray-500">
                        <span className={`rounded-full px-2 py-0.5 ${STATUS_TONE[d.status]}`}>
                          {STATUS_LABEL[d.status]}
                        </span>
                        <span>
                          {d.counts.objectives} obj · {d.counts.activities} act
                        </span>
                        {d.aiProvider && (
                          <span className="text-gray-400">
                            IA: {d.aiProvider}{d.aiModel ? ` · ${d.aiModel}` : ''}
                          </span>
                        )}
                        {d.processedAt && (
                          <span className="text-gray-400">
                            {new Date(d.processedAt).toLocaleString('es-CR')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleReprocess(d.id)}
                        className="rounded-md border border-gray-300 px-2 py-1 text-[11px] text-gray-700 hover:bg-gray-50"
                      >
                        Reprocesar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(d.id)}
                        className="rounded-md border border-rose-200 px-2 py-1 text-[11px] text-rose-700 hover:bg-rose-50"
                      >
                        Borrar
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}
