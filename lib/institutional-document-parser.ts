/**
 * lib/institutional-document-parser.ts
 *
 * Procesa el texto extraído de un Plan de Acción Anual (Anexo 2) y devuelve
 * un payload estructurado (`ActionPlanAnnualPayload`) listo para guardarse
 * en `InstitutionalDocument.aiPayload`.
 *
 * Estrategia:
 *  1. Si hay IA configurada (Google/OpenAI/Anthropic) → completeChat.
 *     - Parseamos la respuesta como JSON estricto.
 *     - Validamos campos esperados; normalizamos arrays y enums.
 *  2. Si NO hay IA configurada → fallback heurístico simple:
 *     - Detectamos secciones por encabezados ("Objetivo", "Actividades",
 *       "Cronograma", "Responsables") y armamos un payload parcial.
 *     - Marcamos status='partial' para que la UI lo evidencie.
 *  3. Si la IA responde pero el JSON es inválido → status='error' con
 *     mensaje útil y el texto crudo en `rawAiText`.
 */

import type {
  ServiceLessonCategory,
  MepProcess,
} from '@prisma/client'
import {
  completeChat,
  getAssistantConfig,
  type AssistantProvider,
} from '@/lib/assistant/client'
import {
  INSTITUTIONAL_DOC_SYSTEM_PROMPT,
  actionPlanAnnualUserPrompt,
  ACTION_PLAN_SUMMARY_SYSTEM_PROMPT,
  actionPlanSummaryUserPrompt,
} from '@/lib/assistant/institutional-doc-prompts'
import {
  countAnnualPayload,
  emptyAnnualPayload,
  type ActionPlanAnnualPayload,
  type AnnualActivity,
  type AnnualAxis,
  type AnnualObjective,
  type ExtractionResult,
} from '@/lib/institutional-document-types'
import { SERVICE_CATEGORIES } from '@/lib/schedule-template'

const VALID_CATEGORIES = new Set<string>(SERVICE_CATEGORIES.map((c) => c.code))
const VALID_PROCESSES = new Set<MepProcess>(['IDENTIFICACION', 'IMPLEMENTACION', 'REFLEXION'])

interface ParseInput {
  documentText: string
  declaredSchoolYear: number
  declaredTitle: string
}

interface ParseOutcome {
  result: ExtractionResult
  provider: AssistantProvider | 'local' | null
  model: string | null
}

export async function parseActionPlanDocument(input: ParseInput): Promise<ParseOutcome> {
  const cfg = getAssistantConfig()
  if (!cfg.configured) {
    const heuristic = heuristicExtract(input)
    return {
      result: heuristic,
      provider: 'local',
      model: 'heuristic',
    }
  }

  let aiText = ''
  try {
    const completion = await completeChat(
      INSTITUTIONAL_DOC_SYSTEM_PROMPT,
      actionPlanAnnualUserPrompt(input),
    )
    if (!completion) {
      const heuristic = heuristicExtract(input)
      return { result: heuristic, provider: 'local', model: 'heuristic' }
    }
    aiText = completion.text
    const payload = parseJsonStrict(aiText)
    const normalized = normalizePayload(payload, input)
    const summary = await safeBuildSummary(normalized)
    const counts = countAnnualPayload(normalized)
    const warnings: string[] = []
    if (counts.objectives === 0 && counts.activities === 0) {
      warnings.push('La IA no detectó objetivos ni actividades en el documento.')
    }
    for (const a of normalized.activities) {
      if (a.months.length === 0) {
        warnings.push(`La actividad "${a.title}" no tiene meses inferidos.`)
        break
      }
    }
    return {
      result: {
        status: 'ok',
        payload: normalized,
        summary,
        warnings,
        rawAiText: aiText,
      },
      provider: completion.provider,
      model: completion.model,
    }
  } catch (e) {
    return {
      result: {
        status: 'error',
        payload: null,
        summary: '',
        warnings: [],
        rawAiText: aiText,
        errorMessage: e instanceof Error ? e.message : String(e),
      },
      provider: cfg.provider ?? null,
      model: cfg.model,
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// JSON parsing helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parser robusto: la IA puede devolver el JSON envuelto en ```json ... ```
 * aunque le pidamos solo JSON. Detectamos el primer bloque {...} balanceado.
 */
function parseJsonStrict(raw: string): unknown {
  const trimmed = raw.trim()
  // Si arranca con { o [ es JSON puro
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return JSON.parse(trimmed)
  }
  // Intentar extraer entre triple backticks
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenceMatch) {
    return JSON.parse(fenceMatch[1].trim())
  }
  // Buscar primer { hasta el último }
  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1))
  }
  throw new Error('La respuesta de la IA no contiene un objeto JSON válido.')
}

// ─────────────────────────────────────────────────────────────────────────────
// Normalización del payload
// ─────────────────────────────────────────────────────────────────────────────

function asString(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const t = v.trim()
  return t.length === 0 ? undefined : t
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v
    .map((x) => (typeof x === 'string' ? x.trim() : ''))
    .filter((x) => x.length > 0)
}

function asMonthArray(v: unknown): number[] {
  if (!Array.isArray(v)) return []
  return v
    .map((x) => (typeof x === 'number' ? Math.floor(x) : Number.parseInt(String(x), 10)))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 12)
}

function asCategory(v: unknown): ServiceLessonCategory | null {
  if (typeof v !== 'string') return null
  const upper = v.trim().toUpperCase()
  return VALID_CATEGORIES.has(upper) ? (upper as ServiceLessonCategory) : null
}

function asProcess(v: unknown): MepProcess | null {
  if (typeof v !== 'string') return null
  const upper = v.trim().toUpperCase()
  return VALID_PROCESSES.has(upper as MepProcess) ? (upper as MepProcess) : null
}

function makeLocalId(prefix: string, idx: number, given: unknown): string {
  const g = typeof given === 'string' ? given.trim() : ''
  return g.length > 0 ? g : `${prefix}${idx + 1}`
}

function normalizePayload(raw: unknown, input: ParseInput): ActionPlanAnnualPayload {
  if (!raw || typeof raw !== 'object') return emptyAnnualPayload()
  const r = raw as Record<string, unknown>

  const axes: AnnualAxis[] = Array.isArray(r.axes)
    ? r.axes.map((it, i) => {
        const o = (it ?? {}) as Record<string, unknown>
        return {
          id: makeLocalId('E', i, o.id),
          title: asString(o.title) ?? `Eje ${i + 1}`,
          description: asString(o.description),
        }
      })
    : []

  const objectives: AnnualObjective[] = Array.isArray(r.objectives)
    ? r.objectives.map((it, i) => {
        const o = (it ?? {}) as Record<string, unknown>
        return {
          id: makeLocalId('O', i, o.id),
          title: asString(o.title) ?? `Objetivo ${i + 1}`,
          description: asString(o.description),
          targetPopulation: asString(o.targetPopulation),
          expectedOutcomes: asStringArray(o.expectedOutcomes),
          axis: asString(o.axis),
        }
      })
    : []

  const validObjectiveIds = new Set(objectives.map((o) => o.id))

  const activities: AnnualActivity[] = Array.isArray(r.activities)
    ? r.activities.map((it, i) => {
        const o = (it ?? {}) as Record<string, unknown>
        const objectiveIds = asStringArray(o.objectiveIds).filter((id) =>
          validObjectiveIds.has(id),
        )
        return {
          id: makeLocalId('A', i, o.id),
          title: asString(o.title) ?? `Actividad ${i + 1}`,
          description: asString(o.description),
          objectiveIds,
          scheduleText: asString(o.scheduleText),
          months: asMonthArray(o.months),
          responsibles: asStringArray(o.responsibles),
          suggestedCategory: asCategory(o.suggestedCategory),
          suggestedProcess: asProcess(o.suggestedProcess),
        }
      })
    : []

  const schoolYearRaw = r.schoolYear
  const schoolYear = typeof schoolYearRaw === 'number' && Number.isFinite(schoolYearRaw)
    ? Math.floor(schoolYearRaw)
    : input.declaredSchoolYear

  return {
    schoolName: asString(r.schoolName),
    schoolYear,
    serviceArea: asString(r.serviceArea),
    responsibleTeachers: asStringArray(r.responsibleTeachers),
    generalObjective: asString(r.generalObjective),
    axes,
    objectives,
    activities,
    notes: asString(r.notes),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Resumen (opcional, segunda pasada de IA)
// ─────────────────────────────────────────────────────────────────────────────

async function safeBuildSummary(payload: ActionPlanAnnualPayload): Promise<string> {
  try {
    const completion = await completeChat(
      ACTION_PLAN_SUMMARY_SYSTEM_PROMPT,
      actionPlanSummaryUserPrompt({ payloadJson: JSON.stringify(payload, null, 2) }),
    )
    if (!completion) return buildSummaryFallback(payload)
    return completion.text.trim()
  } catch {
    return buildSummaryFallback(payload)
  }
}

function buildSummaryFallback(payload: ActionPlanAnnualPayload): string {
  const c = countAnnualPayload(payload)
  const monthHist = new Map<number, number>()
  for (const a of payload.activities) {
    for (const m of a.months) monthHist.set(m, (monthHist.get(m) ?? 0) + 1)
  }
  const topMonths = Array.from(monthHist.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([m]) => MONTH_NAMES[m])
    .filter((x) => x)
    .join(', ')

  const parts = [
    `Plan con ${c.objectives} objetivo${c.objectives === 1 ? '' : 's'} y ${c.activities} actividad${c.activities === 1 ? '' : 'es'}.`,
  ]
  if (c.axes > 0) parts.push(`Estructura en ${c.axes} eje${c.axes === 1 ? '' : 's'} estratégico${c.axes === 1 ? '' : 's'}.`)
  if (topMonths) parts.push(`Mayor concentración de actividades en: ${topMonths}.`)
  if (payload.responsibleTeachers.length > 0) {
    parts.push(`Personas docentes responsables: ${payload.responsibleTeachers.slice(0, 3).join(', ')}${payload.responsibleTeachers.length > 3 ? '…' : ''}.`)
  }
  return parts.join(' ')
}

const MONTH_NAMES = [
  '', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

// ─────────────────────────────────────────────────────────────────────────────
// Fallback heurístico (sin IA configurada)
// ─────────────────────────────────────────────────────────────────────────────

function heuristicExtract(input: ParseInput): ExtractionResult {
  const text = input.documentText
  const objectives: AnnualObjective[] = []
  const activities: AnnualActivity[] = []

  // Buscar líneas que arrancan con "Objetivo N:" / "Objetivo N." / "Objetivo general:"
  const objRegex = /^\s*objetivo[\s\d\.:\-]*([^\n]+)/gim
  let m: RegExpExecArray | null
  let oIdx = 0
  while ((m = objRegex.exec(text)) !== null) {
    const title = m[1].trim()
    if (title.length > 0 && title.length < 280) {
      objectives.push({
        id: `O${oIdx + 1}`,
        title: title.slice(0, 240),
      })
      oIdx++
    }
    if (oIdx >= 20) break
  }

  // Buscar líneas que arrancan con "Actividad N" o "- " seguido de verbo en infinitivo
  const actRegex = /^\s*actividad[\s\d\.:\-]*([^\n]+)/gim
  let aIdx = 0
  while ((m = actRegex.exec(text)) !== null) {
    const title = m[1].trim()
    if (title.length > 0 && title.length < 280) {
      activities.push({
        id: `A${aIdx + 1}`,
        title: title.slice(0, 240),
        objectiveIds: [],
        months: [],
        responsibles: [],
        suggestedCategory: null,
        suggestedProcess: null,
      })
      aIdx++
    }
    if (aIdx >= 50) break
  }

  const payload: ActionPlanAnnualPayload = {
    ...emptyAnnualPayload(),
    schoolYear: input.declaredSchoolYear,
    objectives,
    activities,
    notes: 'Extracción heurística sin IA configurada — revisar y completar manualmente.',
  }

  return {
    status: 'partial',
    payload,
    summary: buildSummaryFallback(payload),
    warnings: [
      'El asistente IA no está configurado: se aplicó una extracción heurística básica. Configurá GOOGLE_API_KEY (Gemini), OPENAI_API_KEY o ANTHROPIC_API_KEY para obtener una extracción completa.',
    ],
  }
}
