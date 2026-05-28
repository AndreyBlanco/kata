/**
 * Utilidades OOXML: detectar runs verdes (#00B050) e inyectar marcadores docxtemplater.
 */

const GREEN_COLOR = '00B050'
const RED_COLOR = 'FF0000'

export function isGreenRun(runXml: string): boolean {
  return new RegExp(`w:color w:val="${GREEN_COLOR}"`).test(runXml)
}

export function isRedRun(runXml: string): boolean {
  return new RegExp(`w:color w:val="${RED_COLOR}"`).test(runXml)
}

export function extractRunText(runXml: string): string {
  return [...runXml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)]
    .map((m) => decodeXmlText(m[1]))
    .join('')
}

function decodeXmlText(raw: string): string {
  return raw
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

function encodeXmlText(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Quita color verde del run para que el marcador quede con estilo normal. */
export function stripGreenColor(runXml: string): string {
  return runXml.replace(/<w:color w:val="00B050"\s*\/>/g, '')
}

/** Reemplaza el texto del run por un marcador docxtemplater. */
export function replaceRunWithMarker(runXml: string, marker: string): string {
  let out = stripGreenColor(runXml)
  const encoded = encodeXmlText(marker)

  if (/<w:t[\s\S]*?<\/w:t>/.test(out)) {
    out = out.replace(/<w:t(?:\s[^>]*)?>[\s\S]*?<\/w:t>/, `<w:t>${encoded}</w:t>`)
    return out
  }

  // Run sin w:t (p.ej. celda vacía con solo formato)
  return out.replace(
    /<\/w:rPr>/,
    `</w:rPr><w:t xml:space="preserve">${encoded}</w:t>`,
  )
}

export type GreenRunGroup = {
  paragraphXml: string
  startRunIndex: number
  endRunIndex: number
  runs: string[]
  mergedText: string
}

/**
 * Agrupa runs verdes consecutivos dentro del mismo párrafo.
 */
export function groupGreenRunsInParagraph(paragraphXml: string): GreenRunGroup[] {
  const runRegex = /<w:r[\s\S]*?<\/w:r>/g
  const runs = [...paragraphXml.matchAll(runRegex)].map((m) => m[0])
  const groups: GreenRunGroup[] = []

  let i = 0
  while (i < runs.length) {
    if (!isGreenRun(runs[i])) {
      i++
      continue
    }

    const start = i
    const chunk: string[] = [runs[i]]
    i++

    while (i < runs.length && isGreenRun(runs[i])) {
      chunk.push(runs[i])
      i++
    }

    groups.push({
      paragraphXml,
      startRunIndex: start,
      endRunIndex: i - 1,
      runs: chunk,
      mergedText: chunk.map(extractRunText).join('').trim(),
    })
  }

  return groups
}

/** Aplica reemplazos de grupos verdes en un párrafo. */
export function applyGreenGroupReplacements(
  paragraphXml: string,
  replacements: Array<{ group: GreenRunGroup; marker: string | null }>,
): string {
  if (replacements.length === 0) return paragraphXml

  const runRegex = /<w:r[\s\S]*?<\/w:r>/g
  const runs = [...paragraphXml.matchAll(runRegex)].map((m) => m[0])

  for (const { group, marker } of replacements) {
    if (marker === null) {
      // skip: quitar verde, conservar texto
      for (let r = group.startRunIndex; r <= group.endRunIndex; r++) {
        runs[r] = stripGreenColor(runs[r])
      }
      continue
    }

    runs[group.startRunIndex] = replaceRunWithMarker(runs[group.startRunIndex], marker)
    for (let r = group.startRunIndex + 1; r <= group.endRunIndex; r++) {
      runs[r] = stripGreenColor(runs[r]).replace(
        /<w:t(?:\s[^>]*)?>[\s\S]*?<\/w:t>/,
        '<w:t></w:t>',
      )
    }
  }

  let runIdx = 0
  return paragraphXml.replace(runRegex, () => runs[runIdx++] ?? '')
}

/** Partes OOXML que pueden contener campos editables. */
export const EDITABLE_OOXML_PARTS = [
  'word/document.xml',
  'word/header1.xml',
  'word/header2.xml',
  'word/header3.xml',
  'word/footer1.xml',
  'word/footer2.xml',
  'word/footer3.xml',
] as const

export function countGreenRuns(xml: string): number {
  return [...xml.matchAll(/<w:r[\s\S]*?<\/w:r>/g)].filter((m) => isGreenRun(m[0])).length
}

export function countRedRuns(xml: string): number {
  return [...xml.matchAll(/<w:r[\s\S]*?<\/w:r>/g)].filter((m) => isRedRun(m[0])).length
}
