/**
 * POST /api/institutional-documents
 *   Acepta multipart/form-data: file (Blob), title (string), schoolYear (int).
 *   Extrae texto del archivo, procesa con IA (Plan de Acción Anual / Anexo 2)
 *   y persiste en BD. Procesamiento síncrono (deuda técnica para v2).
 *
 * GET /api/institutional-documents?type=&schoolYear=&status=
 *   Lista los documentos del docente con metadata (sin texto completo).
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  InstitutionalDocumentStatus,
  InstitutionalDocumentType,
  Prisma,
} from '@prisma/client'
import { getAuthTeacher } from '@/lib/student-access'
import { prisma } from '@/lib/prisma'
import {
  extractTextFromUpload,
  inferMimeFromFilename,
  isSupportedMime,
  MAX_FILE_BYTES,
  TextExtractionError,
} from '@/lib/text-extraction'
import { parseActionPlanDocument } from '@/lib/institutional-document-parser'
import { countAnnualPayload, type ActionPlanAnnualPayload } from '@/lib/institutional-document-types'

// Forzamos Node runtime — pdf-parse y mammoth no funcionan en Edge.
export const runtime = 'nodejs'
// Esta ruta puede tardar varios segundos por la llamada a la IA.
export const maxDuration = 60

// ─────────────────────────────────────────────────────────────────────────────
// GET — listar
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await getAuthTeacher(req)
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const typeRaw = searchParams.get('type')
  const yearRaw = searchParams.get('schoolYear')
  const statusRaw = searchParams.get('status')

  const where: Prisma.InstitutionalDocumentWhereInput = { teacherId: auth.teacherId }
  if (typeRaw && (Object.values(InstitutionalDocumentType) as string[]).includes(typeRaw)) {
    where.type = typeRaw as InstitutionalDocumentType
  }
  if (yearRaw) {
    const y = Number.parseInt(yearRaw, 10)
    if (Number.isFinite(y)) where.schoolYear = y
  }
  if (statusRaw && (Object.values(InstitutionalDocumentStatus) as string[]).includes(statusRaw)) {
    where.status = statusRaw as InstitutionalDocumentStatus
  }

  const docs = await prisma.institutionalDocument.findMany({
    where,
    orderBy: [{ schoolYear: 'desc' }, { uploadedAt: 'desc' }],
    select: {
      id: true,
      type: true,
      title: true,
      schoolYear: true,
      originalFileName: true,
      mimeType: true,
      fileSizeBytes: true,
      status: true,
      aiProvider: true,
      aiModel: true,
      aiSummary: true,
      aiPayload: true,
      aiError: true,
      aiGenerated: true,
      uploadedAt: true,
      processedAt: true,
      updatedAt: true,
    },
  })

  return NextResponse.json({
    documents: docs.map((d) => {
      const counts = countAnnualPayload(
        d.aiPayload as ActionPlanAnnualPayload | null,
      )
      return {
        id: d.id,
        type: d.type,
        title: d.title,
        schoolYear: d.schoolYear,
        originalFileName: d.originalFileName,
        mimeType: d.mimeType,
        fileSizeBytes: d.fileSizeBytes,
        status: d.status,
        aiProvider: d.aiProvider,
        aiModel: d.aiModel,
        aiSummary: d.aiSummary,
        aiError: d.aiError,
        aiGenerated: d.aiGenerated,
        uploadedAt: d.uploadedAt,
        processedAt: d.processedAt,
        updatedAt: d.updatedAt,
        counts,
      }
    }),
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// POST — subir + procesar
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await getAuthTeacher(req)
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json(
      { error: 'Se esperaba multipart/form-data con un campo "file".' },
      { status: 400 },
    )
  }

  const file = form.get('file')
  const title = String(form.get('title') ?? '').trim()
  const schoolYearStr = String(form.get('schoolYear') ?? '').trim()
  const typeStr = String(form.get('type') ?? InstitutionalDocumentType.PLAN_ACCION_ANUAL)

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Falta el archivo (campo "file").' }, { status: 400 })
  }
  if (!title) {
    return NextResponse.json({ error: 'Falta el título del documento.' }, { status: 400 })
  }
  const schoolYear = Number.parseInt(schoolYearStr, 10)
  if (!Number.isFinite(schoolYear) || schoolYear < 2000 || schoolYear > 2100) {
    return NextResponse.json({ error: 'Año lectivo inválido.' }, { status: 400 })
  }
  if (!(Object.values(InstitutionalDocumentType) as string[]).includes(typeStr)) {
    return NextResponse.json({ error: 'Tipo de documento inválido.' }, { status: 400 })
  }
  const type = typeStr as InstitutionalDocumentType
  if (type !== InstitutionalDocumentType.PLAN_ACCION_ANUAL) {
    return NextResponse.json(
      { error: 'En esta versión solo se procesa PLAN_ACCION_ANUAL (Anexo 2).' },
      { status: 400 },
    )
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: `El archivo supera ${Math.round(MAX_FILE_BYTES / (1024 * 1024))} MB.` },
      { status: 413 },
    )
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const mime = isSupportedMime(file.type)
    ? file.type
    : (inferMimeFromFilename(file.name) ?? file.type)

  // Paso 1: extraer texto
  let extractedText = ''
  try {
    const ext = await extractTextFromUpload({ buffer, mime, filename: file.name })
    extractedText = ext.text
  } catch (e) {
    if (e instanceof TextExtractionError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 422 })
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al leer el archivo.' },
      { status: 500 },
    )
  }

  // Paso 2: parsear con IA (síncrono)
  const parsed = await parseActionPlanDocument({
    documentText: extractedText,
    declaredSchoolYear: schoolYear,
    declaredTitle: title,
  })

  const isError = parsed.result.status === 'error'
  const status: InstitutionalDocumentStatus = isError
    ? InstitutionalDocumentStatus.ERROR
    : InstitutionalDocumentStatus.PROCESSED

  const doc = await prisma.institutionalDocument.create({
    data: {
      teacherId: auth.teacherId,
      type,
      title,
      schoolYear,
      originalFileName: file.name,
      mimeType: mime || 'application/octet-stream',
      fileSizeBytes: file.size,
      extractedText,
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

  return NextResponse.json(
    {
      id: doc.id,
      status: doc.status,
      title: doc.title,
      schoolYear: doc.schoolYear,
      aiProvider: doc.aiProvider,
      aiModel: doc.aiModel,
      aiSummary: doc.aiSummary,
      aiError: doc.aiError,
      warnings: parsed.result.warnings,
      counts: countAnnualPayload(parsed.result.payload),
    },
    { status: 201 },
  )
}
