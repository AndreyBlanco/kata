import type {
  Capa2Checklist,
  ServiceIntakeType,
  ViFieldSnapshot,
  ViSectionKey,
} from '@/lib/vi-completeness'
import {
  VI_SECTION_LABELS,
  computeViSectionComplete,
  countCapa2Complete,
} from '@/lib/vi-completeness'

export type ViInconsistency = {
  code: string
  message: string
  severity: 'warning' | 'info'
}

export function detectViInconsistencies(
  fields: ViFieldSnapshot,
  capa2: Capa2Checklist,
  intakeType: ServiceIntakeType | null,
): ViInconsistency[] {
  const issues: ViInconsistency[] = []

  if (capa2.hasFamilyInterview && !fields.familyContext?.trim()) {
    issues.push({
      code: 'family_interview_no_context',
      message:
        'Hay entrevista con familia registrada, pero el contexto familiar en la VI está vacío.',
      severity: 'warning',
    })
  }

  if (capa2.hasClassroomObservation && !fields.classroomContext?.trim()) {
    issues.push({
      code: 'observation_no_classroom',
      message:
        'Hay observación en aula documentada, pero el contexto de aula en la VI está vacío.',
      severity: 'warning',
    })
  }

  if (capa2.interviewCount > 0 && (fields.instruments?.length ?? 0) === 0) {
    issues.push({
      code: 'interviews_no_instruments',
      message:
        'Existen entrevistas en Capa 2 pero no hay instrumentos marcados en la VI.',
      severity: 'info',
    })
  }

  if (capa2.observationCount > 0 && !fields.classroomContext?.trim() && !fields.institutionalContext?.trim()) {
    issues.push({
      code: 'observations_no_context',
      message:
        'Hay observaciones registradas sin contexto educativo correspondiente en la VI.',
      severity: 'warning',
    })
  }

  const capa2Progress = countCapa2Complete(capa2, intakeType)
  if (intakeType === 'nuevo_ingreso' && capa2Progress.done < capa2Progress.total) {
    issues.push({
      code: 'capa2_incomplete_ingreso',
      message: `Ingreso nuevo: evidencia Capa 2 incompleta (${capa2Progress.done}/${capa2Progress.total} requisitos).`,
      severity: 'warning',
    })
  }

  if (!fields.bsaReceivedDate?.trim()) {
    issues.push({
      code: 'bsa_missing',
      message: 'Falta registrar la fecha de recepción de la solicitud BSA.',
      severity: 'warning',
    })
  }

  return issues
}

export function listEmptyViSections(fields: ViFieldSnapshot): ViSectionKey[] {
  const keys = Object.keys(VI_SECTION_LABELS) as ViSectionKey[]
  return keys.filter((k) => !computeViSectionComplete(k, fields))
}

export function buildViReviewSummary(
  fields: ViFieldSnapshot,
  capa2: Capa2Checklist,
  intakeType: ServiceIntakeType | null,
): {
  emptySections: ViSectionKey[]
  inconsistencies: ViInconsistency[]
  sectionsComplete: number
  capa2Complete: { done: number; total: number }
} {
  const emptySections = listEmptyViSections(fields)
  const inconsistencies = detectViInconsistencies(fields, capa2, intakeType)
  const keys = Object.keys(VI_SECTION_LABELS) as ViSectionKey[]
  const sectionsComplete = keys.filter((k) => computeViSectionComplete(k, fields)).length
  const capa2Complete = countCapa2Complete(capa2, intakeType)

  return { emptySections, inconsistencies, sectionsComplete, capa2Complete }
}
