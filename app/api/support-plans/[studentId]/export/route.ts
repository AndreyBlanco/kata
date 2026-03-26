// app/api/support-plans/[studentId]/export/route.ts
//
// GET — Genera y devuelve el Plan de Apoyo en formato .docx
// Requiere que el plan exista (PUT previo en /api/support-plans/[studentId])

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'
import { Packer } from 'docx'
import { buildSupportPlanDocument, type SupportPlanExportData } from '@/lib/support-plan-export'

function formatDate(d: Date | null | undefined): string {
  if (!d) return ''
  return new Date(d).toLocaleDateString('es-CR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 40)
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.teacherId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { studentId } = await params

  // Verificar propiedad y cargar datos del estudiante + docente
  const student = await prisma.student.findFirst({
    where: { id: studentId, teacherId: token.teacherId },
    include: { teacher: true },
  })

  if (!student) {
    return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 })
  }

  // Cargar el plan de apoyo
  const plan = await prisma.studentSupportPlan.findUnique({
    where: { studentId },
  })

  if (!plan) {
    return NextResponse.json(
      { error: 'El plan de apoyo aún no ha sido guardado. Guárdelo antes de exportar.' },
      { status: 404 }
    )
  }

  // Construir datos de exportación
  const exportData: SupportPlanExportData = {
    studentName:            student.name,
    studentGrade:           student.grade,
    studentCedula:          student.cedula ?? undefined,
    teacherName:            student.teacher.name,
    centerName:             student.teacher.centerName,
    circuit:                student.teacher.circuit,
    specialty:              student.teacher.specialty,
    classroomTeacherName:   student.classroomTeacherName ?? undefined,
    elaborationDate:        formatDate(plan.elaborationDate),
    activeDifficulties:     plan.activeDifficulties,
    priorityProcesses:      plan.priorityProcesses,
    executiveSubprocesses:  plan.executiveSubprocesses,
    strengths:              plan.strengths,
    mediationStrategies:    plan.mediationStrategies,
    homeStrategies:         plan.homeStrategies,
    specificStrategies:     plan.specificStrategies,
  }

  // Generar el documento
  const doc        = buildSupportPlanDocument(exportData)
  const nodeBuffer = await Packer.toBuffer(doc)
  const buffer     = new Uint8Array(nodeBuffer)

  const filename = `plan_apoyo_${slugify(student.name)}.docx`

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(nodeBuffer.length),
    },
  })
}
