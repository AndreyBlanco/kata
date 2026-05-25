import { NextRequest, NextResponse } from 'next/server'
import { applyAllCapa2ToAssessment } from '@/lib/apply-to-assessment'
import {
  getAuthTeacher,
  getStudentForTeacher,
  resolvePeriodForRequest,
} from '@/lib/student-access'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthTeacher(req)
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id: studentId } = await params
  const student = await getStudentForTeacher(studentId, auth.teacherId)
  if (!student) {
    return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 })
  }

  const { searchParams } = new URL(req.url)
  const schoolPeriod = await resolvePeriodForRequest(
    auth.teacherId,
    searchParams.get('schoolPeriod'),
  )

  const body = await req.json().catch(() => ({}))
  const result = await applyAllCapa2ToAssessment(studentId, schoolPeriod, {
    overwrite: !!body.overwrite,
    onlyUnapplied: body.onlyUnapplied !== false,
  })

  return NextResponse.json(result)
}
