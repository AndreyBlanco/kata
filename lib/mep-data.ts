// lib/mep-data.ts
//
// Punto de entrada para datos institucionales del MEP usados en la app.
// Los datos crudos viven en `lib/mep-centros.ts` (auto-generado del xlsx oficial).

export {
  MEP_CENTROS,
  MEP_REGIONAL_DIRECTIONS,
  ALL_CIRCUITS,
  CIRCUIT_TO_REGION,
  MEP_PROVINCIAS,
  MEP_PLANIFICACION_REGIONS,
} from './mep-centros'

export type { CentroEducativo, RegionalDirection } from './mep-centros'

// ─────────────────────────────────────────────
// ESPECIALIDADES DEL SERVICIO DE APOYO
// ─────────────────────────────────────────────
export const MEP_SPECIALTIES = [
  { value: 'Problemas de Aprendizaje',                label: 'Problemas de Aprendizaje (PA)' },
  { value: 'Problemas Emocionales y de Conducta',     label: 'Problemas Emocionales y de Conducta (PEC)' },
  { value: 'Discapacidad Visual',                     label: 'Discapacidad Visual (DV)' },
  { value: 'Discapacidad Auditiva',                   label: 'Discapacidad Auditiva (DA)' },
  { value: 'Retardo Mental',                          label: 'Discapacidad Intelectual (RM)' },
  { value: 'Discapacidad Múltiple',                   label: 'Discapacidad Múltiple (DM)' },
  { value: 'Trastorno del Espectro Autista',          label: 'Trastorno del Espectro Autista (TEA)' },
  { value: 'Aula Integrada',                          label: 'Aula Integrada' },
  { value: 'Aula Recurso',                            label: 'Aula Recurso' },
] as const

export type MepSpecialty = typeof MEP_SPECIALTIES[number]['value']
