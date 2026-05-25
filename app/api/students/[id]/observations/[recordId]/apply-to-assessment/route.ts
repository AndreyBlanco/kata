import { NextRequest, NextResponse } from 'next/server'
import { applyObservationToAssessment } from '@/lib/apply-to-assessment'
import { getAuthTeacher, getStudentForTeacher } from '@/lib/student-access'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; recordId: string }> },
) {
  const auth = await getAuthTeacher(req)
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id: studentId, recordId } = await params
  const student = await getStudentForTeacher(studentId, auth.teacherId)
  if (!student) {
    return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 })
  }

  const observation = await prisma.observationRecord.findFirst({
    where: { id: recordId, studentId },
  })
  if (!observation) {
    return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
  }

  const dimensions = await prisma.contextDimension.findMany({
    where: { active: true },
    select: { code: true, label: true },
  })
  const dimensionLabels = Object.fromEntries(
    dimensions.map((d) => [d.code, d.label]),
  )

  const body = await req.json().catch(() => ({}))
  const result = await applyObservationToAssessment(observation, dimensionLabels, {
    overwrite: !!body.overwrite,
  })

  return NextResponse.json(result)
}
