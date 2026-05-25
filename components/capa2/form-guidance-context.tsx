'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { cn } from '@/lib/cn'
import { GUIDANCE_FOOTER } from '@/lib/field-guidance'

const STORAGE_KEY = 'kata-show-interviewer-guidance'

type FormGuidanceContextValue = {
  showGuidance: boolean
  setShowGuidance: (value: boolean) => void
  toggleGuidance: () => void
}

const FormGuidanceContext = createContext<FormGuidanceContextValue | null>(null)

export function FormGuidanceProvider({ children }: { children: React.ReactNode }) {
  const [showGuidance, setShowGuidanceState] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === 'true') setShowGuidanceState(true)
    } catch {
      /* ignore */
    }
  }, [])

  const setShowGuidance = useCallback((value: boolean) => {
    setShowGuidanceState(value)
    try {
      localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false')
    } catch {
      /* ignore */
    }
  }, [])

  const toggleGuidance = useCallback(() => {
    setShowGuidanceState((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY, next ? 'true' : 'false')
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  return (
    <FormGuidanceContext.Provider value={{ showGuidance, setShowGuidance, toggleGuidance }}>
      {children}
    </FormGuidanceContext.Provider>
  )
}

export function useFormGuidance() {
  const ctx = useContext(FormGuidanceContext)
  return ctx
}

type FormGuidanceToggleProps = {
  className?: string
}

/** Interruptor al inicio del formulario (entrevista u observación) */
export function FormGuidanceToggle({ className }: FormGuidanceToggleProps) {
  const ctx = useFormGuidance()
  if (!ctx) return null

  const { showGuidance, setShowGuidance } = ctx

  return (
    <div
      className={cn(
        'rounded-lg border border-kata-primary/25 bg-kata-surface/40 p-3',
        className,
      )}
    >
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-gray-300 text-kata-primary focus:ring-kata-primary"
          checked={showGuidance}
          onChange={(e) => setShowGuidance(e.target.checked)}
        />
        <span className="min-w-0">
          <span className="block text-sm font-medium text-gray-900">
            Mostrar notas para el entrevistador
          </span>
          <span className="mt-0.5 block text-xs text-gray-600">
            Aparece una orientación breve antes de cada campo: qué buscar y ejemplos de preguntas
            abiertas. {GUIDANCE_FOOTER}
          </span>
        </span>
      </label>
    </div>
  )
}
