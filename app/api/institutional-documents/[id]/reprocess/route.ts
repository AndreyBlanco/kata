/**
 * POST /api/institutional-documents/[id]/reprocess
 *
 * Re-corre la IA sobre el `extractedText` ya guardado (no se re-sube el
 * archivo). Útil cuando:
 *  - la IA falló por sobrecarga / 429 y queremos reintentar,
 *  - cambiamos el prompt y queremos refrescar el payload,
 *  - el usuario configuró una API key después del primer upload.
 */

import { NextRequest, NextResponse } from 'next/server'
import { InstitutionalDocumentStatus, Prisma } from '@prisma/client'
import { getAuthTeacher } from '@/lib/student-access'
import { prisma } from '@/lib/prisma'
import { parseActionPlanDocument } from '@/lib/institutional-document-parser'
import { countAnnualPayload } from '@/lib/institutional-document-types'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthTeacher(req)
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const doc = await prisma.institutionalDocument.findFirst({
    where: { id, teacherId: auth.teacherId },
  })
  if (!doc) return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })
  if (!doc.extractedText || doc.extractedText.length < 20) {
    return NextResponse.json(
      { error: 'El documento no tiene texto extraído. Volvé a subir el archivo.' },
      { status: 400 },
    )
  }

  const parsed = await parseActionPlanDocument({
    documentText: doc.extractedText,
    declaredSchoolYear: doc.schoolYear,
    declaredTitle: doc.title,
  })

  const status: InstitutionalDocumentStatus =
    parsed.result.status === 'error'
      ? InstitutionalDocumentStatus.ERROR
      : InstitutionalDocumentStatus.PROCESSED

  await prisma.institutionalDocument.update({
    where: { id },
    data: {
      aiPayload: parsed.result.payload
        ? (parsed.result.payload as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      aiSummary: parsed.result.summary || null,
      aiProvider: parsed.provider ?? null,
      aiModel: parsed.model ?? null,
      aiError: parsed.result.errorMessage ?? null,
      status,
      processedAt: new Date(),
    },
  })

  return NextResponse.json({
    id,
    status,
    aiProvider: parsed.provider,
    aiModel: parsed.model,
    aiSummary: parsed.result.summary,
    aiError: parsed.result.errorMessage,
    warnings: parsed.result.warnings,
    counts: countAnnualPayload(parsed.result.payload),
  })
}
