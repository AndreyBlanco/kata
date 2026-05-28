/**
 * POST /api/dev/docx-templates — Generar plantilla desde DOCX anotado (solo desarrollo).
 */

import fs from 'fs'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'
import {
  generateBsa2026Template,
  writeTemplateRegistry,
} from '@/lib/docx-template/generator'

export const runtime = 'nodejs'

function devOnly(): NextResponse | null {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Herramienta disponible solo en desarrollo.' }, { status: 403 })
  }
  return null
}

export async function POST(req: NextRequest) {
  const blocked = devOnly()
  if (blocked) return blocked

  const form = await req.formData()
  const file = form.get('file')
  const documentType = String(form.get('documentType') ?? 'BSA')
  const templateVersion = String(form.get('templateVersion') ?? '2026')

  if (documentType !== 'BSA' || templateVersion !== '2026') {
    return NextResponse.json(
      { error: 'Solo BSA 2026 está soportado en el piloto.' },
      { status: 400 },
    )
  }

  const root = process.cwd()
  let sourcePath = path.join(root, 'miscelaneos/BSA-2026.docx')

  if (file instanceof File && file.size > 0) {
    const tmpDir = path.join(root, '.tmp/docx-templates')
    fs.mkdirSync(tmpDir, { recursive: true })
    sourcePath = path.join(tmpDir, `upload-${Date.now()}.docx`)
    fs.writeFileSync(sourcePath, Buffer.from(await file.arrayBuffer()))
  }

  if (!fs.existsSync(sourcePath)) {
    return NextResponse.json({ error: `Archivo fuente no encontrado: ${sourcePath}` }, { status: 404 })
  }

  const outputDocx = path.join(root, 'templates/bsa-2026.docx')
  const manifestPath = path.join(root, 'templates/bsa-2026.manifest.json')
  const registryPath = path.join(root, 'templates/registry.json')

  const result = generateBsa2026Template({
    sourcePath,
    outputDocxPath: outputDocx,
    manifestPath,
    sourceLabel: file instanceof File ? file.name : path.relative(root, sourcePath),
  })

  writeTemplateRegistry(registryPath, [
    {
      id: 'bsa-2026',
      documentType: 'BSA',
      templateVersion: '2026',
      file: 'templates/bsa-2026.docx',
      manifest: 'templates/bsa-2026.manifest.json',
      effectiveFrom: '2026-01-01',
      source: file instanceof File ? file.name : 'miscelaneos/BSA-2026.docx',
      dataSchema: 'StudentBsaFields',
    },
  ])

  return NextResponse.json({
    ok: true,
    outputDocx: path.relative(root, outputDocx),
    manifest: result.manifest,
  })
}

export async function GET() {
  const blocked = devOnly()
  if (blocked) return blocked

  const root = process.cwd()
  const manifestPath = path.join(root, 'templates/bsa-2026.manifest.json')
  const templatePath = path.join(root, 'templates/bsa-2026.docx')

  let manifest = null
  if (fs.existsSync(manifestPath)) {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  }

  return NextResponse.json({
    templateExists: fs.existsSync(templatePath),
    manifest,
  })
}
