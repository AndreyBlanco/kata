/** Estado operativo del estudiante en el servicio PA (Fase 0). */

export type ServiceStatus =
  | 'en_servicio'
  | 'valoracion_activa'
  | 'decision_pendiente'
  | 'sin_apoyo'
  | 'sin_valoracion'

export type ServiceFilter =
  | 'en_servicio'
  | 'todos'
  | 'valoracion'
  | 'pendientes'

export const SERVICE_STATUS_LABELS: Record<ServiceStatus, string> = {
  en_servicio: 'En servicio PA',
  valoracion_activa: 'Valoración en curso',
  decision_pendiente: 'Decisión pendiente',
  sin_apoyo: 'Sin apoyo PA',
  sin_valoracion: 'Sin valoración',
}

export const SERVICE_STATUS_TONE: Record<
  ServiceStatus,
  'primary' | 'success' | 'warning' | 'neutral' | 'danger'
> = {
  en_servicio: 'primary',
  valoracion_activa: 'warning',
  decision_pendiente: 'warning',
  sin_apoyo: 'neutral',
  sin_valoracion: 'neutral',
}

type AssessmentSlice = {
  status: string
  requiresSupport: boolean | null
  bsaReceivedDate: Date | string | null
} | null

export function deriveServiceStatus(assessment: AssessmentSlice): ServiceStatus {
  if (!assessment) return 'sin_valoracion'

  if (assessment.status === 'active') {
    return assessment.requiresSupport === true ? 'en_servicio' : 'valoracion_activa'
  }

  if (assessment.requiresSupport === true) return 'en_servicio'
  if (assessment.requiresSupport === false) return 'sin_apoyo'
  return 'decision_pendiente'
}

export function matchesServiceFilter(
  filter: ServiceFilter,
  assessment: AssessmentSlice,
): boolean {
  switch (filter) {
    case 'en_servicio':
      return assessment?.requiresSupport === true
    case 'valoracion':
      return assessment?.status === 'active'
    case 'pendientes':
      return (
        !assessment?.bsaReceivedDate ||
        (assessment?.status === 'completed' && assessment.requiresSupport === null)
      )
    case 'todos':
    default:
      return true
  }
}

export function parseServiceFilter(value: string | null): ServiceFilter {
  if (
    value === 'en_servicio' ||
    value === 'todos' ||
    value === 'valoracion' ||
    value === 'pendientes'
  ) {
    return value
  }
  return 'en_servicio'
}
