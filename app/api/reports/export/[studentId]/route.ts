// app/api/reports/export/[studentId]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { generateReport } from '@/lib/report-engine'
import { generateWordDocument } from '@/lib/word-export'
import { Packer } from 'docx'

// GET — Exportar informe como .docx
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.teacherId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { studentId } = await params
  const { searchParams } = new URL(req.url)
  const monthsParam = searchParams.get('months')
  const recommendations = searchParams.get('recommendations') || ''

  if (!monthsParam) {
    return NextResponse.json(
      { error: 'Parámetro months requerido' },
      { status: 400 }
    )
  }

  const months = monthsParam
    .split(',')
    .map(Number)
    .filter((n) => n >= 1 && n <= 12)

  try {
    // Generar datos del informe
    const report = await generateReport(token.teacherId, studentId, months)

    // Usar recomendaciones editadas o las generadas
    const finalRecommendations = recommendations || report.recommendations.editable

    // Generar documento Word
    const doc = generateWordDocument(report, finalRecommendations)

    // Convertir a buffer
    const buffer = await Packer.toBuffer(doc)
    const uint8Array = new Uint8Array(buffer)

    // Nombre del archivo
    const fileName = `Informe_${report.administrative.studentName.replace(/\s+/g, '_')}.docx`

    // Responder con el archivo
    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al exportar'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}