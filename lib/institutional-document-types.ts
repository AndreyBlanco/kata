/**
 * lib/institutional-document-types.ts
 *
 * Tipos compartidos para los documentos institucionales (Sesión F-1).
 *
 * F-1 solo soporta `PLAN_ACCION_ANUAL` (Anexo 2). El payload extraído
 * por la IA respeta la estructura oficial del Anexo 2:
 *   Objetivos · Actividades propuestas · Cronograma · Responsables
 * Más algunos campos opcionales que ayudan a F-2 (mapeo a categorías
 * Anexo 1, meses inferidos, etc.).
 */

import type { ServiceLessonCategory, MepProcess } from '@prisma/client'

// ─────────────────────────────────────────────────────────────────────────────
// Plan de Acción Anual — Anexo 2
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Objetivo del Plan de Acción Anual. Incluye un `id` local (string corto
 * autogenerado por la IA o el parser) para poder referenciarlo desde las
 * actividades sin depender del orden.
 */
export interface AnnualObjective {
  /** Identificador local (e.g. "O1", "O2"). */
  id: string
  /** Título corto del objetivo. */
  title: string
  /** Descripción / formulación completa. */
  description?: string
  /** Población meta: estudiantes, familias, docentes, comunidad… */
  targetPopulation?: string
  /** Resultados esperados o indicadores. */
  expectedOutcomes?: string[]
  /** Eje del Plan al que pertenece (texto libre del documento). */
  axis?: string
}

/**
 * Actividad propuesta. `objectiveIds` referencia uno o varios objetivos.
 * `category` y `mepProcess` son inferencias opcionales para precargar las
 * líneas mensuales en F-2.
 */
export interface AnnualActivity {
  id: string
  title: string
  description?: string
  /** IDs de AnnualObjective.id a los que la actividad responde. */
  objectiveIds: string[]
  /** Texto libre del cronograma tal como aparece en el documento. */
  scheduleText?: string
  /** Meses inferidos (1..12) — opcional, lo intenta la IA. */
  months: number[]
  /** Personas o roles responsables. */
  responsibles: string[]
  /**
   * Mapeo sugerido a categoría del horario Anexo 1.
   * Puede ser null si la IA no logra inferirla.
   */
  suggestedCategory: ServiceLessonCategory | null
  /** Proceso MEP sugerido (Identificación / Implementación / Reflexión). */
  suggestedProcess: MepProcess | null
}

/**
 * Eje del Plan de Acción Anual. Suelen aparecer al inicio del documento
 * agrupando objetivos por línea estratégica (comunidad educativa,
 * implementación de apoyos, autoevaluación, etc.).
 */
export interface AnnualAxis {
  id: string
  title: string
  description?: string
}

/**
 * Payload completo extraído del Plan de Acción Anual (Anexo 2).
 */
export interface ActionPlanAnnualPayload {
  /** Nombre del centro educativo si la IA logra detectarlo. */
  schoolName?: string
  /** Año lectivo declarado en el documento (puede diferir del que dio el docente). */
  schoolYear?: number
  /** Servicio de apoyo (Problemas de Aprendizaje, etc.). */
  serviceArea?: string
  /** Personas docentes que firman / participan del plan. */
  responsibleTeachers: string[]
  /** Objetivo general del plan, si aparece. */
  generalObjective?: string
  axes: AnnualAxis[]
  objectives: AnnualObjective[]
  activities: AnnualActivity[]
  /** Notas u observaciones que la IA quiera dejar registradas. */
  notes?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Resultado de la extracción IA
// ─────────────────────────────────────────────────────────────────────────────

export type ExtractionStatus = 'ok' | 'partial' | 'error'

export interface ExtractionResult {
  status: ExtractionStatus
  /** Payload normalizado; null cuando status='error'. */
  payload: ActionPlanAnnualPayload | null
  /** Resumen humano de 3–5 líneas. */
  summary: string
  /** Avisos no bloqueantes (e.g. "Cronograma sin meses específicos"). */
  warnings: string[]
  /** Texto crudo devuelto por la IA, sólo para debug si hizo falta. */
  rawAiText?: string
  /** Mensaje de error si status='error'. */
  errorMessage?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Esqueleto vacío del payload — útil para inicializar el fallback heurístico
 * o cuando la IA falla parcialmente.
 */
export function emptyAnnualPayload(): ActionPlanAnnualPayload {
  return {
    responsibleTeachers: [],
    axes: [],
    objectives: [],
    activities: [],
  }
}

/**
 * Cuenta objetivos/actividades del payload (para la UI de listado).
 */
export interface AnnualPayloadCounts {
  objectives: number
  activities: number
  axes: number
}

export function countAnnualPayload(payload: ActionPlanAnnualPayload | null): AnnualPayloadCounts {
  if (!payload) return { objectives: 0, activities: 0, axes: 0 }
  return {
    objectives: payload.objectives?.length ?? 0,
    activities: payload.activities?.length ?? 0,
    axes: payload.axes?.length ?? 0,
  }
}
