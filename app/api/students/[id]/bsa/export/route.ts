/**
 * GET /api/students/[id]/bsa/export — Descargar BSA en DOCX
 */

import { NextRequest, NextResponse } from 'next/server'
import { Packer } from 'docx'
import { buildBsaDocument } from '@/lib/bsa-export'
import { bsaTemplateExists, renderBsaFromTemplate } from '@/lib/exports/bsa-from-template'
import { prisma } from '@/lib/prisma'
import { getAuthTeacher, getStudentForTeacher } from '@/lib/student-access'
import { checkBsaExportReadiness, parseStudentBsaFields } from '@/lib/bsa-types'

type Params = { params: Promise<{ id: string }> }

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 40)
}

export async function GET(req: NextRequest, { params }: Params) {
  const auth = await getAuthTeacher(req)
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id: studentId } = await params
  const student = await getStudentForTeacher(studentId, auth.teacherId)
  if (!student) return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 })

  const bsa = await prisma.studentBsaForm.findUnique({ where: { studentId } })
  if (!bsa) {
    return NextResponse.json({ error: 'Este estudiante no tiene BSA archivada.' }, { status: 404 })
  }

  const fields = parseStudentBsaFields(bsa.fields)
  const readiness = checkBsaExportReadiness(fields)

  const force = new URL(req.url).searchParams.get('force') === '1'
  if (!readiness.ready && !force) {
    return NextResponse.json(
      {
        error: 'Complete la determinación del apoyo y al menos una fecha de VI antes de exportar.',
        missing: readiness.missing,
      },
      { status: 422 },
    )
  }

  let nodeBuffer: Buffer
  if (bsaTemplateExists()) {
    nodeBuffer = renderBsaFromTemplate(fields)
  } else {
    const doc = buildBsaDocument(fields)
    nodeBuffer = await Packer.toBuffer(doc)
  }

  const buffer = new Uint8Array(nodeBuffer)
  const filename = `bsa_${slugify(fields.student.fullName || student.name)}.docx`

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
