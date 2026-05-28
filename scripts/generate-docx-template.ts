/**
 * CLI — generar plantilla DOCX desde BSA anotada en verde.
 *
 * Uso: npm run docx:template
 *      npm run docx:template -- --input miscelaneos/BSA-2026.docx
 */

import path from 'path'
import {
  generateBsa2026Template,
  writeTemplateRegistry,
} from '../lib/docx-template/generator'

const ROOT = process.cwd()

function arg(name: string): string | undefined {
  const idx = process.argv.indexOf(name)
  if (idx === -1 || idx + 1 >= process.argv.length) return undefined
  return process.argv[idx + 1]
}

const input = arg('--input') ?? path.join(ROOT, 'miscelaneos/BSA-2026.docx')
const outputDocx = path.join(ROOT, 'templates/bsa-2026.docx')
const manifestPath = path.join(ROOT, 'templates/bsa-2026.manifest.json')
const registryPath = path.join(ROOT, 'templates/registry.json')

console.log('Generando plantilla BSA 2026…')
console.log(`  Entrada:  ${input}`)
console.log(`  Salida:   ${outputDocx}`)

const result = generateBsa2026Template({
  sourcePath: input,
  outputDocxPath: outputDocx,
  manifestPath,
  sourceLabel: path.relative(ROOT, input),
})

writeTemplateRegistry(registryPath, [
  {
    id: 'bsa-2026',
    documentType: 'BSA',
    templateVersion: '2026',
    file: 'templates/bsa-2026.docx',
    manifest: 'templates/bsa-2026.manifest.json',
    effectiveFrom: '2026-01-01',
    source: path.relative(ROOT, input),
    dataSchema: 'StudentBsaFields',
  },
])

console.log('\n✓ Plantilla generada')
console.log(`  Campos reemplazados: ${result.manifest.stats.greenRunsReplaced}`)
console.log(`  Runs verdes:         ${result.manifest.stats.greenRunsFound}`)
console.log(`  Omitidos:            ${result.manifest.stats.skipped}`)

if (result.manifest.stats.warnings.length > 0) {
  console.log('\nAdvertencias:')
  for (const w of result.manifest.stats.warnings) {
    console.log(`  - ${w}`)
  }
}

console.log(`\nManifest: ${manifestPath}`)
console.log(`Registry: ${registryPath}`)
