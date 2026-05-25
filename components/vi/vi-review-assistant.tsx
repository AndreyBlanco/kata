'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { SectionCard } from '@/components/ui/section-card'
import { Button } from '@/components/ui/button'
import type { Capa2Checklist, ServiceIntakeType, ViFieldSnapshot } from '@/lib/vi-completeness'
import type { AssistantChatResponse } from '@/lib/assistant/types'

type Props = {
  studentId: string
  viFields: ViFieldSnapshot
  capa2Checklist: Capa2Checklist
  intakeType: ServiceIntakeType | null
  disabled?: boolean
}

export function ViReviewAssistant({
  studentId,
  viFields,
  capa2Checklist,
  intakeType,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<AssistantChatResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<{ configured: boolean; provider?: string; model?: string } | null>(
    null,
  )

  useEffect(() => {
    fetch('/api/assistant/chat')
      .then((r) => r.json())
      .then((d) =>
        setStatus({
          configured: !!d.configured,
          provider: d.provider,
          model: d.model,
        }),
      )
      .catch(() => setStatus({ configured: false }))
  }, [])

  const runReview = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'review_vi',
          studentId,
          context: {
            viFields,
            capa2Checklist,
            intakeType,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error en revisión')
      setResponse(data)
      setOpen(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo ejecutar la revisión')
    } finally {
      setLoading(false)
    }
  }, [studentId, viFields, capa2Checklist, intakeType])

  const sourceLabel =
    response?.source === 'local'
      ? 'Modo local'
      : response?.model
        ? `${response.provider ?? 'IA'} · ${response.model}`
        : status?.configured
          ? `${status.provider ?? 'IA'} · ${status.model ?? 'listo'}`
          : 'Sin API key — modo local'

  return (
    <SectionCard
      title="Revisión pre-cierre (IA v1.5)"
      hasContent={!!response}
      isOpen={open}
      onToggle={() => setOpen((v) => !v)}
    >
      <p className="mb-3 text-xs text-gray-500">
        Detecta secciones vacías e inconsistencias entre Capa 2 y la VI antes de finalizar. No
        sustituye su criterio profesional.
      </p>
      <p className="mb-3 text-[10px] text-gray-400">{sourceLabel}</p>
      <Button
        type="button"
        className="px-3 py-1.5 text-xs"
        disabled={disabled || loading}
        onClick={runReview}
      >
        {loading ? 'Revisando...' : 'Ejecutar revisión de la VI'}
      </Button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {response?.text && (
        <div className="prose prose-sm mt-3 max-w-none whitespace-pre-wrap text-xs text-gray-800">
          {response.text}
        </div>
      )}
    </SectionCard>
  )
}
