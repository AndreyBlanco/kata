/**
 * POST /api/students/parse-bsa
 *
 * Acepta multipart/form-data con campo "file" (.docx).
 * Extrae texto, parsea campos BSA y devuelve JSON para pre-llenar el formulario.
 * No persiste en BD — eso ocurre al crear el estudiante.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthTeacher } from '@/lib/student-access'
import { parseBsaDocument } from '@/lib/bsa-parser'
import { studentFormFromBsa } from '@/lib/bsa-seed'
import {
  extractTextFromUpload,
  inferMimeFromFilename,
  isSupportedMime,
  MAX_FILE_BYTES,
  TextExtractionError,
} from '@/lib/text-extraction'

export const runtime = 'nodejs'
export const maxDuration = 60

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

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
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Falta el archivo (campo "file").' }, { status: 400 })
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: `El archivo supera ${Math.round(MAX_FILE_BYTES / (1024 * 1024))} MB.` },
      { status: 413 },
    )
  }

  const mime = isSupportedMime(file.type)
    ? file.type
    : (inferMimeFromFilename(file.name) ?? file.type)

  if (mime !== DOCX_MIME) {
    return NextResponse.json(
      { error: 'La BSA debe subirse en formato Word (.docx).' },
      { status: 422 },
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())

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

  const parsed = await parseBsaDocument(extractedText)
  const studentPreview = studentFormFromBsa(parsed.fields)

  return NextResponse.json({
    fields: parsed.fields,
    studentPreview,
    warnings: parsed.warnings,
    parser: parsed.parser,
    aiProvider: parsed.provider,
    aiModel: parsed.model,
    sourceFileName: file.name,
  })
}
