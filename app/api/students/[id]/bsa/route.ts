/**
 * GET  /api/students/[id]/bsa — Obtener boleta archivada
 * PUT  /api/students/[id]/bsa — Guardar cambios (canónico + sync relacionados)
 */

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getStudentForTeacher, getAuthTeacher } from '@/lib/student-access'
import { syncBsaRelatedRecords } from '@/lib/bsa-sync'
import {
  BSA_TEMPLATE_VERSION,
  checkBsaExportReadiness,
  parseStudentBsaFields,
  type StudentBsaFields,
} from '@/lib/bsa-types'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const auth = await getAuthTeacher(req)
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id: studentId } = await params
  const student = await getStudentForTeacher(studentId, auth.teacherId)
  if (!student) return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 })

  const bsa = await prisma.studentBsaForm.findUnique({
    where: { studentId },
  })

  if (!bsa) {
    return NextResponse.json({ error: 'Este estudiante no tiene BSA archivada.' }, { status: 404 })
  }

  const fields = parseStudentBsaFields(bsa.fields)
  const exportReadiness = checkBsaExportReadiness(fields)

  return NextResponse.json({
    id: bsa.id,
    templateVersion: bsa.templateVersion,
    sourceFileName: bsa.sourceFileName,
    uploadedAt: bsa.uploadedAt,
    updatedAt: bsa.updatedAt,
    fields,
    exportReadiness,
  })
}

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await getAuthTeacher(req)
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id: studentId } = await params
  const student = await getStudentForTeacher(studentId, auth.teacherId)
  if (!student) return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 })

  const body = await req.json()
  const fields = parseStudentBsaFields(body.fields) as StudentBsaFields

  const existing = await prisma.studentBsaForm.findUnique({ where: { studentId } })
  if (!existing) {
    return NextResponse.json({ error: 'Este estudiante no tiene BSA archivada.' }, { status: 404 })
  }

  const result = await prisma.$transaction(async (tx) => {
    const bsa = await tx.studentBsaForm.update({
      where: { studentId },
      data: {
        fields: fields as unknown as Prisma.InputJsonValue,
        templateVersion: BSA_TEMPLATE_VERSION,
      },
    })

    await syncBsaRelatedRecords(tx, {
      studentId,
      teacherId: auth.teacherId,
      fields,
      educationalCenterId: student.educationalCenterId,
    })

    return bsa
  })

  const exportReadiness = checkBsaExportReadiness(fields)

  return NextResponse.json({
    id: result.id,
    updatedAt: result.updatedAt,
    fields,
    exportReadiness,
  })
}
