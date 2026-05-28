/**
 * lib/bsa-seed.ts
 *
 * Semilla única desde BSA canónica hacia Student e IntegralAssessment al crear estudiante.
 */

import type { Prisma } from '@prisma/client'
import {
  BSA_SERVICE_LABELS,
  selectedBsaServices,
  type StudentBsaFields,
} from '@/lib/bsa-types'

export type StudentFormFromBsa = {
  name: string
  birthDate: string
  grade: string
  cedula?: string
  classroomTeacherName?: string
  guardianName?: string
  guardianPhone?: string
}

export function studentFormFromBsa(fields: StudentBsaFields): StudentFormFromBsa {
  return {
    name: fields.student.fullName.trim(),
    birthDate: fields.student.birthDate.trim(),
    grade: fields.student.grade.trim(),
    cedula: fields.student.cedula.trim() || undefined,
    classroomTeacherName: fields.student.referringTeacher.trim() || undefined,
    guardianName: fields.student.legalGuardian.trim() || undefined,
    guardianPhone: fields.student.contactPhone.trim() || undefined,
  }
}

/** Sincroniza la sección estudiante del JSON BSA con los valores editados en el formulario. */
export function syncBsaStudentSection(
  fields: StudentBsaFields,
  form: StudentFormFromBsa,
): StudentBsaFields {
  return {
    ...fields,
    student: {
      ...fields.student,
      fullName: form.name.trim(),
      birthDate: form.birthDate.trim(),
      grade: form.grade.trim(),
      cedula: form.cedula?.trim() ?? fields.student.cedula,
      referringTeacher: form.classroomTeacherName?.trim() ?? fields.student.referringTeacher,
      legalGuardian: form.guardianName?.trim() ?? fields.student.legalGuardian,
      contactPhone: form.guardianPhone?.trim() ?? fields.student.contactPhone,
    },
  }
}

export function assessmentSeedFromBsa(
  fields: StudentBsaFields,
): Prisma.IntegralAssessmentCreateWithoutStudentInput {
  const services = selectedBsaServices(fields)
  const serviceLabels = services.map((c) => BSA_SERVICE_LABELS[c])
  const bsaReceivedDate = fields.institution.referenceDate.trim()
    ? new Date(`${fields.institution.referenceDate.trim()}T12:00:00.000Z`)
    : null

  return {
    bsaReceivedDate,
    serviceIntakeType: 'nuevo_ingreso',
    requiresSupport: services.length > 0 ? true : null,
    classroomContext: fields.request.educationalSituations.trim(),
    institutionalContext: '',
    familyContext: '',
    instruments: ['BSA'],
    instrumentNotes: {
      BSA: serviceLabels.length > 0
        ? `Servicios solicitados en BSA: ${serviceLabels.join(', ')}`
        : 'Boleta de Solicitud de Apoyo registrada.',
    },
    requiredSupports: fields.resolution.supportDetermination.trim(),
    followUp: fields.resolution.viSessionDates
      .filter((d) => d.trim().length > 0)
      .map((d, i) => `Sesión VI ${i + 1}: ${d}`)
      .join('\n'),
    agreements: fields.resolution.serviceProvisionNotes.trim(),
  }
}
