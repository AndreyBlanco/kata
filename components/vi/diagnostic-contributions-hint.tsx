'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { ViContribution } from '@/lib/vi-contribution-types'

type Props = {
  studentId: string
  /** Contribuciones ya filtradas a la sección que renderiza este hint. */
  contributions: ViContribution[]
  /** Texto actual de la VI para detectar qué items ya están incorporados. */
  currentText: string
  /** Etiqueta de sección (Fortalezas, Barreras…). */
  sectionLabel: string
  /** Mensaje específico de la sección. */
  message?: string
  /**
   * Callback al aplicar contribuciones seleccionadas. Recibe el texto resultante
   * (concatenado al texto actual) y la lista de contribuciones aplicadas.
   */
  onApply: (nextText: string, applied: ViContribution[]) => void
  disabled?: boolean
}

const BULLET = '• '

export function DiagnosticContributionsHint({
  studentId,
  contributions,
  currentText,
  sectionLabel,
  message,
  onApply,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false)
  const [selection, setSelection] = useState<Record<string, boolean>>({})

  // Filtra items ya presentes en el texto actual (búsqueda por substring).
  const items = useMemo(() => {
    return contributions.map((c) => ({
      ...c,
      alreadyInText: currentText.toLowerCase().includes(c.text.toLowerCase()),
    }))
  }, [contributions, currentText])

  const pending = items.filter((i) => !i.alreadyInText)

  if (items.length === 0) return null

  function toggle(id: string) {
    setSelection((p) => ({ ...p, [id]: !p[id] }))
  }

  function selectAllPending() {
    const next: Record<string, boolean> = { ...selection }
    for (const i of pending) next[i.contributionId] = true
    setSelection(next)
  }

  function apply() {
    const selected = items.filter((i) => selection[i.contributionId])
    if (selected.length === 0) return
    const lines = selected.map((i) => `${BULLET}${i.text}`)
    const sep = currentText.trim() ? '\n' : ''
    const nextText = `${currentText.trim()}${sep}${lines.join('\n')}`
    onApply(nextText, selected)
    setSelection({})
  }

  const selectedCount = items.filter((i) => selection[i.contributionId]).length

  return (
    <div className="mb-3 rounded-lg border border-indigo-100 bg-indigo-50/70 px-3 py-2 text-xs text-indigo-900">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center justify-between gap-2"
      >
        <span className="flex items-center gap-2">
          <span className="font-medium">Aportes derivados de pruebas</span>
          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-800">
            {pending.length} pendiente{pending.length === 1 ? '' : 's'}
          </span>
          <span className="text-[10px] text-indigo-700">
            ({items.length - pending.length} ya en {sectionLabel.toLowerCase()})
          </span>
        </span>
        <span className="text-indigo-500">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <>
          <p className="mt-1 text-[11px] text-indigo-800">
            {message ??
              `Items derivados de las pruebas diagnósticas que pueden incorporarse a ${sectionLabel.toLowerCase()}.`}
          </p>
          <ul className="mt-2 space-y-1">
            {items.map((i) => (
              <li key={i.contributionId} className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={!!selection[i.contributionId]}
                  disabled={disabled || i.alreadyInText}
                  onChange={() => toggle(i.contributionId)}
                  className="mt-0.5 h-3.5 w-3.5"
                />
                <span className="flex-1">
                  <span className={i.alreadyInText ? 'line-through text-indigo-400' : ''}>
                    {i.text}
                  </span>
                  <span className="ml-2 text-[10px] text-indigo-600">
                    · {i.sourceLabel}
                    {i.alreadyInText && ' · ya incorporado'}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          {!disabled && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={selectAllPending}
                disabled={pending.length === 0}
                className="rounded-md border border-indigo-300 px-2 py-1 text-[11px] text-indigo-800 hover:bg-indigo-100 disabled:opacity-50"
              >
                Seleccionar pendientes ({pending.length})
              </button>
              <button
                type="button"
                onClick={apply}
                disabled={selectedCount === 0}
                className="rounded-md bg-indigo-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Aplicar {selectedCount > 0 ? `(${selectedCount})` : ''} al texto
              </button>
              <Link
                href={`/estudiantes/${studentId}/pruebas`}
                className="ml-auto text-[11px] text-indigo-700 underline hover:text-indigo-900"
              >
                Ver pruebas →
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  )
}
