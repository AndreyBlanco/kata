/**
 * lib/bsa-types.ts
 *
 * Tipos y utilidades para la Boleta de Solicitud de Apoyo (BSA) MEP 2026.
 * StudentBsaForm.fields es la fuente canónica para archivo e impresión.
 *
 * Bloque A — referencia del docente de grado (editable).
 * Bloque B — resolución del docente PA (Determinación, fechas VI, consignación).
 */

import { sanitizeBsaParsedFields } from '@/lib/bsa-parse-cleanup'

/** Versión de plantilla soportada en el piloto. */
export const BSA_TEMPLATE_VERSION = '2026' as const

/** Códigos de servicios de apoyo — tabla oficial BSA 2026 (6 servicios). */
export const BSA_SERVICE_CODES = [
  'aprendizaje',
  'discapacidad_intelectual',
  'discapacidad_visual',
  'audicion_lenguaje',
  'terapia_lenguaje',
  'discapacidad_multiple',
] as const

export type BsaServiceCode = (typeof BSA_SERVICE_CODES)[number]

/** Etiquetas oficiales en la BSA 2026 (texto de la tabla MEP). */
export const BSA_SERVICE_LABELS: Record<BsaServiceCode, string> = {
  aprendizaje: 'Servicio de Apoyo Educativo en Aprendizaje',
  discapacidad_intelectual: 'Servicio de Apoyo Educativo en Discapacidad Intelectual',
  discapacidad_visual: 'Servicio de Apoyo Educativo en Discapacidad Visual',
  audicion_lenguaje: 'Servicio de Apoyo en Audición y Lenguaje',
  terapia_lenguaje: 'Servicio de Apoyo Educativo en Terapia del Lenguaje',
  discapacidad_multiple: 'Servicio de Apoyo en Discapacidad Múltiple',
}

/** Disposición 3×2 de la tabla de servicios en el formulario oficial. */
export const BSA_SERVICE_TABLE_PAIRS: ReadonlyArray<readonly [BsaServiceCode, BsaServiceCode]> = [
  ['aprendizaje', 'discapacidad_intelectual'],
  ['discapacidad_visual', 'audicion_lenguaje'],
  ['terapia_lenguaje', 'discapacidad_multiple'],
]

export type BsaServicesRequested = Record<BsaServiceCode, boolean>

/** Sección 1 — Datos de la institución educativa. */
export type BsaInstitutionFields = {
  centerName: string
  circuit: string
  budgetCode: string
  directorName: string
  /** Fecha confección de la referencia — ISO YYYY-MM-DD o vacío. */
  referenceDate: string
}

/** Sección 2 — Datos de la persona estudiante. */
export type BsaStudentFields = {
  fullName: string
  /** ISO YYYY-MM-DD o vacío. */
  birthDate: string
  /** Edad tal como aparece en la BSA (archivo literal); la app puede recalcular desde birthDate. */
  ageAsWritten: string
  cedula: string
  contactPhone: string
  legalGuardian: string
  residence: string
  referringTeacher: string
  grade: string
}

/** Secciones 3–5 — Solicitud de apoyo (bloque A). */
export type BsaRequestFields = {
  /** Situaciones educativas por las cuales se solicita apoyo. */
  educationalSituations: string
  /** Horario de la persona estudiante. */
  studentSchedule: string
  servicesRequested: BsaServicesRequested
}

/** Secciones 7–9 — Resolución del docente PA (bloque B). */
export type BsaResolutionFields = {
  /** Determinación del apoyo educativo por brindar. */
  supportDetermination: string
  /** Fechas de Valoración Integral — ISO YYYY-MM-DD; mínimo 1 para exportar. */
  viSessionDates: string[]
  /** Consignación de la forma en que se brindará el servicio. */
  serviceProvisionNotes: string
}

/** Payload completo almacenado en StudentBsaForm.fields. */
export type StudentBsaFields = {
  institution: BsaInstitutionFields
  student: BsaStudentFields
  request: BsaRequestFields
  resolution: BsaResolutionFields
}

export const EMPTY_BSA_INSTITUTION: BsaInstitutionFields = {
  centerName: '',
  circuit: '',
  budgetCode: '',
  directorName: '',
  referenceDate: '',
}

export const EMPTY_BSA_STUDENT: BsaStudentFields = {
  fullName: '',
  birthDate: '',
  ageAsWritten: '',
  cedula: '',
  contactPhone: '',
  legalGuardian: '',
  residence: '',
  referringTeacher: '',
  grade: '',
}

export const EMPTY_BSA_SERVICES: BsaServicesRequested = {
  aprendizaje: false,
  discapacidad_intelectual: false,
  discapacidad_visual: false,
  audicion_lenguaje: false,
  terapia_lenguaje: false,
  discapacidad_multiple: false,
}

export const EMPTY_BSA_REQUEST: BsaRequestFields = {
  educationalSituations: '',
  studentSchedule: '',
  servicesRequested: { ...EMPTY_BSA_SERVICES },
}

export const EMPTY_BSA_RESOLUTION: BsaResolutionFields = {
  supportDetermination: '',
  viSessionDates: [''],
  serviceProvisionNotes: '',
}

export function emptyStudentBsaFields(): StudentBsaFields {
  return {
    institution: { ...EMPTY_BSA_INSTITUTION },
    student: { ...EMPTY_BSA_STUDENT },
    request: {
      ...EMPTY_BSA_REQUEST,
      servicesRequested: { ...EMPTY_BSA_SERVICES },
    },
    resolution: {
      ...EMPTY_BSA_RESOLUTION,
      viSessionDates: [''],
    },
  }
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function parseServicesRequested(raw: unknown): BsaServicesRequested {
  const out = { ...EMPTY_BSA_SERVICES }
  if (!raw || typeof raw !== 'object') return out
  const o = raw as Record<string, unknown>

  for (const code of BSA_SERVICE_CODES) {
    if (typeof o[code] === 'boolean') out[code] = o[code]
  }

  /** Claves del esquema anterior (piloto) → servicio oficial BSA 2026. */
  const legacy: Record<string, BsaServiceCode> = {
    visual: 'discapacidad_visual',
    intelectual: 'discapacidad_intelectual',
    multiple: 'discapacidad_multiple',
    lenguaje: 'audicion_lenguaje',
    auditiva: 'audicion_lenguaje',
  }
  for (const [oldKey, code] of Object.entries(legacy)) {
    if (typeof o[oldKey] === 'boolean' && o[oldKey]) out[code] = true
  }

  return out
}

function parseViSessionDates(raw: unknown): string[] {
  if (!Array.isArray(raw)) return ['']
  const dates = raw.filter((d): d is string => typeof d === 'string' && d.trim().length > 0)
  return dates.length > 0 ? dates : ['']
}

/** Normaliza JSON de Prisma/API a StudentBsaFields con defaults seguros. */
export function parseStudentBsaFields(raw: unknown): StudentBsaFields {
  const base = emptyStudentBsaFields()
  if (!raw || typeof raw !== 'object') return base

  const o = raw as Record<string, unknown>

  if (o.institution && typeof o.institution === 'object') {
    const inst = o.institution as Record<string, unknown>
    base.institution = {
      centerName: asString(inst.centerName),
      circuit: asString(inst.circuit),
      budgetCode: asString(inst.budgetCode),
      directorName: asString(inst.directorName),
      referenceDate: asString(inst.referenceDate),
    }
  }

  if (o.student && typeof o.student === 'object') {
    const st = o.student as Record<string, unknown>
    base.student = {
      fullName: asString(st.fullName),
      birthDate: asString(st.birthDate),
      ageAsWritten: asString(st.ageAsWritten),
      cedula: asString(st.cedula),
      contactPhone: asString(st.contactPhone),
      legalGuardian: asString(st.legalGuardian),
      residence: asString(st.residence),
      referringTeacher: asString(st.referringTeacher),
      grade: asString(st.grade),
    }
  }

  if (o.request && typeof o.request === 'object') {
    const req = o.request as Record<string, unknown>
    base.request = {
      educationalSituations: asString(req.educationalSituations),
      studentSchedule: asString(req.studentSchedule),
      servicesRequested: parseServicesRequested(req.servicesRequested),
    }
  }

  if (o.resolution && typeof o.resolution === 'object') {
    const res = o.resolution as Record<string, unknown>
    base.resolution = {
      supportDetermination: asString(res.supportDetermination),
      viSessionDates: parseViSessionDates(res.viSessionDates),
      serviceProvisionNotes: asString(res.serviceProvisionNotes),
    }
  }

  return sanitizeBsaParsedFields(base)
}

export type BsaExportReadiness = {
  ready: boolean
  missing: string[]
}

/** Valida si la BSA está lista para exportar/imprimir (bloque B mínimo). */
export function checkBsaExportReadiness(fields: StudentBsaFields): BsaExportReadiness {
  const missing: string[] = []

  if (!fields.resolution.supportDetermination.trim()) {
    missing.push('Determinación del apoyo educativo por brindar')
  }

  const filledDates = fields.resolution.viSessionDates.filter((d) => d.trim().length > 0)
  if (filledDates.length === 0) {
    missing.push('Al menos una fecha de Valoración Integral')
  }

  return { ready: missing.length === 0, missing }
}

/** Servicios marcados con X en la BSA. */
export function selectedBsaServices(fields: StudentBsaFields): BsaServiceCode[] {
  return BSA_SERVICE_CODES.filter((code) => fields.request.servicesRequested[code])
}
