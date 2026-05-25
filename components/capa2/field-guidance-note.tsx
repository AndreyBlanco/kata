'use client'

import type { FieldGuidance } from '@/lib/field-guidance'
import { useFormGuidance } from '@/components/capa2/form-guidance-context'

type Props = {
  guidance: FieldGuidance
  /** Texto del catálogo MEP (observaciones), se combina con guidance extra */
  catalogHint?: string | null
}

export function FieldGuidanceNote({ guidance, catalogHint }: Props) {
  const ctx = useFormGuidance()
  if (!ctx?.showGuidance) return null

  return (
    <div
      className="rounded-md border border-blue-100 bg-blue-50/80 px-3 py-2 text-xs text-blue-950"
      role="note"
    >
      <p className="leading-relaxed">{guidance.purpose}</p>
      {catalogHint?.trim() &&
        !guidance.purpose.includes(catalogHint.trim().slice(0, 40)) && (
        <p className="mt-2 leading-relaxed text-blue-900/90">
          <span className="font-medium">Referencia MEP: </span>
          {catalogHint.trim()}
        </p>
      )}
      {guidance.prompts && guidance.prompts.length > 0 && (
        <div className="mt-2">
          <p className="font-medium text-blue-900">Ideas para indagar (ejemplos, no guión):</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-blue-900/90">
            {guidance.prompts.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
