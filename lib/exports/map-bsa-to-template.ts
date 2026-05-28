/**
 * Traduce StudentBsaFields → payload plano docxtemplater para templates/bsa-2026.docx.
 *
 * docxtemplater requiere claves literales con punto (p.ej. "institution.centerName"),
 * no objetos anidados { institution: { centerName } }.
 */

import { BSA_SERVICE_CODES, type StudentBsaFields } from '@/lib/bsa-types'

function fmtDisplayDate(iso: string): string {
  const trimmed = iso.trim()
  if (!trimmed) return ''

  if (/^\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{4}$/.test(trimmed)) {
    return trimmed
  }

  const d = new Date(`${trimmed}T12:00:00.000Z`)
  if (Number.isNaN(d.getTime())) return trimmed

  return new Intl.DateTimeFormat('es-CR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

export type BsaTemplatePayload = Record<string, string | boolean>

export function mapBsaToTemplatePayload(fields: StudentBsaFields): BsaTemplatePayload {
  const viRaw = fields.resolution.viSessionDates.filter((d) => d.trim().length > 0)
  while (viRaw.length < 6) viRaw.push('')

  const payload: BsaTemplatePayload = {
    'institution.centerName': fields.institution.centerName,
    'institution.circuit': fields.institution.circuit,
    'institution.budgetCode': fields.institution.budgetCode,
    'institution.directorName': fields.institution.directorName,
    'institution.referenceDateDisplay': fmtDisplayDate(fields.institution.referenceDate),
    'student.fullName': fields.student.fullName,
    'student.birthDateDisplay': fmtDisplayDate(fields.student.birthDate),
    'student.ageAsWritten': fields.student.ageAsWritten,
    'student.cedula': fields.student.cedula,
    'student.contactPhone': fields.student.contactPhone,
    'student.legalGuardian': fields.student.legalGuardian,
    'student.residence': fields.student.residence,
    'student.referringTeacher': fields.student.referringTeacher,
    'student.grade': fields.student.grade,
    'request.educationalSituations': fields.request.educationalSituations,
    'request.studentSchedule': fields.request.studentSchedule,
    'resolution.supportDetermination': fields.resolution.supportDetermination,
    'resolution.serviceProvisionNotes': fields.resolution.serviceProvisionNotes,
    viDate1: fmtDisplayDate(viRaw[0] ?? ''),
    viDate2: fmtDisplayDate(viRaw[1] ?? ''),
    viDate3: fmtDisplayDate(viRaw[2] ?? ''),
    viDate4: fmtDisplayDate(viRaw[3] ?? ''),
    viDate5: fmtDisplayDate(viRaw[4] ?? ''),
    viDate6: fmtDisplayDate(viRaw[5] ?? ''),
  }

  for (const code of BSA_SERVICE_CODES) {
    payload[`svc_${code}`] = fields.request.servicesRequested[code]
  }

  return payload
}
