/**
 * lib/diagnostic-test-helpers.ts
 *
 * Tipos y helpers compartidos para pruebas diagnósticas (Fase 3a — E′-1).
 */

import type { DiagnosticItemResult } from '@prisma/client'

/** Resultados visibles para el docente. */
export const DIAGNOSTIC_ITEM_RESULTS = ['LOGRADO', 'EN_PROCESO', 'PRESENTA_DIFICULTAD'] as const
export type DiagnosticItemResultValue = (typeof DIAGNOSTIC_ITEM_RESULTS)[number]

export function isDiagnosticItemResult(value: unknown): value is DiagnosticItemResultValue {
  return typeof value === 'string' && (DIAGNOSTIC_ITEM_RESULTS as readonly string[]).includes(value)
}

/** Mapeo amigable. */
export const DIAGNOSTIC_RESULT_LABELS: Record<DiagnosticItemResult, string> = {
  LOGRADO: 'Logrado',
  EN_PROCESO: 'En proceso',
  PRESENTA_DIFICULTAD: 'Presenta dificultad',
}

/** Estructura de un borrador (draftPayload) — se sincroniza desde el cliente. */
export interface DiagnosticTestDraft {
  itemResults: Record<string, { result: DiagnosticItemResultValue; notes?: string }>
  observations: Record<string, string>            // por activityId
  recommendationSelections: Record<string, boolean> // por recommendationId
}

export function emptyDraft(): DiagnosticTestDraft {
  return { itemResults: {}, observations: {}, recommendationSelections: {} }
}

/**
 * Resumen de progreso para mostrar en lista/modal.
 *  - completed: actividad con todos los items con resultado.
 *  - partial:   actividad con al menos un resultado pero no todos.
 *  - none:      sin resultados.
 */
export interface ActivityProgressSummary {
  activityId: string
  letter: string
  title: string
  itemsTotal: number
  itemsAnswered: number
  status: 'completed' | 'partial' | 'none'
}

export function summarizeActivities(
  activities: { id: string; letter: string; title: string; items: { id: string }[] }[],
  answeredItemIds: Set<string>,
): ActivityProgressSummary[] {
  return activities.map((a) => {
    const itemsAnswered = a.items.filter((i) => answeredItemIds.has(i.id)).length
    const status: ActivityProgressSummary['status'] =
      itemsAnswered === 0 ? 'none'
      : itemsAnswered === a.items.length ? 'completed'
      : 'partial'
    return {
      activityId: a.id,
      letter: a.letter,
      title: a.title,
      itemsTotal: a.items.length,
      itemsAnswered,
      status,
    }
  })
}
