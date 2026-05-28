/**
 * lib/bsa-sync.ts
 *
 * Propaga cambios del JSON BSA canónico hacia Student, EducationalCenter
 * e IntegralAssessment (solo campos derivados de la resolución PA).
 */

import type { Prisma } from '@prisma/client'
import {
  educationalCenterFromBsa,
  findOrCreateEducationalCenter,
  linkTeacherToEducationalCenter,
} from '@/lib/educational-center'
import { assessmentSeedFromBsa } from '@/lib/bsa-seed'
import type { StudentBsaFields } from '@/lib/bsa-types'

function parseBirthDate(iso: string): Date | null {
  if (!iso.trim()) return null
  const d = new Date(`${iso.trim()}T12:00:00.000Z`)
  return Number.isNaN(d.getTime()) ? null : d
}

export async function syncBsaRelatedRecords(
  tx: Prisma.TransactionClient,
  input: {
    studentId: string
    teacherId: string
    fields: StudentBsaFields
    educationalCenterId: string | null
  },
) {
  const { studentId, teacherId, fields } = input
  let educationalCenterId = input.educationalCenterId

  const centerInput = educationalCenterFromBsa(fields.institution)
  if (centerInput.name) {
    if (educationalCenterId) {
      await tx.educationalCenter.update({
        where: { id: educationalCenterId },
        data: {
          name: centerInput.name,
          circuit: centerInput.circuit,
          budgetCode: centerInput.budgetCode,
          directorName: centerInput.directorName,
        },
      })
    } else {
      const center = await findOrCreateEducationalCenter(tx, centerInput)
      if (center) {
        educationalCenterId = center.id
        await linkTeacherToEducationalCenter(tx, teacherId, center.id)
      }
    }
  }

  const birthDate = parseBirthDate(fields.student.birthDate)
  await tx.student.update({
    where: { id: studentId },
    data: {
      name: fields.student.fullName.trim() || undefined,
      ...(birthDate ? { birthDate } : {}),
      grade: fields.student.grade.trim() || undefined,
      cedula: fields.student.cedula.trim() || null,
      classroomTeacherName: fields.student.referringTeacher.trim() || null,
      guardianName: fields.student.legalGuardian.trim() || null,
      guardianPhone: fields.student.contactPhone.trim() || null,
      ...(educationalCenterId ? { educationalCenterId } : {}),
    },
  })

  const assessmentPatch = assessmentSeedFromBsa(fields)
  await tx.integralAssessment.upsert({
    where: { studentId },
    create: { studentId, ...assessmentPatch },
    update: {
      bsaReceivedDate: assessmentPatch.bsaReceivedDate,
      classroomContext: assessmentPatch.classroomContext,
      requiredSupports: assessmentPatch.requiredSupports,
      followUp: assessmentPatch.followUp,
      agreements: assessmentPatch.agreements,
      instrumentNotes: assessmentPatch.instrumentNotes,
      instruments: assessmentPatch.instruments,
    },
  })

  return { educationalCenterId }
}
