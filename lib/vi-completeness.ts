export type ServiceIntakeType = 'nuevo_ingreso' | 'continuidad'

export const SERVICE_INTAKE_LABELS: Record<ServiceIntakeType, string> = {
  nuevo_ingreso: 'Ingreso nuevo al servicio',
  continuidad: 'Continuidad en el servicio',
}

export type ViSectionKey =
  | 'datos'
  | 'participants'
  | 'context'
  | 'strengths'
  | 'barriers'
  | 'performance'
  | 'instruments'
  | 'analysis'
  | 'supports'
  | 'agreements'
  | 'followUp'

export const VI_SECTION_LABELS: Record<ViSectionKey, string> = {
  datos: '1. Datos generales',
  participants: '2. Participantes',
  context: '3. Contexto educativo',
  strengths: '4. Fortalezas',
  barriers: '5. Barreras',
  performance: '6. Desempeño curricular',
  instruments: '7. Instrumentos',
  analysis: '8. Análisis integral',
  supports: '9. Apoyos requeridos',
  agreements: '10. Acuerdos',
  followUp: '11. Seguimiento',
}

export type ViFieldSnapshot = {
  bsaReceivedDate?: string
  participants?: string[]
  classroomContext?: string
  institutionalContext?: string
  familyContext?: string
  strengths?: string
  strengthCodes?: string[]
  barriers?: string
  barrierCodes?: string[]
  curricularSubjectCount?: number
  instruments?: string[]
  integralAnalysis?: string
  requiredSupports?: string
  supportCodes?: string[]
  agreements?: string
  followUp?: string
  followupCodes?: string[]
}

export function computeViSectionComplete(
  key: ViSectionKey,
  fields: ViFieldSnapshot,
): boolean {
  switch (key) {
    case 'datos':
      return !!fields.bsaReceivedDate?.trim()
    case 'participants':
      return (fields.participants?.length ?? 0) > 0
    case 'context':
      return !!(
        fields.classroomContext?.trim() ||
        fields.institutionalContext?.trim() ||
        fields.familyContext?.trim()
      )
    case 'strengths':
      return !!(fields.strengths?.trim() || (fields.strengthCodes?.length ?? 0) > 0)
    case 'barriers':
      return !!(fields.barriers?.trim() || (fields.barrierCodes?.length ?? 0) > 0)
    case 'performance':
      return (fields.curricularSubjectCount ?? 0) > 0
    case 'instruments':
      return (fields.instruments?.length ?? 0) > 0
    case 'analysis':
      return !!fields.integralAnalysis?.trim()
    case 'supports':
      return !!(
        fields.requiredSupports?.trim() || (fields.supportCodes?.length ?? 0) > 0
      )
    case 'agreements':
      return !!fields.agreements?.trim()
    case 'followUp':
      return !!(fields.followUp?.trim() || (fields.followupCodes?.length ?? 0) > 0)
    default:
      return false
  }
}

export function countViSectionsComplete(fields: ViFieldSnapshot): number {
  const keys = Object.keys(VI_SECTION_LABELS) as ViSectionKey[]
  return keys.filter((k) => computeViSectionComplete(k, fields)).length
}

export type Capa2Checklist = {
  expedienteReviewed: boolean
  hasClassroomObservation: boolean
  hasFamilyInterview: boolean
  hasStudentOrTeacherInterview: boolean
  interviewCount: number
  observationCount: number
}

export function countCapa2Complete(
  checklist: Capa2Checklist,
  intakeType: ServiceIntakeType | null,
): { done: number; total: number } {
  if (intakeType === 'continuidad') {
    const done = [
      checklist.expedienteReviewed || checklist.interviewCount > 0,
      checklist.observationCount > 0,
    ].filter(Boolean).length
    return { done, total: 2 }
  }
  const done = [
    checklist.expedienteReviewed,
    checklist.hasClassroomObservation,
    checklist.hasFamilyInterview,
    checklist.hasStudentOrTeacherInterview,
  ].filter(Boolean).length
  return { done, total: 4 }
}

export function isValidServiceIntakeType(v: string | null | undefined): v is ServiceIntakeType {
  return v === 'nuevo_ingreso' || v === 'continuidad'
}
