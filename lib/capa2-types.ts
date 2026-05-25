import type {
  InterviewFormat,
  InterviewModality,
  InterviewType,
  ObservationContext,
} from '@prisma/client'

export type InterviewSaberesContent = {
  conoce: string
  sabeHacer: string
  dificultades: string
  estiloPreferencias: string
  relacionInteraccion: string
  contextoFamiliar: string
  situacionesFavorables: string
  situacionesDificultan: string
  apoyosExistentes: string
}

export type InterviewDimensionsContent = {
  cognoscitiva: string
  socioafectiva: string
  psicomotriz: string
}

export type InterviewContent = {
  saberes: InterviewSaberesContent
  dimensions: InterviewDimensionsContent
  notes: string
}

export const EMPTY_SABERES: InterviewSaberesContent = {
  conoce: '',
  sabeHacer: '',
  dificultades: '',
  estiloPreferencias: '',
  relacionInteraccion: '',
  contextoFamiliar: '',
  situacionesFavorables: '',
  situacionesDificultan: '',
  apoyosExistentes: '',
}

export const EMPTY_DIMENSIONS: InterviewDimensionsContent = {
  cognoscitiva: '',
  socioafectiva: '',
  psicomotriz: '',
}

export function emptyInterviewContent(): InterviewContent {
  return {
    saberes: { ...EMPTY_SABERES },
    dimensions: { ...EMPTY_DIMENSIONS },
    notes: '',
  }
}

export function parseInterviewContent(raw: unknown): InterviewContent {
  const base = emptyInterviewContent()
  if (!raw || typeof raw !== 'object') return base
  const o = raw as Record<string, unknown>
  if (o.saberes && typeof o.saberes === 'object') {
    const s = o.saberes as Record<string, unknown>
    for (const key of Object.keys(EMPTY_SABERES) as (keyof InterviewSaberesContent)[]) {
      if (typeof s[key] === 'string') base.saberes[key] = s[key]
    }
  }
  if (o.dimensions && typeof o.dimensions === 'object') {
    const d = o.dimensions as Record<string, unknown>
    for (const key of Object.keys(EMPTY_DIMENSIONS) as (keyof InterviewDimensionsContent)[]) {
      if (typeof d[key] === 'string') base.dimensions[key] = d[key]
    }
  }
  if (typeof o.notes === 'string') base.notes = o.notes
  return base
}

export function parseDimensionNotes(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object') return {}
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'string') out[k] = v
  }
  return out
}

export const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  FAMILIA: 'Familia / encargado',
  ESTUDIANTE: 'Persona estudiante',
  DOCENTE_GRADO: 'Docente de grado (a cargo)',
  DOCENTE_GUIA: 'Docente guía',
  OTRO_PROFESIONAL: 'Otro profesional',
}

export const INTERVIEW_FORMAT_LABELS: Record<InterviewFormat, string> = {
  ESTRUCTURADA: 'Estructurada',
  SEMIESTRUCTURADA: 'Semiestructurada',
  LIBRE: 'Libre',
}

export const INTERVIEW_MODALITY_LABELS: Record<InterviewModality, string> = {
  PRESENCIAL: 'Presencial',
  VIRTUAL: 'Virtual',
}

export const OBSERVATION_CONTEXT_LABELS: Record<ObservationContext, string> = {
  AULA: 'Aula (educación regular)',
  SERVICIO_APOYO: 'Servicio de apoyo PA',
  OTRO: 'Otro contexto',
}

export const INTERVIEW_TYPE_TO_PARTICIPANT: Partial<Record<InterviewType, string>> = {
  FAMILIA: 'FAMILIA_ENCARGADO',
  ESTUDIANTE: 'ESTUDIANTE',
  DOCENTE_GRADO: 'DOCENTE_GUIA',
  DOCENTE_GUIA: 'DOCENTE_GUIA',
}

export const INTERVIEW_TYPE_TO_INSTRUMENT: Partial<Record<InterviewType, string>> = {
  FAMILIA: 'INS_ENT_FAMILIA',
  DOCENTE_GRADO: 'INS_ENT_DOCENTES',
  DOCENTE_GUIA: 'INS_ENT_DOCENTES',
}

export const OBSERVATION_CONTEXT_TO_INSTRUMENT: Record<ObservationContext, string> = {
  AULA: 'INS_OBS_AULA',
  SERVICIO_APOYO: 'INS_OBS_OTROS',
  OTRO: 'INS_OBS_OTROS',
}

export function synthesizeInterviewNarrative(content: InterviewContent): string {
  const { saberes, dimensions, notes } = content
  const parts: string[] = []

  const saberLines: string[] = []
  if (saberes.conoce.trim()) saberLines.push(`Conocimientos: ${saberes.conoce.trim()}`)
  if (saberes.sabeHacer.trim()) saberLines.push(`Sabe hacer: ${saberes.sabeHacer.trim()}`)
  if (saberes.dificultades.trim()) saberLines.push(`Dificultades: ${saberes.dificultades.trim()}`)
  if (saberes.estiloPreferencias.trim()) {
    saberLines.push(`Estilo y preferencias: ${saberes.estiloPreferencias.trim()}`)
  }
  if (saberes.relacionInteraccion.trim()) {
    saberLines.push(`Relación e interacción: ${saberes.relacionInteraccion.trim()}`)
  }
  if (saberes.contextoFamiliar.trim()) {
    saberLines.push(`Contexto familiar: ${saberes.contextoFamiliar.trim()}`)
  }
  if (saberes.situacionesFavorables.trim()) {
    saberLines.push(`Situaciones que favorecen: ${saberes.situacionesFavorables.trim()}`)
  }
  if (saberes.situacionesDificultan.trim()) {
    saberLines.push(`Situaciones que dificultan: ${saberes.situacionesDificultan.trim()}`)
  }
  if (saberes.apoyosExistentes.trim()) {
    saberLines.push(`Apoyos existentes: ${saberes.apoyosExistentes.trim()}`)
  }
  if (saberLines.length) parts.push(saberLines.join('\n'))

  const dimLines: string[] = []
  if (dimensions.cognoscitiva.trim()) {
    dimLines.push(`Dimensión cognoscitiva: ${dimensions.cognoscitiva.trim()}`)
  }
  if (dimensions.socioafectiva.trim()) {
    dimLines.push(`Dimensión socioafectiva: ${dimensions.socioafectiva.trim()}`)
  }
  if (dimensions.psicomotriz.trim()) {
    dimLines.push(`Dimensión psicomotriz: ${dimensions.psicomotriz.trim()}`)
  }
  if (dimLines.length) parts.push(dimLines.join('\n'))

  if (notes.trim()) parts.push(notes.trim())

  return parts.join('\n\n')
}

export function synthesizeObservationNarrative(
  dimensionNotes: Record<string, string>,
  dimensionLabels: Record<string, string>,
  generalNotes: string,
): string {
  const parts: string[] = []
  for (const [code, text] of Object.entries(dimensionNotes)) {
    const t = text.trim()
    if (!t) continue
    const label = dimensionLabels[code] ?? code
    parts.push(`${label}: ${t}`)
  }
  if (generalNotes.trim()) parts.push(generalNotes.trim())
  return parts.join('\n\n')
}

export function mergeTextField(
  existing: string,
  addition: string,
  overwrite: boolean,
): string {
  const add = addition.trim()
  if (!add) return existing
  const ex = existing.trim()
  if (!ex || overwrite) return add
  if (ex.includes(add)) return existing
  return `${ex}\n\n---\n\n${add}`
}

export function mergeUniqueStrings(existing: string[], additions: string[]): string[] {
  const set = new Set(existing)
  for (const a of additions) {
    if (a) set.add(a)
  }
  return [...set]
}
