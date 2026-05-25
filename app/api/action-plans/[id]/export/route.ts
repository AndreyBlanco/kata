/**
 * GET /api/action-plans/[id]/export
 *
 * Devuelve la planificación de acciones del mes como documento .docx
 * (formato Anexo 5 — tabla de 3 columnas por categoría).
 */

import { NextRequest, NextResponse } from 'next/server'
import { Packer } from 'docx'
import { getAuthTeacher } from '@/lib/student-access'
import { prisma } from '@/lib/prisma'
import { buildActionPlanDocument, type ExportPlan } from '@/lib/action-plan-word-export'

const MONTH_LABELS = [
  '', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 40)
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthTeacher(req)
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const plan = await prisma.actionPlan.findFirst({
    where: { id, teacherId: auth.teacherId },
    include: {
      teacher: true,
      lines: {
        orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
        include: {
          slots: { orderBy: { date: 'asc' } },
        },
      },
    },
  })
  if (!plan) return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })

  // Cargar nombres de estudiantes citados en las líneas (relación implícita por studentId).
  const studentIds = Array.from(
    new Set(plan.lines.map((l) => l.studentId).filter((s): s is string => !!s)),
  )
  const studentNames = new Map<string, string>()
  if (studentIds.length > 0) {
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds }, teacherId: auth.teacherId },
      select: { id: true, name: true },
    })
    for (const s of students) studentNames.set(s.id, s.name)
  }

  // Determinar modalidad real: la del horario aprobado del periodo
  const schedule = await prisma.approvedSchedule.findUnique({
    where: {
      teacherId_schoolPeriod: {
        teacherId: auth.teacherId,
        schoolPeriod: plan.schoolPeriod,
      },
    },
    select: { modality: true },
  })

  const exportData: ExportPlan = {
    year: plan.year,
    month: plan.month,
    modality: schedule?.modality ?? plan.teacher.workModality,
    teacherName: plan.teacher.name,
    centerName: plan.teacher.centerName,
    circuit: plan.teacher.circuit,
    specialty: plan.teacher.specialty,
    schoolPeriod: plan.schoolPeriod,
    approvedAt: plan.approvedAt,
    lines: plan.lines.map((l) => ({
      category: l.category,
      mepProcess: l.mepProcess,
      description: l.description ?? '',
      observations: l.observations ?? '',
      slots: l.slots.map((s) => ({ date: s.date.toISOString().slice(0, 10) })),
      studentName: l.studentId ? (studentNames.get(l.studentId) ?? null) : null,
      linkedObjectivesCount: l.linkedItemIds.length,
    })),
  }

  const doc = buildActionPlanDocument(exportData)
  const nodeBuffer = await Packer.toBuffer(doc)
  const buffer = new Uint8Array(nodeBuffer)

  const filename = `plan_acciones_${MONTH_LABELS[plan.month]}_${plan.year}_${slugify(plan.teacher.name)}.docx`

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
