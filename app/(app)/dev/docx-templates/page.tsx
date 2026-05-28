'use client'

import { useCallback, useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { SectionCard } from '@/components/ui/section-card'
import { Button } from '@/components/ui/button'

type ManifestStats = {
  greenRunsFound: number
  greenRunsReplaced: number
  skipped: number
  warnings: string[]
}

type Manifest = {
  id: string
  templateVersion: string
  stats: ManifestStats
}

export default function DevDocxTemplatesPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ outputDocx: string; manifest: Manifest } | null>(null)
  const [existing, setExisting] = useState<{ templateExists: boolean; manifest: Manifest | null } | null>(
    null,
  )

  const loadStatus = useCallback(async () => {
    const res = await fetch('/api/dev/docx-templates')
    if (res.ok) setExisting(await res.json())
  }, [])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const form = new FormData()
      form.set('documentType', 'BSA')
      form.set('templateVersion', '2026')
      if (file) form.set('file', file)

      const res = await fetch('/api/dev/docx-templates', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al generar plantilla')

      setResult(data)
      await loadStatus()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  if (process.env.NODE_ENV === 'production') {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-600">Herramienta no disponible en producción.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 pb-24">
      <PageHeader
        title="Plantillas DOCX (dev)"
        subtitle="Fase B — generar templates/bsa-2026.docx desde BSA anotada en verde"
      />

      <SectionCard
        title="Estado actual"
        hasContent={!!existing?.templateExists}
        isOpen
        onToggle={() => {}}
      >
        <p className="text-sm text-gray-700">
          Plantilla:{' '}
          <strong>{existing?.templateExists ? 'templates/bsa-2026.docx ✓' : 'no generada'}</strong>
        </p>
        {existing?.manifest && (
          <p className="mt-1 text-xs text-gray-500">
            Última generación: {existing.manifest.stats.greenRunsReplaced} campos ·{' '}
            {existing.manifest.stats.warnings.length} advertencias
          </p>
        )}
      </SectionCard>

      <SectionCard title="Generar plantilla BSA 2026" hasContent isOpen onToggle={() => {}}>
        <p className="mb-4 text-sm text-gray-600">
          Suba un DOCX con campos editables en verde (#00B050). Si no sube archivo, se usa{' '}
          <code className="text-xs">miscelaneos/BSA-2026.docx</code>.
        </p>

        <input
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mb-4 block w-full text-sm text-gray-700"
        />

        <Button type="button" onClick={handleGenerate} disabled={loading}>
          {loading ? 'Generando…' : 'Generar plantilla'}
        </Button>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        {result && (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">
            <p>
              ✓ <strong>{result.outputDocx}</strong> generado
            </p>
            <p className="mt-1">
              {result.manifest.stats.greenRunsReplaced} reemplazos · {result.manifest.stats.skipped}{' '}
              omitidos
            </p>
            {result.manifest.stats.warnings.length > 0 && (
              <ul className="mt-2 list-inside list-disc text-xs">
                {result.manifest.stats.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </SectionCard>

      <p className="text-xs text-gray-400">
        CLI equivalente: <code>npm run docx:template</code>
      </p>
    </div>
  )
}
