'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

type Props = {
  applyUrl: string
  onApplied?: () => void
}

export function ApplyToViButton({ applyUrl, onApplied }: Props) {
  const [loading, setLoading] = useState(false)

  const handleApply = async (overwrite: boolean) => {
    setLoading(true)
    try {
      const res = await fetch(applyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overwrite }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al aplicar')

      const updated = (data.updatedFields as string[])?.join(', ') || 'ninguno'
      const skipped = (data.skippedFields as string[])?.join(', ') || 'ninguno'
      alert(
        `Borrador aplicado a la valoración integral.\n\nActualizado: ${updated}\nOmitido (ya tenía texto): ${skipped}`,
      )
      onApplied?.()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo aplicar el borrador.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button
        type="button"
        disabled={loading}
        onClick={() => handleApply(false)}
        className="flex-1"
      >
        {loading ? 'Aplicando…' : 'Aplicar borrador a VI'}
      </Button>
      <Button
        type="button"
        variant="secondary"
        disabled={loading}
        onClick={() => {
          if (
            confirm(
              '¿Reemplazar el texto existente en las secciones de la VI? Esta acción no se puede deshacer fácilmente.',
            )
          ) {
            handleApply(true)
          }
        }}
      >
        Reemplazar secciones
      </Button>
    </div>
  )
}
