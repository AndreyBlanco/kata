/**
 * Generador de plantilla DOCX desde documento anotado en verde (Fase B).
 */

import fs from 'fs'
import path from 'path'
import PizZip from 'pizzip'
import {
  buildBsa2026GreenAssignments,
  BSA_2026_SKIP_GREEN_TEXTS,
  BSA_2026_TEMPLATE_FIELDS,
  combinedAgeMarker,
  isConsignacionGuideText,
  isServiceCheckboxText,
  isSupportDeterminationPlaceholder,
  isViDatesPlaceholder,
  markerForAssignment,
  parseCombinedAgeText,
  type BsaGreenAssignment,
} from '@/lib/docx-template/bsa-field-map'
import {
  applyGreenGroupReplacements,
  countGreenRuns,
  countRedRuns,
  EDITABLE_OOXML_PARTS,
  groupGreenRunsInParagraph,
} from '@/lib/docx-template/ooxml-green'
import type {
  GenerateTemplateOptions,
  GenerateTemplateResult,
  TemplateManifest,
} from '@/lib/docx-template/types'

type AssignmentState = {
  index: number
  assignments: BsaGreenAssignment[]
  warnings: string[]
  replaced: number
  skipped: number
}

function nextAssignment(state: AssignmentState, mergedText: string): BsaGreenAssignment | null {
  const text = mergedText.trim()

  if (BSA_2026_SKIP_GREEN_TEXTS.includes(text)) {
    state.skipped++
    return { kind: 'skip', reason: `Texto fijo: ${text}` }
  }

  if (isServiceCheckboxText(text)) {
    const assignment = state.assignments[state.index]
    if (assignment?.kind === 'checkbox') {
      state.index++
      return assignment
    }
    state.warnings.push(`Checkbox "X" sin slot de servicio (índice ${state.index})`)
    return { kind: 'skip', reason: 'X huérfana' }
  }

  if (isViDatesPlaceholder(text)) {
    const assignment = state.assignments[state.index]
    if (assignment?.kind === 'viDatesRow') {
      state.index++
      return assignment
    }
  }

  if (isSupportDeterminationPlaceholder(text)) {
    while (state.index < state.assignments.length) {
      const a = state.assignments[state.index]
      if (a.kind === 'field' && a.field.id === 'resolution_supportDetermination') {
        state.index++
        return a
      }
      state.index++
    }
  }

  if (isConsignacionGuideText(text)) {
    while (state.index < state.assignments.length) {
      const a = state.assignments[state.index]
      if (a.kind === 'field' && a.field.id === 'resolution_serviceProvisionNotes') {
        state.index++
        return a
      }
      state.index++
    }
  }

  const assignment = state.assignments[state.index]
  if (!assignment) {
    state.warnings.push(`Run verde sin asignación: ${JSON.stringify(text.slice(0, 80))}`)
    return { kind: 'skip', reason: 'Sin asignación' }
  }

  if (assignment.kind === 'field' || assignment.kind === 'viDatesRow') {
    state.index++
    return assignment
  }

  if (assignment.kind === 'checkbox') {
    state.warnings.push(
      `Se esperaba checkbox pero llegó texto: ${JSON.stringify(text.slice(0, 80))}`,
    )
    state.index++
    return assignment
  }

  state.index++
  return assignment
}

function processXmlWithAssignments(xml: string, state: AssignmentState): string {
  return xml.replace(/<w:p[\s\S]*?<\/w:p>/g, (paragraphXml) => {
    const groups = groupGreenRunsInParagraph(paragraphXml)
    if (groups.length === 0) return paragraphXml

    const replacements = groups.map((group) => {
      if (parseCombinedAgeText(group.mergedText)) {
        const assignment = state.assignments[state.index]
        if (
          assignment?.kind === 'field' &&
          assignment.field.id === 'student_ageAsWritten'
        ) {
          state.index++
          state.replaced++
          return { group, marker: combinedAgeMarker() }
        }
        state.warnings.push(
          `Texto "Edad: …" fuera de secuencia: ${JSON.stringify(group.mergedText)}`,
        )
        return { group, marker: combinedAgeMarker() }
      }

      const assignment = nextAssignment(state, group.mergedText)
      const marker = assignment ? markerForAssignment(assignment) : null
      if (marker) state.replaced++
      else state.skipped++
      return { group, marker }
    })

    return applyGreenGroupReplacements(paragraphXml, replacements)
  })
}

export function generateBsa2026Template(options: {
  sourcePath: string
  outputDocxPath: string
  manifestPath: string
  sourceLabel?: string
}): GenerateTemplateResult {
  return generateTemplateFromAnnotatedDocx({
    sourcePath: options.sourcePath,
    outputDocxPath: options.outputDocxPath,
    manifestPath: options.manifestPath,
    documentType: 'BSA',
    templateVersion: '2026',
    dataSchema: 'StudentBsaFields',
    fields: BSA_2026_TEMPLATE_FIELDS,
    skipTexts: BSA_2026_SKIP_GREEN_TEXTS,
    sourceLabel: options.sourceLabel,
  })
}

export function generateTemplateFromAnnotatedDocx(
  options: GenerateTemplateOptions & { sourceLabel?: string },
): GenerateTemplateResult {
  const sourceBuffer = fs.readFileSync(options.sourcePath)
  const zip = new PizZip(sourceBuffer)

  const state: AssignmentState = {
    index: 0,
    assignments: buildBsa2026GreenAssignments(),
    warnings: [],
    replaced: 0,
    skipped: 0,
  }

  let greenFound = 0
  let redFound = 0
  const processedParts: string[] = []

  for (const part of EDITABLE_OOXML_PARTS) {
    const file = zip.file(part)
    if (!file) continue

    const original = file.asText()
    greenFound += countGreenRuns(original)
    redFound += countRedRuns(original)

    const processed = processXmlWithAssignments(original, state)
    zip.file(part, processed)
    processedParts.push(part)
  }

  if (state.index < state.assignments.length) {
    const remaining = state.assignments.slice(state.index)
    state.warnings.push(
      `Quedaron ${remaining.length} asignaciones sin consumir: ${remaining
        .map((a) => (a.kind === 'field' ? a.field.id : a.kind))
        .join(', ')}`,
    )
  }

  fs.mkdirSync(path.dirname(options.outputDocxPath), { recursive: true })
  fs.mkdirSync(path.dirname(options.manifestPath), { recursive: true })

  const outBuffer = zip.generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  })
  fs.writeFileSync(options.outputDocxPath, outBuffer)

  const manifest: TemplateManifest = {
    id: `${options.documentType.toLowerCase()}-${options.templateVersion}`,
    documentType: options.documentType,
    templateVersion: options.templateVersion,
    sourceFile: options.sourceLabel ?? path.basename(options.sourcePath),
    generatedAt: new Date().toISOString(),
    dataSchema: options.dataSchema,
    fields: options.fields,
    stats: {
      greenRunsFound: greenFound,
      greenRunsReplaced: state.replaced,
      skipped: state.skipped,
      warnings: state.warnings,
    },
  }

  fs.writeFileSync(options.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')

  return { manifest, outputDocxPath: options.outputDocxPath }
}

export function writeTemplateRegistry(
  registryPath: string,
  entries: Array<{
    id: string
    documentType: string
    templateVersion: string
    file: string
    manifest: string
    effectiveFrom: string
    source: string
    dataSchema: string
  }>,
): void {
  fs.mkdirSync(path.dirname(registryPath), { recursive: true })
  fs.writeFileSync(registryPath, `${JSON.stringify({ templates: entries }, null, 2)}\n`, 'utf8')
}
