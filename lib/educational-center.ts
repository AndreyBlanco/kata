/**
 * lib/educational-center.ts
 *
 * Centros educativos derivados de BSA u otras fuentes.
 * Un docente vinculado a más de un centro se marca como ITINERANTE.
 */

import type { Prisma } from '@prisma/client'
import type { BsaInstitutionFields } from '@/lib/bsa-types'

export type EducationalCenterInput = {
  name: string
  circuit: string
  budgetCode: string
  directorName: string
}

export function educationalCenterFromBsa(
  institution: BsaInstitutionFields,
): EducationalCenterInput {
  return {
    name: institution.centerName.trim(),
    circuit: institution.circuit.trim(),
    budgetCode: institution.budgetCode.trim(),
    directorName: institution.directorName.trim(),
  }
}

function hasCenterData(input: EducationalCenterInput): boolean {
  return input.name.length > 0
}

/**
 * Busca un centro existente por código presupuestario o por nombre+circuito.
 * Si no existe, crea uno nuevo.
 */
export async function findOrCreateEducationalCenter(
  tx: Prisma.TransactionClient,
  input: EducationalCenterInput,
) {
  if (!hasCenterData(input)) return null

  const { name, circuit, budgetCode, directorName } = input

  let existing = null
  if (budgetCode) {
    existing = await tx.educationalCenter.findFirst({
      where: { budgetCode },
    })
  }
  if (!existing) {
    existing = await tx.educationalCenter.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        circuit: { equals: circuit, mode: 'insensitive' },
      },
    })
  }

  if (existing) {
    if (directorName && directorName !== existing.directorName) {
      return tx.educationalCenter.update({
        where: { id: existing.id },
        data: { directorName },
      })
    }
    return existing
  }

  return tx.educationalCenter.create({
    data: { name, circuit, budgetCode, directorName },
  })
}

/** Vincula docente ↔ centro; si hay más de un centro, modalidad ITINERANTE. */
export async function linkTeacherToEducationalCenter(
  tx: Prisma.TransactionClient,
  teacherId: string,
  educationalCenterId: string,
) {
  await tx.teacherEducationalCenter.upsert({
    where: {
      teacherId_educationalCenterId: { teacherId, educationalCenterId },
    },
    create: { teacherId, educationalCenterId },
    update: {},
  })

  const centerCount = await tx.teacherEducationalCenter.count({
    where: { teacherId },
  })

  if (centerCount > 1) {
    await tx.teacher.update({
      where: { id: teacherId },
      data: { workModality: 'ITINERANTE' },
    })
  }
}
