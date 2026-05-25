'use client'

import { useCallback, useEffect, useState } from 'react'
import type { InterviewType, ObservationContext } from '@prisma/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { InterviewContent } from '@/lib/capa2-types'
import type { AssistantChatResponse } from '@/lib/assistant/types'

type Props = {
  studentId: string
  variant: 'interview' | 'observation'
  interviewType?: InterviewType
  interviewContent?: InterviewContent
  recordId?: string
  observationContext?: ObservationContext
  dimensionNotes?: Record<string, string>
  generalNotes?: string
  /** Añade texto a notas adicionales de la entrevista */
  onAppendInterviewNotes?: (text: string) => void
  /** Reemplaza o amplía notas generales de la observación */
  onMergeObservationNotes?: (text: string) => void
}

export function AssistantPanel({
  studentId,
  variant,
  interviewType,
  interviewContent,
  recordId,
  observationContext,
  dimensionNotes,
  generalNotes,
  onAppendInterviewNotes,
  onMergeObservationNotes,
}: Props) {
  const [status, setStatus] = useState<{
    configured: boolean
    provider?: string
    model?: string
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<AssistantChatResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  const providerLabel = (p?: string) => {
    if (p === 'google') return 'Google Gemini'
    if (p === 'anthropic') return 'Anthropic'
    if (p === 'openai') return 'OpenAI'
    return 'IA'
  }

  const sourceLabel = (() => {
    if (response && response.source !== 'local') {
      return `${providerLabel(response.provider ?? response.source)} · ${response.model ?? ''}`
    }
    if (response?.source === 'local') return 'Modo local'
    if (status?.configured) {
      return `${providerLabel(status.provider)} · ${status.model ?? 'listo'}`
    }
    if (status && !status.configured) return 'Sin API key — modo local'
    return '…'
  })()

  const run = useCallback(
    async (mode: AssistantChatResponse['mode'], overwrite?: boolean) => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/assistant/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode,
            studentId,
            recordType: recordId ? variant : undefined,
            recordId,
            context: {
              interviewType,
              partialContent: interviewContent,
              observationContext,
              dimensionNotes,
              generalNotes,
              overwrite,
            },
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Error del asistente')
        setResponse(data as AssistantChatResponse)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo completar la solicitud')
        setResponse(null)
      } finally {
        setLoading(false)
      }
    },
    [
      studentId,
      recordId,
      variant,
      interviewType,
      interviewContent,
      observationContext,
      dimensionNotes,
      generalNotes,
    ],
  )

  return (
    <Card className="border-kata-primary/20 bg-gradient-to-b from-white to-kata-surface/30">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Asistente Katà</h2>
          <p className="text-xs text-gray-500">{sourceLabel}</p>
        </div>
      </div>

      <p className="mb-3 text-xs text-amber-900/90">
        Apoyo para indagar y sintetizar. No sustituye su criterio profesional ni realiza
        diagnósticos clínicos. Revise siempre antes de guardar o aplicar a la VI.
      </p>

      <div className="flex flex-wrap gap-2">
        {variant === 'interview' && interviewType && (
          <Button
            type="button"
            variant="secondary"
            disabled={loading}
            onClick={() => run('interview_questions')}
          >
            Sugerir preguntas
          </Button>
        )}
        {variant === 'interview' && (
          <Button
            type="button"
            variant="secondary"
            disabled={loading}
            onClick={() => run('interview_synthesis')}
          >
            Sintetizar entrevista
          </Button>
        )}
        {variant === 'observation' && (
          <Button
            type="button"
            variant="secondary"
            disabled={loading}
            onClick={() => run('observation_synthesis')}
          >
            Sintetizar observación
          </Button>
        )}
        {recordId && (
          <Button
            type="button"
            variant="secondary"
            disabled={loading}
            onClick={() => run('apply_preview', false)}
          >
            Vista previa VI
          </Button>
        )}
      </div>

      {loading && (
        <p className="mt-3 text-sm text-gray-500">Generando respuesta…</p>
      )}

      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      )}

      {response?.text && !loading && (
        <div className="mt-3 space-y-2">
          <div className="max-h-64 overflow-y-auto rounded-md border border-gray-200 bg-white p-3 text-sm text-gray-800 whitespace-pre-wrap">
            {response.text}
          </div>

          {response.mode === 'interview_synthesis' && onAppendInterviewNotes && (
            <Button
              type="button"
              variant="ghost"
              fullWidth
              onClick={() => {
                onAppendInterviewNotes(response.text)
                alert('Texto añadido a notas adicionales. Revise y guarde el formulario.')
              }}
            >
              Añadir síntesis a notas adicionales
            </Button>
          )}

          {response.mode === 'observation_synthesis' && onMergeObservationNotes && (
            <Button
              type="button"
              variant="ghost"
              fullWidth
              onClick={() => {
                onMergeObservationNotes(response.text)
                alert('Texto añadido a notas generales. Revise y guarde.')
              }}
            >
              Añadir borrador a notas generales
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}
