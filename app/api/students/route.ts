// app/api/students/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'
import { assessmentSeedFromBsa, syncBsaStudentSection } from '@/lib/bsa-seed'
import {
  educationalCenterFromBsa,
  findOrCreateEducationalCenter,
  linkTeacherToEducationalCenter,
} from '@/lib/educational-center'
import { BSA_TEMPLATE_VERSION, parseStudentBsaFields } from '@/lib/bsa-types'

// GET — Listar estudiantes del docente
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.teacherId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const students = await prisma.student.findMany({
    where: { teacherId: token.teacherId },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(students)
}

// POST — Crear estudiante (opcionalmente con BSA canónica)
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.teacherId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const teacher = await prisma.teacher.findUnique({
    where: { id: token.teacherId },
  })

  if (!teacher) {
    return NextResponse.json(
      { error: 'Docente no encontrado. Cierre sesión e inicie de nuevo.' },
      { status: 404 },
    )
  }

  const body = await req.json()
  const {
    name,
    birthDate,
    grade,
    cedula,
    medicalDiagnosis,
    classroomTeacherName,
    guardianName,
    guardianPhone,
    bsaFields: bsaFieldsRaw,
    sourceFileName,
  } = body

  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
  }

  if (!birthDate) {
    return NextResponse.json({ error: 'La fecha de nacimiento es requerida' }, { status: 400 })
  }

  const parsedBirthDate = new Date(birthDate)
  if (isNaN(parsedBirthDate.getTime())) {
    return NextResponse.json({ error: 'Fecha de nacimiento inválida' }, { status: 400 })
  }

  if (!grade || !grade.trim()) {
    return NextResponse.json({ error: 'La sección es requerida' }, { status: 400 })
  }

  const formPayload = {
    name: name.trim(),
    birthDate: String(birthDate).trim(),
    grade: grade.trim(),
    cedula: cedula?.trim() || undefined,
    classroomTeacherName: classroomTeacherName?.trim() || undefined,
    guardianName: guardianName?.trim() || undefined,
    guardianPhone: guardianPhone?.trim() || undefined,
  }

  let canonicalBsa = bsaFieldsRaw ? parseStudentBsaFields(bsaFieldsRaw) : null
  if (canonicalBsa) {
    canonicalBsa = syncBsaStudentSection(canonicalBsa, formPayload)
  }

  const student = await prisma.$transaction(async (tx) => {
    let educationalCenterId: string | null = null

    if (canonicalBsa) {
      const center = await findOrCreateEducationalCenter(
        tx,
        educationalCenterFromBsa(canonicalBsa.institution),
      )
      if (center) {
        educationalCenterId = center.id
        await linkTeacherToEducationalCenter(tx, token.teacherId as string, center.id)
      }
    }

    const created = await tx.student.create({
      data: {
        name: formPayload.name,
        birthDate: parsedBirthDate,
        grade: formPayload.grade,
        cedula: formPayload.cedula || null,
        medicalDiagnosis: medicalDiagnosis?.trim() || 'NO APLICA',
        classroomTeacherName: formPayload.classroomTeacherName || null,
        guardianName: formPayload.guardianName || null,
        guardianPhone: formPayload.guardianPhone || null,
        teacherId: token.teacherId as string,
        educationalCenterId,
      },
    })

    if (canonicalBsa) {
      await tx.studentBsaForm.upsert({
        where: { studentId: created.id },
        create: {
          studentId: created.id,
          templateVersion: BSA_TEMPLATE_VERSION,
          fields: canonicalBsa as unknown as Prisma.InputJsonValue,
          sourceFileName: typeof sourceFileName === 'string' ? sourceFileName.trim() || null : null,
          uploadedAt: new Date(),
        },
        update: {
          templateVersion: BSA_TEMPLATE_VERSION,
          fields: canonicalBsa as unknown as Prisma.InputJsonValue,
          sourceFileName: typeof sourceFileName === 'string' ? sourceFileName.trim() || null : null,
          uploadedAt: new Date(),
        },
      })

      const assessmentSeed = assessmentSeedFromBsa(canonicalBsa)
      await tx.integralAssessment.upsert({
        where: { studentId: created.id },
        create: {
          studentId: created.id,
          ...assessmentSeed,
        },
        update: assessmentSeed,
      })
    }

    return created
  })

  return NextResponse.json(student, { status: 201 })
}
