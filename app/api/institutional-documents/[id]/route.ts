/**
 * GET    /api/institutional-documents/[id]
 *   Devuelve el documento completo (incluyendo `extractedText` y `aiPayload`).
 * PATCH  /api/institutional-documents/[id]
 *   Permite editar `title`, `schoolYear`, `notes`.
 * DELETE /api/institutional-documents/[id]
 *   Borra el documento (cascade no aplica — no hay dependientes).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthTeacher } from '@/lib/student-access'
import { prisma } from '@/lib/prisma'
import {
  countAnnualPayload,
  type ActionPlanAnnualPayload,
} from '@/lib/institutional-document-types'

export const runtime = 'nodejs'

export async function GET(
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

  return NextResponse.json({
    id: doc.id,
    type: doc.type,
    title: doc.title,
    schoolYear: doc.schoolYear,
    originalFileName: doc.originalFileName,
    mimeType: doc.mimeType,
    fileSizeBytes: doc.fileSizeBytes,
    status: doc.status,
    aiProvider: doc.aiProvider,
    aiModel: doc.aiModel,
    aiSummary: doc.aiSummary,
    aiError: doc.aiError,
    aiGenerated: doc.aiGenerated,
    notes: doc.notes,
    uploadedAt: doc.uploadedAt,
    processedAt: doc.processedAt,
    updatedAt: doc.updatedAt,
    extractedText: doc.extractedText,
    aiPayload: doc.aiPayload as ActionPlanAnnualPayload | null,
    counts: countAnnualPayload(doc.aiPayload as ActionPlanAnnualPayload | null),
  })
}

interface PatchBody {
  title?: string
  schoolYear?: number
  notes?: string
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthTeacher(req)
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const doc = await prisma.institutionalDocument.findFirst({
    where: { id, teacherId: auth.teacherId },
    select: { id: true },
  })
  if (!doc) return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })

  const body = (await req.json().catch(() => ({}))) as PatchBody
  const data: Record<string, string | number> = {}
  if (typeof body.title === 'string' && body.title.trim()) data.title = body.title.trim()
  if (typeof body.schoolYear === 'number' && Number.isFinite(body.schoolYear)) {
    data.schoolYear = Math.floor(body.schoolYear)
  }
  if (typeof body.notes === 'string') data.notes = body.notes

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Sin cambios.' }, { status: 400 })
  }

  const updated = await prisma.institutionalDocument.update({
    where: { id },
    data,
    select: { id: true, title: true, schoolYear: true, notes: true },
  })
  return NextResponse.json(updated)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthTeacher(req)
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const doc = await prisma.institutionalDocument.findFirst({
    where: { id, teacherId: auth.teacherId },
    select: { id: true },
  })
  if (!doc) return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })

  await prisma.institutionalDocument.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
