import type { InterviewType } from '@prisma/client'
import {
  INTERVIEW_DIMENSIONS_GUIDANCE,
  INTERVIEW_SABERES_GUIDANCE,
} from '@/lib/field-guidance'
import {
  INTERVIEW_TYPE_LABELS,
  parseInterviewContent,
  synthesizeInterviewNarrative,
  synthesizeObservationNarrative,
  type InterviewContent,
} from '@/lib/capa2-types'
import {
  VI_SECTION_LABELS,
  type Capa2Checklist,
  type ServiceIntakeType,
  type ViFieldSnapshot,
} from '@/lib/vi-completeness'
import { buildViReviewSummary } from '@/lib/vi-review'

const FAMILY_BLOCKS = [
  'contextoFamiliar',
  'situacionesFavorables',
  'situacionesDificultan',
  'apoyosExistentes',
] as const

const STUDENT_BLOCKS = [
  'conoce',
  'sabeHacer',
  'dificultades',
  'estiloPreferencias',
  'relacionInteraccion',
] as const

const TEACHER_BLOCKS = [
  'conoce',
  'sabeHacer',
  'dificultades',
  'situacionesFavorables',
  'situacionesDificultan',
] as const

function blocksForType(type: InterviewType): (keyof InterviewContent['saberes'])[] {
  if (type === 'FAMILIA') return [...FAMILY_BLOCKS, 'relacionInteraccion']
  if (type === 'ESTUDIANTE') return [...STUDENT_BLOCKS]
  if (type === 'DOCENTE_GRADO' || type === 'DOCENTE_GUIA') return [...TEACHER_BLOCKS]
  return Object.keys(INTERVIEW_SABERES_GUIDANCE) as (keyof InterviewContent['saberes'])[]
}

export function localInterviewQuestions(
  interviewType: InterviewType,
  partial: InterviewContent,
): string {
  const lines: string[] = [
    `### Preguntas sugeridas — ${INTERVIEW_TYPE_LABELS[interviewType]}`,
    '',
    '*Modo local (sin API de IA). Son ejemplos abiertos; adapte según la conversación.*',
    '',
  ]

  for (const key of blocksForType(interviewType)) {
    const g = INTERVIEW_SABERES_GUIDANCE[key]
    const filled = partial.saberes[key]?.trim()
    if (filled) continue
    lines.push(`**${labelForSaberes(key)}**`)
    if (g.purpose) lines.push(g.purpose)
    if (g.prompts?.length) {
      for (const p of g.prompts.slice(0, 3)) lines.push(`- ${p}`)
    }
    lines.push('')
  }

  const dimKeys = ['cognoscitiva', 'socioafectiva', 'psicomotriz'] as const
  for (const dk of dimKeys) {
    if (partial.dimensions[dk]?.trim()) continue
    const g = INTERVIEW_DIMENSIONS_GUIDANCE[dk]
    lines.push(`**Dimensión ${dk}**`)
    if (g.purpose) lines.push(g.purpose)
    if (g.prompts?.length) {
      for (const p of g.prompts.slice(0, 2)) lines.push(`- ${p}`)
    }
    lines.push('')
  }

  lines.push(
    '---',
    'Recuerde: no es obligatorio usar todas estas preguntas; formule las suyas según las respuestas.',
  )
  return lines.join('\n')
}

function labelForSaberes(key: keyof InterviewContent['saberes']): string {
  const labels: Record<keyof InterviewContent['saberes'], string> = {
    conoce: '¿Qué conoce?',
    sabeHacer: '¿Qué sabe hacer?',
    dificultades: 'Dificultades',
    estiloPreferencias: 'Estilo y preferencias',
    relacionInteraccion: 'Relación e interacción',
    contextoFamiliar: 'Contexto familiar',
    situacionesFavorables: 'Situaciones que favorecen',
    situacionesDificultan: 'Situaciones que dificultan',
    apoyosExistentes: 'Apoyos existentes',
  }
  return labels[key]
}

export function localInterviewSynthesis(content: InterviewContent): string {
  const narrative = synthesizeInterviewNarrative(content)
  if (!narrative.trim()) {
    return 'Complete al menos algunos bloques del formulario para generar una síntesis local.'
  }
  return [
    '### Síntesis (modo local)',
    '',
    narrative,
    '',
    '**Sugerencia para VI:** revise contexto familiar, fortalezas, apoyos requeridos y participantes según el tipo de entrevista.',
  ].join('\n')
}

export function localObservationSynthesis(
  dimensionNotes: Record<string, string>,
  dimensionLabels: Record<string, string>,
  generalNotes: string,
): string {
  const text = synthesizeObservationNarrative(dimensionNotes, dimensionLabels, generalNotes)
  if (!text.trim()) {
    return 'Registre notas en las dimensiones o en el registro anecdótico para obtener un borrador.'
  }
  return ['### Borrador de contexto (modo local)', '', text].join('\n')
}

export function localViReview(
  viFields: ViFieldSnapshot,
  capa2: Capa2Checklist,
  intakeType: ServiceIntakeType | null,
): string {
  const summary = buildViReviewSummary(viFields, capa2, intakeType)

  const lines = [
    '### Revisión pre-cierre (modo local)',
    '',
    `**VI:** ${summary.sectionsComplete}/11 secciones con contenido`,
    `**Capa 2:** ${summary.capa2Complete.done}/${summary.capa2Complete.total} evidencias`,
    '',
  ]

  if (summary.emptySections.length) {
    lines.push('**Secciones vacías:**')
    for (const s of summary.emptySections) {
      lines.push(`- ${VI_SECTION_LABELS[s]}`)
    }
    lines.push('')
  }

  if (summary.inconsistencies.length) {
    lines.push('**Inconsistencias:**')
    for (const i of summary.inconsistencies) {
      lines.push(`- ${i.message}`)
    }
    lines.push('')
  }

  if (!summary.emptySections.length && !summary.inconsistencies.length) {
    lines.push('No se detectaron huecos evidentes. Revise coherencia narrativa antes de finalizar.')
  }

  lines.push(
    '',
    '*Modo local — configure Gemini u otro proveedor para una revisión más contextual.*',
  )
  return lines.join('\n')
}

export { parseInterviewContent }
