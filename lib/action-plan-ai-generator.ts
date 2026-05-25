/**
 * lib/action-plan-ai-generator.ts
 *
 * Orquestador IA → líneas + slots para el plan mensual (Sesión F-2).
 *
 * Flujo:
 *  1. Colecta contexto (`collectActionPlanContext`).
 *  2. Auto-detect del modo:
 *      - Si existe `InstitutionalDocument` PROCESSED del año (oficial o
 *        suplente) → Modo A.
 *      - Si no → genera doc SUPLENTE con IA, lo persiste y procede como A.
 *  3. Llama a la IA con `buildMonthlyLinesFromAnnualPrompt`.
 *  4. Normaliza líneas (valida enums, filtra studentIds/itemIds, asegura
 *     cupos por categoría).
 *  5. Corre el `assignLinesUsingContext`.
 *  6. Devuelve líneas + asignaciones + warnings al caller (API), que se
 *     encarga de persistir en una transacción.
 */

import type {
  ServiceLessonCategory,
  MepProcess,
} from '@prisma/client'
import { Prisma, InstitutionalDocumentStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  completeChat,
  getAssistantConfig,
  type AssistantProvider,
} from '@/lib/assistant/client'
import {
  ACTION_PLAN_AI_SYSTEM_PROMPT,
  buildAnnualPayloadFromRecordsPrompt,
  buildMonthlyLinesFromAnnualPrompt,
} from '@/lib/assistant/action-plan-ai-prompts'
import {
  collectActionPlanContext,
  type ActionPlanGenerationContext,
} from '@/lib/action-plan-context'
import {
  assignLinesUsingContext,
  type AssignmentResult,
  type DraftLine,
} from '@/lib/action-plan-slot-assigner'
import { SERVICE_CATEGORIES } from '@/lib/schedule-template'
import {
  emptyAnnualPayload,
  type ActionPlanAnnualPayload,
} from '@/lib/institutional-document-types'
import {
  INSTITUTIONAL_DOC_SYSTEM_PROMPT,
} from '@/lib/assistant/institutional-doc-prompts'

// ─────────────────────────────────────────────────────────────────────────────
// Tipos públicos
// ─────────────────────────────────────────────────────────────────────────────

export interface GeneratedLine {
  tempId: string
  category: ServiceLessonCategory
  mepProcess: MepProcess
  description: string
  lessonCount: number
  studentId: string | null
  linkedItemIds: string[]
  linkedAnnualActivityId: string | null
}

export type GenerationMode = 'with_doc' | 'from_records'

export interface GenerationOutcome {
  mode: GenerationMode
  /** Documento institucional usado (oficial o suplente). */
  sourceDocumentId: string
  /** True si el doc fue generado por Katà en esta misma corrida. */
  suplenteGenerated: boolean
  lines: GeneratedLine[]
  assignment: AssignmentResult
  warnings: string[]
  aiProvider: AssistantProvider | 'local' | null
  aiModel: string | null
  /** Notas humanas que la IA agregó al payload. */
  notes: string | null
}

export class ActionPlanGenerationError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'PLAN_NOT_FOUND'
      | 'SCHEDULE_NOT_FOUND'
      | 'SCHEDULE_NOT_APPROVED'
      | 'NO_ACTIVE_STUDENTS'
      | 'AI_NOT_CONFIGURED'
      | 'AI_FAILED'
      | 'AI_INVALID_JSON',
  ) {
    super(message)
    this.name = 'ActionPlanGenerationError'
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────────────────────

export async function generateMonthlyPlanDraft(args: {
  teacherId: string
  planId: string
}): Promise<GenerationOutcome> {
  const { teacherId, planId } = args

  // 1. Contexto
  const ctxResult = await collectActionPlanContext({ teacherId, planId })
  if (!ctxResult.ok) {
    throw new ActionPlanGenerationError(ctxResult.error.message, ctxResult.error.reason)
  }
  const ctx = ctxResult.context

  // 2. IA debe estar configurada (el modo B sin IA no tiene sentido —
  //    el fallback heurístico de F-1 era para extracción de texto, no genera
  //    planes mensuales razonables).
  const cfg = getAssistantConfig()
  if (!cfg.configured) {
    throw new ActionPlanGenerationError(
      'El asistente IA no está configurado. Definí GOOGLE_API_KEY (Gemini), OPENAI_API_KEY o ANTHROPIC_API_KEY para usar la generación automática.',
      'AI_NOT_CONFIGURED',
    )
  }

  // 3. Auto-detect del modo
  let mode: GenerationMode
  let sourceDocumentId: string
  let suplenteGenerated = false
  let annualPayload: ActionPlanAnnualPayload

  if (ctx.institutionalDocument) {
    mode = 'with_doc'
    sourceDocumentId = ctx.institutionalDocument.id
    annualPayload = ctx.institutionalDocument.payload
  } else {
    mode = 'from_records'
    const surrogate = await generateSurrogateAnnualDocument({ ctx, teacherId })
    sourceDocumentId = surrogate.documentId
    annualPayload = surrogate.payload
    suplenteGenerated = true
  }

  // 4. Llamar IA mensual
  const monthlyPrompt = buildMonthlyLinesFromAnnualPrompt({
    context: ctx,
    annualPayload,
    isSurrogate: suplenteGenerated || Boolean(ctx.institutionalDocument?.aiGenerated),
  })
  const monthlyResult = await completeChat(ACTION_PLAN_AI_SYSTEM_PROMPT, monthlyPrompt)
  if (!monthlyResult) {
    throw new ActionPlanGenerationError(
      'La IA no devolvió respuesta para la generación mensual.',
      'AI_FAILED',
    )
  }
  const monthlyParsed = safeParseJson(monthlyResult.text)
  if (!monthlyParsed) {
    throw new ActionPlanGenerationError(
      'La IA devolvió una respuesta no parseable para el plan mensual.',
      'AI_INVALID_JSON',
    )
  }

  const { lines, notes, warnings: normWarnings } = normalizeMonthlyLines({
    raw: monthlyParsed,
    ctx,
    annualPayload,
    sourceDocumentId,
  })

  // 5. Asignar a slots
  const assignment = assignLinesUsingContext(
    ctx,
    lines.map((l): DraftLine => ({
      tempId: l.tempId,
      category: l.category,
      lessonCount: l.lessonCount,
    })),
  )

  const warnings = [...normWarnings, ...assignmentWarnings(assignment, ctx)]

  return {
    mode,
    sourceDocumentId,
    suplenteGenerated,
    lines,
    assignment,
    warnings,
    aiProvider: monthlyResult.provider,
    aiModel: monthlyResult.model,
    notes,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Surrogate: genera el ActionPlanAnnualPayload y lo persiste como
// InstitutionalDocument con aiGenerated=true.
// ─────────────────────────────────────────────────────────────────────────────

async function generateSurrogateAnnualDocument(args: {
  ctx: ActionPlanGenerationContext
  teacherId: string
}): Promise<{ documentId: string; payload: ActionPlanAnnualPayload }> {
  const { ctx, teacherId } = args
  const prompt = buildAnnualPayloadFromRecordsPrompt({ context: ctx })

  const result = await completeChat(INSTITUTIONAL_DOC_SYSTEM_PROMPT, prompt)
  if (!result) {
    throw new ActionPlanGenerationError(
      'La IA no devolvió respuesta al inferir el Plan Anual suplente.',
      'AI_FAILED',
    )
  }
  const raw = safeParseJson(result.text)
  if (!raw) {
    throw new ActionPlanGenerationError(
      'La IA devolvió un Plan Anual suplente no parseable.',
      'AI_INVALID_JSON',
    )
  }
  const payload = normalizeAnnualPayload(raw, ctx)

  const summary = `Documento suplente generado por Katà a partir de ${ctx.activeStudentCount} estudiantes activos. Contiene ${payload.objectives.length} objetivo${payload.objectives.length === 1 ? '' : 's'} y ${payload.activities.length} actividad${payload.activities.length === 1 ? '' : 'es'}. Reemplazar por el Plan oficial cuando esté disponible.`

  const doc = await prisma.institutionalDocument.create({
    data: {
      teacherId,
      type: 'PLAN_ACCION_ANUAL',
      title: `Plan de Acción Anual ${ctx.plan.year} (suplente — generado por Katà)`,
      schoolYear: ctx.plan.year,
      // Sin archivo fuente
      originalFileName: null,
      mimeType: null,
      fileSizeBytes: null,
      extractedText: null,
      aiPayload: payload as unknown as Prisma.InputJsonValue,
      aiSummary: summary,
      aiProvider: result.provider,
      aiModel: result.model,
      aiGenerated: true,
      status: InstitutionalDocumentStatus.PROCESSED,
      processedAt: new Date(),
    },
    select: { id: true },
  })

  return { documentId: doc.id, payload }
}

// ─────────────────────────────────────────────────────────────────────────────
// Normalización IA → estructura tipada
// ─────────────────────────────────────────────────────────────────────────────

const VALID_CATEGORIES = new Set<ServiceLessonCategory>(
  SERVICE_CATEGORIES.map((c) => c.code),
)
const VALID_PROCESSES = new Set<MepProcess>([
  'IDENTIFICACION',
  'IMPLEMENTACION',
  'REFLEXION',
])

function safeParseJson(text: string): unknown {
  const t = text.trim()
  if (t.startsWith('{') || t.startsWith('[')) {
    try { return JSON.parse(t) } catch { /* fallthrough */ }
  }
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) {
    try { return JSON.parse(fence[1].trim()) } catch { /* fallthrough */ }
  }
  const first = t.indexOf('{')
  const last = t.lastIndexOf('}')
  if (first >= 0 && last > first) {
    try { return JSON.parse(t.slice(first, last + 1)) } catch { /* fallthrough */ }
  }
  return null
}

function asString(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const s = v.trim()
  return s.length === 0 ? undefined : s
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v
    .map((x) => (typeof x === 'string' ? x.trim() : ''))
    .filter((x) => x.length > 0)
}

function asCategory(v: unknown): ServiceLessonCategory | null {
  if (typeof v !== 'string') return null
  const upper = v.trim().toUpperCase() as ServiceLessonCategory
  return VALID_CATEGORIES.has(upper) ? upper : null
}

function asProcess(v: unknown): MepProcess | null {
  if (typeof v !== 'string') return null
  const upper = v.trim().toUpperCase() as MepProcess
  return VALID_PROCESSES.has(upper) ? upper : null
}

function asMonthArray(v: unknown): number[] {
  if (!Array.isArray(v)) return []
  return v
    .map((x) => (typeof x === 'number' ? Math.floor(x) : Number.parseInt(String(x), 10)))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 12)
}

interface NormalizedMonthly {
  lines: GeneratedLine[]
  notes: string | null
  warnings: string[]
}

function normalizeMonthlyLines(args: {
  raw: unknown
  ctx: ActionPlanGenerationContext
  annualPayload: ActionPlanAnnualPayload
  sourceDocumentId: string
}): NormalizedMonthly {
  const { raw, ctx, annualPayload } = args
  const warnings: string[] = []
  if (!raw || typeof raw !== 'object') {
    return { lines: [], notes: null, warnings: ['La IA no devolvió un objeto válido.'] }
  }
  const obj = raw as Record<string, unknown>
  const rawLines = Array.isArray(obj.lines) ? obj.lines : []
  const notes = asString(obj.notes) ?? null

  const validStudentIds = new Set(ctx.students.map((s) => s.id))
  const validItemIds = new Set<string>()
  for (const s of ctx.students) for (const o of s.objectives) validItemIds.add(o.itemId)
  const validActivityIds = new Set(annualPayload.activities.map((a) => a.id))

  const lines: GeneratedLine[] = []
  let idCounter = 0
  for (const it of rawLines) {
    if (!it || typeof it !== 'object') continue
    const o = it as Record<string, unknown>
    const category = asCategory(o.category)
    if (!category) continue
    const lessonCountRaw = typeof o.lessonCount === 'number'
      ? Math.floor(o.lessonCount)
      : Number.parseInt(String(o.lessonCount ?? 0), 10)
    if (!Number.isFinite(lessonCountRaw) || lessonCountRaw <= 0) continue

    const description = asString(o.description) ?? '(sin descripción)'
    const mepProcess = asProcess(o.mepProcess) ?? 'IMPLEMENTACION'

    const sid = asString(o.studentId)
    const studentId = sid && validStudentIds.has(sid) ? sid : null

    const itemIds = asStringArray(o.linkedItemIds).filter((id) => validItemIds.has(id))

    const aid = asString(o.linkedAnnualActivityId)
    const linkedAnnualActivityId = aid && validActivityIds.has(aid) ? aid : null

    idCounter++
    lines.push({
      tempId: `L${idCounter}`,
      category,
      mepProcess,
      description,
      lessonCount: lessonCountRaw,
      studentId,
      linkedItemIds: itemIds,
      linkedAnnualActivityId,
    })
  }

  // Verificar cupos por categoría — si la IA se pasó, recortamos lessonCount;
  // si le faltó, agregamos una línea genérica para completar.
  const cupoByCategory = new Map<ServiceLessonCategory, number>()
  for (const q of ctx.quotas) cupoByCategory.set(q.code, q.monthlyQuota)

  for (const cat of cupoByCategory.keys()) {
    const cupo = cupoByCategory.get(cat) ?? 0
    const linesOfCat = lines.filter((l) => l.category === cat)
    let total = linesOfCat.reduce((s, l) => s + l.lessonCount, 0)
    const def = SERVICE_CATEGORIES.find((c) => c.code === cat)
    const label = def?.shortLabel ?? cat

    if (total > cupo) {
      // recortar empezando por la última línea
      let excess = total - cupo
      for (let i = linesOfCat.length - 1; i >= 0 && excess > 0; i--) {
        const take = Math.min(linesOfCat[i].lessonCount, excess)
        linesOfCat[i].lessonCount -= take
        excess -= take
      }
      // eliminar líneas con 0
      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].category === cat && lines[i].lessonCount === 0) lines.splice(i, 1)
      }
      warnings.push(`${label}: la IA propuso ${total} lecciones; recortado al cupo (${cupo}).`)
      total = cupo
    } else if (total < cupo) {
      const missing = cupo - total
      idCounter++
      lines.push({
        tempId: `L${idCounter}`,
        category: cat,
        mepProcess: cat === 'SERVICIO_PROPIAS' ? 'REFLEXION' : 'IMPLEMENTACION',
        description: defaultLineDescription(cat),
        lessonCount: missing,
        studentId: null,
        linkedItemIds: [],
        linkedAnnualActivityId: null,
      })
      warnings.push(`${label}: la IA propuso ${total}/${cupo} lecciones; se agregó una línea genérica para completar el cupo.`)
    }
  }

  return { lines, notes, warnings }
}

function defaultLineDescription(cat: ServiceLessonCategory): string {
  switch (cat) {
    case 'AULA_REGULAR':         return 'Acompañamiento del estudiantado activo en su grupo regular (a definir según necesidades).'
    case 'OTROS_ESPACIOS':       return 'Apoyo personalizado en otros espacios del centro (a definir según necesidades).'
    case 'ARTICULACION':         return 'Coordinación con otros servicios de apoyo del centro educativo.'
    case 'COMUNIDAD_EDUCATIVA':  return 'Acciones con personal del centro o estudiantado de otros grupos.'
    case 'FAMILIAS':             return 'Atención y orientación a familias del estudiantado activo.'
    case 'SERVICIO_PROPIAS':     return 'Registro y seguimiento del plan mensual, actualización de expedientes.'
    default:                     return 'Acción del servicio (a definir).'
  }
}

function normalizeAnnualPayload(
  raw: unknown,
  ctx: ActionPlanGenerationContext,
): ActionPlanAnnualPayload {
  if (!raw || typeof raw !== 'object') return emptyAnnualPayload()
  const r = raw as Record<string, unknown>

  const objectives = Array.isArray(r.objectives)
    ? r.objectives.map((it, i) => {
        const o = (it ?? {}) as Record<string, unknown>
        return {
          id: asString(o.id) ?? `O${i + 1}`,
          title: asString(o.title) ?? `Objetivo ${i + 1}`,
          description: asString(o.description),
          targetPopulation: asString(o.targetPopulation),
          expectedOutcomes: asStringArray(o.expectedOutcomes),
          axis: asString(o.axis),
        }
      })
    : []
  const objIds = new Set(objectives.map((o) => o.id))

  const activities = Array.isArray(r.activities)
    ? r.activities.map((it, i) => {
        const o = (it ?? {}) as Record<string, unknown>
        return {
          id: asString(o.id) ?? `A${i + 1}`,
          title: asString(o.title) ?? `Actividad ${i + 1}`,
          description: asString(o.description),
          objectiveIds: asStringArray(o.objectiveIds).filter((id) => objIds.has(id)),
          scheduleText: asString(o.scheduleText),
          months: asMonthArray(o.months),
          responsibles: asStringArray(o.responsibles),
          suggestedCategory: asCategory(o.suggestedCategory),
          suggestedProcess: asProcess(o.suggestedProcess),
        }
      })
    : []

  const axes = Array.isArray(r.axes)
    ? r.axes.map((it, i) => {
        const o = (it ?? {}) as Record<string, unknown>
        return {
          id: asString(o.id) ?? `E${i + 1}`,
          title: asString(o.title) ?? `Eje ${i + 1}`,
          description: asString(o.description),
        }
      })
    : []

  return {
    schoolName: asString(r.schoolName) ?? ctx.teacher.centerName,
    schoolYear: typeof r.schoolYear === 'number' ? r.schoolYear : ctx.plan.year,
    serviceArea: asString(r.serviceArea) ?? ctx.teacher.specialty,
    responsibleTeachers: asStringArray(r.responsibleTeachers).length > 0
      ? asStringArray(r.responsibleTeachers)
      : [ctx.teacher.name],
    generalObjective: asString(r.generalObjective),
    axes,
    objectives,
    activities,
    notes: asString(r.notes) ?? 'Documento suplente generado por Katà desde expedientes. Reemplazar cuando esté disponible el Plan oficial del centro.',
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Warnings de asignación
// ─────────────────────────────────────────────────────────────────────────────

function assignmentWarnings(
  asg: AssignmentResult,
  ctx: ActionPlanGenerationContext,
): string[] {
  const w: string[] = []
  for (const u of asg.unassigned) {
    const def = SERVICE_CATEGORIES.find((c) => c.code === u.category)
    const label = def?.shortLabel ?? u.category
    if (u.reason === 'NO_SLOTS_FOR_CATEGORY') {
      w.push(`${label}: no hay slots de esta categoría en el horario aprobado; quedaron ${u.missingCount} lecciones sin asignar.`)
    } else {
      w.push(`${label}: capacidad insuficiente en el horario; quedaron ${u.missingCount} lecciones sin asignar.`)
    }
  }
  // Aviso si el horario no usa todas las categorías
  for (const q of ctx.quotas) {
    if (q.weeklySlotsInSchedule === 0 && q.monthlyQuota > 0) {
      const def = SERVICE_CATEGORIES.find((c) => c.code === q.code)
      const label = def?.shortLabel ?? q.code
      w.push(`${label}: tu horario no tiene slots asignados a esta categoría. Revisá /horario.`)
    }
  }
  return w
}
