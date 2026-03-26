// app/api/assessments/[studentId]/export/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { Packer } from 'docx'
import { prisma } from '@/lib/prisma'
import {
  generateValoracionDocument,
  type CurricularSubjectRow,
} from '@/lib/valoracion-export'

type Params = { params: Promise<{ studentId: string }> }

/** Combina chips seleccionados (como viñetas) con texto libre adicional */
async function buildTextWithCodes(
  codes: string[],
  freeText: string,
  fetcher: (codes: string[]) => Promise<{ label: string }[]>
): Promise<string> {
  const parts: string[] = []
  if (codes.length > 0) {
    const items = await fetcher(codes)
    if (items.length > 0) {
      parts.push(items.map((i) => `• ${i.label}`).join('\n'))
    }
  }
  if (freeText.trim()) {
    parts.push(freeText.trim())
  }
  return parts.join('\n')
}

/**
 * GET /api/assessments/[studentId]/export
 *
 * Genera y devuelve el "Informe de Valoración Integral del Estudiantado"
 * en formato .docx (MEP 2026).
 *
 * Respuesta: application/vnd.openxmlformats-officedocument.wordprocessingml.document
 * Content-Disposition: attachment; filename="valoracion-<nombre>-<fecha>.docx"
 */
export async function GET(req: NextRequest, { params }: Params) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.teacherId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { studentId } = await params

  // ── 1. Cargar datos del estudiante + docente ──
  const student = await prisma.student.findFirst({
    where: { id: studentId, teacherId: token.teacherId as string },
    include: {
      teacher: true,
      assessment: {
        include: { curricularSubjects: { orderBy: { sortOrder: 'asc' } } },
      },
    },
  })

  if (!student) {
    return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 })
  }

  const assessment = student.assessment
  const teacher    = student.teacher

  // ── 2. Formatear fechas ──
  function fmtDate(d: Date | null | undefined): string {
    if (!d) return ''
    return new Intl.DateTimeFormat('es-CR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    }).format(new Date(d))
  }

  // ── 3. Construir estructura curricular ──
  const curricularSubjects: CurricularSubjectRow[] = (
    assessment?.curricularSubjects ?? []
  ).map(row => ({
    subject:        row.subject,
    goalsToAchieve: row.goalsToAchieve,
    progress:       row.progress,
    supportNeeds:   row.supportNeeds,
  }))

  // ── 4. Ensamblar datos de exportación ──
  const exportData = {
    // Estudiante
    studentName:          student.name,
    studentGrade:         student.grade,
    studentCedula:        student.cedula   ?? undefined,
    medicalDiagnosis:     student.medicalDiagnosis ?? undefined,

    // Docente / centro
    teacherName:          teacher.name,
    centerName:           teacher.centerName ?? '',
    circuit:              teacher.circuit    ?? '',
    specialty:            teacher.specialty  ?? 'Problemas de Aprendizaje',
    classroomTeacherName: student.classroomTeacherName ?? '',

    // Sección 1
    elaborationDate:  fmtDate(assessment?.elaborationDate),
    bsaReceivedDate:  fmtDate(assessment?.bsaReceivedDate),

    // Sección 2
    participants: assessment?.participants ?? [],

    // Sección 3
    classroomContext:      assessment?.classroomContext      ?? '',
    institutionalContext:  assessment?.institutionalContext  ?? '',
    familyContext:         assessment?.familyContext         ?? '',

    // Sección 4 — chips + texto libre
    strengths: await buildTextWithCodes(
      assessment?.strengthCodes ?? [],
      assessment?.strengths ?? '',
      (codes) => prisma.strengthItem.findMany({
        where: { code: { in: codes } },
        select: { label: true, sortOrder: true },
        orderBy: { sortOrder: 'asc' },
      })
    ),

    // Sección 5 — chips + texto libre
    barriers: await buildTextWithCodes(
      assessment?.barrierCodes ?? [],
      assessment?.barriers ?? '',
      (codes) => prisma.barrierItem.findMany({
        where: { code: { in: codes } },
        select: { label: true, sortOrder: true },
        orderBy: { sortOrder: 'asc' },
      })
    ),

    // Sección 6
    curricularSubjects,

    // Sección 7
    instruments:     assessment?.instruments     ?? [],
    instrumentNotes: (assessment?.instrumentNotes ?? {}) as Record<string, string>,

    // Sección 8
    integralAnalysis: assessment?.integralAnalysis ?? '',

    // Sección 9 — chips + texto libre
    requiredSupports: await buildTextWithCodes(
      assessment?.supportCodes ?? [],
      assessment?.requiredSupports ?? '',
      (codes) => prisma.supportItem.findMany({
        where: { code: { in: codes } },
        select: { label: true, sortOrder: true },
        orderBy: { sortOrder: 'asc' },
      })
    ),

    // Sección 10
    agreements: assessment?.agreements ?? '',

    // Sección 11 — chips + texto libre
    followUp: await buildTextWithCodes(
      assessment?.followupCodes ?? [],
      assessment?.followUp ?? '',
      (codes) => prisma.followupSchedule.findMany({
        where: { code: { in: codes } },
        select: { label: true, sortOrder: true },
        orderBy: { sortOrder: 'asc' },
      })
    ),
  }

  // ── 5. Generar el documento ──
  const doc    = generateValoracionDocument(exportData)
  const nodeBuffer = await Packer.toBuffer(doc)
  const buffer     = new Uint8Array(nodeBuffer)

  // ── 6. Nombre de archivo seguro ──
  const safeName = student.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()

  const dateStamp = new Date().toISOString().slice(0, 10)
  const filename  = `valoracion-${safeName}-${dateStamp}.docx`

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
