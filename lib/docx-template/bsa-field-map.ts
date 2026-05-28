/**
 * Mapa de campos BSA 2026 — orden documental en BSA-2026.docx anotado en verde.
 */

import { BSA_SERVICE_CODES, type BsaServiceCode } from '@/lib/bsa-types'
import type { TemplateFieldDef } from '@/lib/docx-template/types'

export const BSA_2026_TEMPLATE_FIELDS: TemplateFieldDef[] = [
  {
    id: 'institution_centerName',
    marker: 'institution.centerName',
    schemaPath: 'institution.centerName',
    label: 'Nombre del centro educativo',
    type: 'text',
    required: true,
  },
  {
    id: 'institution_circuit',
    marker: 'institution.circuit',
    schemaPath: 'institution.circuit',
    label: 'Circuito',
    type: 'text',
  },
  {
    id: 'institution_budgetCode',
    marker: 'institution.budgetCode',
    schemaPath: 'institution.budgetCode',
    label: 'Código presupuestario',
    type: 'text',
  },
  {
    id: 'institution_directorName',
    marker: 'institution.directorName',
    schemaPath: 'institution.directorName',
    label: 'Nombre del director',
    type: 'text',
  },
  {
    id: 'institution_referenceDateDisplay',
    marker: 'institution.referenceDateDisplay',
    schemaPath: 'institution.referenceDate',
    label: 'Fecha confección referencia',
    type: 'date',
  },
  {
    id: 'student_fullName',
    marker: 'student.fullName',
    schemaPath: 'student.fullName',
    label: 'Nombre completo estudiante',
    type: 'text',
    required: true,
  },
  {
    id: 'student_birthDateDisplay',
    marker: 'student.birthDateDisplay',
    schemaPath: 'student.birthDate',
    label: 'Fecha de nacimiento',
    type: 'date',
  },
  {
    id: 'student_ageAsWritten',
    marker: 'student.ageAsWritten',
    schemaPath: 'student.ageAsWritten',
    label: 'Edad',
    type: 'text',
  },
  {
    id: 'student_cedula',
    marker: 'student.cedula',
    schemaPath: 'student.cedula',
    label: 'Número de cédula',
    type: 'text',
  },
  {
    id: 'student_contactPhone',
    marker: 'student.contactPhone',
    schemaPath: 'student.contactPhone',
    label: 'Teléfono contacto',
    type: 'text',
  },
  {
    id: 'student_legalGuardian',
    marker: 'student.legalGuardian',
    schemaPath: 'student.legalGuardian',
    label: 'Encargado legal',
    type: 'text',
  },
  {
    id: 'student_residence',
    marker: 'student.residence',
    schemaPath: 'student.residence',
    label: 'Lugar de residencia',
    type: 'text',
  },
  {
    id: 'student_referringTeacher',
    marker: 'student.referringTeacher',
    schemaPath: 'student.referringTeacher',
    label: 'Docente que refiere',
    type: 'text',
  },
  {
    id: 'student_grade',
    marker: 'student.grade',
    schemaPath: 'student.grade',
    label: 'Grado que cursa',
    type: 'text',
  },
  {
    id: 'request_educationalSituations',
    marker: 'request.educationalSituations',
    schemaPath: 'request.educationalSituations',
    label: 'Situaciones educativas',
    type: 'multiline',
  },
  {
    id: 'request_studentSchedule',
    marker: 'request.studentSchedule',
    schemaPath: 'request.studentSchedule',
    label: 'Horario del estudiante',
    type: 'multiline',
  },
  ...BSA_SERVICE_CODES.map(
    (code): TemplateFieldDef => ({
      id: `svc_${code}`,
      marker: `svc_${code}`,
      schemaPath: `request.servicesRequested.${code}`,
      label: `Checkbox servicio: ${code}`,
      type: 'checkbox',
    }),
  ),
  {
    id: 'resolution_supportDetermination',
    marker: 'resolution.supportDetermination',
    schemaPath: 'resolution.supportDetermination',
    label: 'Determinación del apoyo',
    type: 'multiline',
    required: true,
  },
  ...([1, 2, 3, 4, 5, 6] as const).map(
    (n): TemplateFieldDef => ({
      id: `viDate${n}`,
      marker: `viDate${n}`,
      schemaPath: `resolution.viSessionDates[${n - 1}]`,
      label: `Fecha Valoración Integral ${n}`,
      type: 'date',
    }),
  ),
  {
    id: 'resolution_serviceProvisionNotes',
    marker: 'resolution.serviceProvisionNotes',
    schemaPath: 'resolution.serviceProvisionNotes',
    label: 'Consignación del servicio',
    type: 'multiline',
  },
]

/** Marcador docxtemplater para checkbox de servicio. */
export function bsaServiceCheckboxMarker(code: BsaServiceCode): string {
  return `{#svc_${code}}X{/svc_${code}}`
}

export type BsaGreenAssignment =
  | { kind: 'field'; field: TemplateFieldDef }
  | { kind: 'skip'; reason: string }
  | { kind: 'checkbox'; code: BsaServiceCode }
  | { kind: 'viDatesRow'; fields: TemplateFieldDef[] }

/** Secuencia al recorrer runs verdes en orden documental (auditoría BSA-2026). */
export function buildBsa2026GreenAssignments(): BsaGreenAssignment[] {
  const byId = (id: string) => BSA_2026_TEMPLATE_FIELDS.find((f) => f.id === id)!

  const assignments: BsaGreenAssignment[] = [
    { kind: 'field', field: byId('institution_centerName') },
    { kind: 'field', field: byId('institution_circuit') },
    { kind: 'field', field: byId('institution_budgetCode') },
    { kind: 'field', field: byId('institution_directorName') },
    { kind: 'field', field: byId('institution_referenceDateDisplay') },
    { kind: 'field', field: byId('student_fullName') },
    { kind: 'field', field: byId('student_birthDateDisplay') },
    { kind: 'field', field: byId('student_ageAsWritten') },
    { kind: 'field', field: byId('student_cedula') },
    { kind: 'field', field: byId('student_contactPhone') },
    { kind: 'field', field: byId('student_legalGuardian') },
    { kind: 'field', field: byId('student_residence') },
    { kind: 'field', field: byId('student_referringTeacher') },
    { kind: 'field', field: byId('student_grade') },
    { kind: 'field', field: byId('request_educationalSituations') },
    { kind: 'field', field: byId('request_studentSchedule') },
    ...BSA_SERVICE_CODES.map((code) => ({ kind: 'checkbox' as const, code })),
    { kind: 'field', field: byId('resolution_supportDetermination') },
    {
      kind: 'viDatesRow',
      fields: [1, 2, 3, 4, 5, 6].map((n) => byId(`viDate${n}`)),
    },
    { kind: 'field', field: byId('resolution_serviceProvisionNotes') },
  ]

  return assignments
}

export function markerForAssignment(assignment: BsaGreenAssignment): string | null {
  if (assignment.kind === 'skip') return null
  if (assignment.kind === 'field') return `{${assignment.field.marker}}`
  if (assignment.kind === 'checkbox') return bsaServiceCheckboxMarker(assignment.code)
  if (assignment.kind === 'viDatesRow') {
    return assignment.fields.map((f) => `{${f.marker}}`).join('   ')
  }
  return null
}

/** Textos verdes que no reciben marcador (se dejan como rótulo fijo). */
export const BSA_2026_SKIP_GREEN_TEXTS = ['Edad:', 'Edad']

/** Detecta checkbox de servicio (X) o texto placeholder de determinación. */
export function isServiceCheckboxText(text: string): boolean {
  return /^[Xx×✓✔☑]$/.test(text.trim())
}

export function isViDatesPlaceholder(text: string): boolean {
  return /fechas?\s+varias/i.test(text.trim())
}

export function isSupportDeterminationPlaceholder(text: string): boolean {
  return /^lo que determin[oó]$/i.test(text.trim())
}

export function isConsignacionGuideText(text: string): boolean {
  return /consignaci[oó]n de la forma/i.test(text.trim())
}

/**
 * Detecta celda anotada por error como "Edad: 10" completa en verde.
 * Solo el valor numérico debe ser editable; el rótulo queda fijo.
 */
export function parseCombinedAgeText(text: string): boolean {
  return /^Edad\s*:\s*.+$/i.test(text.trim())
}

/** Marcador cuando rótulo y valor vinieron juntos en verde. */
export function combinedAgeMarker(): string {
  return 'Edad: {student.ageAsWritten}'
}
