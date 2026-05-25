/**
 * lib/vi-contribution-types.ts
 *
 * Tipos compartidos para "Aportes Capa 2 → VI".
 *
 * Una contribución representa un fragmento de evidencia, proveniente de
 * cualquier fuente Capa 2 (prueba, observación, entrevista o registro manual)
 * que es candidato a alimentar una sección concreta de la Valoración Integral
 * y que también podrá ser consumido más adelante por el informe del período.
 *
 * El mismo bus alimentará:
 *  - VI §4/§5/§6/§8/§9 con `apply-to-vi`
 *  - PeriodReport (Sesión G) — Valoración Integral
 *  - PeriodReport — Plan de Apoyo
 *  - PeriodReport — Sesiones semanales (futuro)
 */

import type { ViSectionKey } from '@/lib/vi-completeness'

export type Capa2Source = 'interview' | 'observation' | 'diagnostic-test' | 'manual'

export type ContributionCategory =
  /** Aporte a §4 Fortalezas (logros confirmados) */
  | 'strength'
  /** Aporte a §5 Barreras (dificultades observadas) */
  | 'barrier'
  /** Aporte a §6 Desempeño curricular — aprendizajes por lograr */
  | 'curricular_to_achieve'
  /** Aporte a §6 Desempeño curricular — avances */
  | 'curricular_progress'
  /** Aporte a §6 Desempeño curricular — necesidades de apoyo */
  | 'curricular_support'
  /** Aporte a §8 Análisis (texto descriptivo) */
  | 'analysis'
  /** Aporte a §9 Apoyos requeridos */
  | 'support'
  /** Recomendación pedagógica (Plan de Apoyo cuando se promueve a estrategias) */
  | 'recommendation'

/**
 * Mapeo categoría → sección de VI.  Útil para el orquestador (`apply-to-vi`).
 */
export const CONTRIBUTION_TO_VI_SECTION: Record<ContributionCategory, ViSectionKey | null> = {
  strength:             'strengths',
  barrier:              'barriers',
  curricular_to_achieve:'performance',
  curricular_progress:  'performance',
  curricular_support:   'performance',
  analysis:             'analysis',
  support:              'supports',
  recommendation:       null,             // va al Plan de Apoyo, no a la VI directamente
}

export interface ViContribution {
  /** Identificador estable para evitar duplicar al re-derivar. */
  contributionId: string

  source: Capa2Source
  sourceRecordId: string
  sourceLabel: string                       // p.ej. "Dislexia · Primer grado · Conciencia Fonológica"
  sourceDate?: string                       // ISO

  category: ContributionCategory
  text: string                              // contenido a inyectar / mostrar

  /** Asignatura curricular cuando aplique (§6). */
  subject?: string
  /** Dificultad asociada cuando viene de prueba. */
  difficulty?: string
  difficultyLabel?: string

  /** True si ya se confirmó como aplicado a la VI (item result, sección, etc.). */
  appliedToVi?: boolean
}

/**
 * Resumen agrupado por sección — útil para los hints en VI.
 */
export interface ViContributionSummary {
  bySection: Partial<Record<ViSectionKey, ViContribution[]>>
  recommendations: ViContribution[]         // categoría 'recommendation' aparte
  generatedAt: string
}
