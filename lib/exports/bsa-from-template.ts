/**
 * Exportación BSA fiel — plantilla OOXML + docxtemplater.
 */

import fs from 'fs'
import path from 'path'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import { BSA_TEMPLATE_VERSION } from '@/lib/bsa-types'
import type { StudentBsaFields } from '@/lib/bsa-types'
import { mapBsaToTemplatePayload } from '@/lib/exports/map-bsa-to-template'

const TEMPLATE_FILENAME = `bsa-${BSA_TEMPLATE_VERSION}.docx`

export function getBsaTemplatePath(): string {
  return path.join(process.cwd(), 'templates', TEMPLATE_FILENAME)
}

export function bsaTemplateExists(): boolean {
  return fs.existsSync(getBsaTemplatePath())
}

export function renderBsaFromTemplate(fields: StudentBsaFields): Buffer {
  const templatePath = getBsaTemplatePath()
  if (!fs.existsSync(templatePath)) {
    throw new Error(
      `Plantilla BSA no encontrada en ${templatePath}. Ejecute: npm run docx:template`,
    )
  }

  const content = fs.readFileSync(templatePath)
  const zip = new PizZip(content)

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => '',
  })

  doc.render(mapBsaToTemplatePayload(fields) as Record<string, unknown>)

  return doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  })
}
