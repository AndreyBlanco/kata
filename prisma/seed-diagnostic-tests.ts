/**
 * prisma/seed-diagnostic-tests.ts
 *
 * Parser y seeder de pruebas diagnósticas estructuradas.
 * Fuente: miscelaneos/Pruebas diagnósticas-MD/{N. Dificultad}/{N.G} Prueba ... .md
 *
 * Convierte cada .md de prueba en:
 *   DiagnosticTest
 *     ├── DiagnosticTestActivity (A, B, C, …)
 *     │     ├── DiagnosticTestItem (1, 2, 3, …)   ← tabla "Items evaluados"
 *     │     └── DiagnosticTestRecommendation     ← lista "Recomendaciones disponibles"
 *     └── áreas evaluadas, descripción, etc.
 *
 * Solo se guarda contenido visible para el docente.
 * La sección "## Guía interna para Katá AI" se ignora deliberadamente.
 */

import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

// ─────────────────────────────────────────────────────────────────────────────
// Configuración: mapeo carpeta → dificultad/label
// ─────────────────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..', 'miscelaneos', 'Pruebas diagnósticas-MD')

interface DifficultyConfig {
  folderName: string
  code: string
  label: string
  sortOrder: number
}

const DIFFICULTIES: DifficultyConfig[] = [
  { folderName: '1. Dislexia',          code: 'DISLEXIA',      label: 'Dislexia',          sortOrder: 1 },
  { folderName: '2. Disortografía',     code: 'DISORTOGRAFIA', label: 'Disortografía',     sortOrder: 2 },
  { folderName: '3. Disgrafía',         code: 'DISGRAFIA',     label: 'Disgrafía',         sortOrder: 3 },
  { folderName: '4. Dispraxia',         code: 'DISPRAXIA',     label: 'Dispraxia',         sortOrder: 4 },
  { folderName: '5. Discalculia',       code: 'DISCALCULIA',   label: 'Discalculia',       sortOrder: 5 },
  { folderName: '6. Aprendizaje lento', code: 'APZ_LENTO',     label: 'Aprendizaje lento', sortOrder: 6 },
  { folderName: '7. TDAH',              code: 'TDAH',          label: 'TDAH',              sortOrder: 7 },
  // 8. TANV — pendiente de la docente asesora; se omite del seed.
]

const GRADE_LABELS: Record<string, string> = {
  '1': 'Primer grado',
  '2': 'Segundo grado',
  '3': 'Tercer grado',
  '4': 'Cuarto grado',
  '5': 'Quinto grado',
  '6': 'Sexto grado',
}

// ─────────────────────────────────────────────────────────────────────────────
// Parser
// ─────────────────────────────────────────────────────────────────────────────

interface ParsedItem {
  itemNumber: number
  description: string
}

interface ParsedActivity {
  letter: string
  title: string
  purpose: string | null
  modality: string | null
  estimatedTime: string | null
  materials: string | null
  teacherInstructions: string | null
  applicationMaterial: string | null
  crossDifficulties: string | null
  items: ParsedItem[]
  recommendations: string[]
}

interface ParsedTest {
  title: string
  description: string | null
  areasEvaluated: { label: string; description: string | null }[]
  activities: ParsedActivity[]
}

const STRIP_AI_BLOCK = /<!-- ─+\s*\r?\n\s*INICIO: GU[ÍI]A INTERNA PARA KAT[ÁA] AI[\s\S]*$/m
const STRIP_AI_HEADING = /^## Gu[ií]a interna para Kat[áa] AI[\s\S]*$/m

function stripInternalAiGuide(raw: string): string {
  let cleaned = raw.replace(STRIP_AI_BLOCK, '')
  cleaned = cleaned.replace(STRIP_AI_HEADING, '')
  return cleaned
}

function extractTitle(content: string): string {
  const m = content.match(/^#\s+(.+)$/m)
  return m ? m[1].trim() : ''
}

function extractDescription(content: string): string | null {
  const m = content.match(/^\s*>\s*\*\*Aviso importante\*\*:\s*([\s\S]+?)(?=^\s*$|^---)/m)
  if (m) return m[1].replace(/\s+/g, ' ').trim()
  const scale = content.match(/^\s*>\s*\*\*Escala de evaluaci[óo]n\*\*[\s\S]+?(?=^---)/m)
  return scale ? scale[0].trim() : null
}

function extractAreas(content: string): { label: string; description: string | null }[] {
  const sec = content.match(/^##\s+(?:Áreas|areas) evaluadas[^\n]*\n([\s\S]*?)(?=^---|\n##\s)/m)
  if (!sec) return []
  const lines = sec[1].split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const result: { label: string; description: string | null }[] = []
  for (const line of lines) {
    const m = line.match(/^[-*]\s+\*\*(.+?)\*\*\s*(?:—|-)?\s*(.*)$/)
    if (m) {
      result.push({
        label: m[1].trim(),
        description: m[2]?.trim() || null,
      })
    } else {
      const m2 = line.match(/^[-*]\s+(.+)$/)
      if (m2) result.push({ label: m2[1].trim(), description: null })
    }
  }
  return result
}

/**
 * Extrae bloques con encabezado "## L. Actividad: Titulo".
 */
function extractActivities(content: string): ParsedActivity[] {
  // Soporta dos formatos:
  //   ## A. Actividad: Conciencia Fonológica
  //   ## A. Conciencia Fonológica
  const activityRegex = /^##\s+([A-Z])\.\s+(?:Actividad:\s+)?(.+?)$/gm
  const matches: Array<{ letter: string; title: string; start: number }> = []
  let m: RegExpExecArray | null
  while ((m = activityRegex.exec(content)) !== null) {
    matches.push({ letter: m[1], title: m[2].trim(), start: m.index })
  }
  const activities: ParsedActivity[] = []
  for (let i = 0; i < matches.length; i++) {
    const { letter, title, start } = matches[i]
    const end = i + 1 < matches.length ? matches[i + 1].start : findNextMajorBoundary(content, start)
    const body = content.slice(start, end)
    activities.push(parseActivityBody(letter, title, body))
  }
  return activities
}

function findNextMajorBoundary(content: string, fromIndex: number): number {
  const slice = content.slice(fromIndex + 1)
  const next = slice.search(/\n##\s+(?![A-Z]\.\s)/)
  return next === -1 ? content.length : fromIndex + 1 + next
}

function parseActivityBody(letter: string, title: string, body: string): ParsedActivity {
  const purpose         = extractInline(body, 'Propósito')
  const modality        = extractInline(body, 'Modalidad')
  const estimatedTime   = extractInline(body, 'Tiempo estimado')
  const materials       = extractInline(body, 'Materiales')
  const teacherInstructions = extractBlockAfterLabel(body, ['Instrucciones para el docente', 'Instrucciones docente', 'Instrucciones'])
  const applicationMaterial = extractH3Section(body, /^###\s+(?:Material[^\n]*|Texto de lectura|E\.\d+\s+—\s+[^\n]+)$/m, /^###\s+/m)
  const crossDifficulties   = extractH3Section(body, /^###\s+(?:Posibles cruces[^\n]*|Cruces)$/m, /^###\s+/m)
  const items = extractItemsTable(body)
  const recommendations = extractRecommendations(body)

  return {
    letter,
    title,
    purpose:           purpose            || null,
    modality:          modality           || null,
    estimatedTime:     estimatedTime      || null,
    materials:         materials          || null,
    teacherInstructions: teacherInstructions || null,
    applicationMaterial: applicationMaterial || null,
    crossDifficulties:   crossDifficulties   || null,
    items,
    recommendations,
  }
}

function extractInline(body: string, label: string): string {
  const r = new RegExp('^\\s*\\*\\*' + escapeRe(label) + '\\*\\*\\s*:\\s*(.+)$', 'm')
  const m = body.match(r)
  return m ? m[1].trim() : ''
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function extractBlockAfterLabel(body: string, labels: string[]): string | null {
  for (const label of labels) {
    const r = new RegExp('^\\s*\\*\\*' + escapeRe(label) + '\\*\\*\\s*:?\\s*\\r?\\n([\\s\\S]+?)(?=^###|^\\*\\*|^---|^##)', 'm')
    const m = body.match(r)
    if (m) return m[1].trim()
  }
  return null
}

function extractH3Section(body: string, startRe: RegExp, stopRe: RegExp): string | null {
  const startMatch = body.match(startRe)
  if (!startMatch) return null
  const startIdx = (startMatch.index ?? 0) + startMatch[0].length
  const rest = body.slice(startIdx)
  const stopMatch = rest.match(stopRe)
  const block = stopMatch ? rest.slice(0, stopMatch.index ?? rest.length) : rest
  return block.trim() || null
}

function extractItemsTable(body: string): ParsedItem[] {
  // Aceptamos: "Items evaluados", "Ítems evaluados", "Items", "Ítems"
  const sec = body.match(/^###\s+(?:Items|Ítems)(?:\s+evaluados)?[^\n]*\n([\s\S]+?)(?=^###|^---|^##)/m)
  if (!sec) return []
  const lines = sec[1].split(/\r?\n/)
  const items: ParsedItem[] = []
  for (const raw of lines) {
    const line = raw.trim()
    if (!line.startsWith('|')) continue
    if (/^\|\s*#\s*\|/.test(line)) continue          // header
    if (/^\|\s*-+\s*\|/.test(line)) continue          // separator
    const cells = line.split('|').slice(1, -1).map((c) => c.trim())
    if (cells.length < 2) continue
    const num = parseInt(cells[0], 10)
    if (Number.isNaN(num)) continue
    const desc = cells[1].trim()
    if (!desc) continue
    items.push({ itemNumber: num, description: desc })
  }
  return items
}

function extractRecommendations(body: string): string[] {
  const sec = body.match(/^###\s+Recomendaciones(?:\s+disponibles)?[\s\S]+?(?=^###|^---|^##)/m)
  if (!sec) return []
  const lines = sec[0].split(/\r?\n/)
  const items: string[] = []
  for (const raw of lines) {
    const m = raw.match(/^\s*[-*]\s+☐\s+(.+)$/) || raw.match(/^\s*[-*]\s+\[\s\]\s+(.+)$/)
    if (m) items.push(m[1].trim())
  }
  return items
}

function parseTest(raw: string): ParsedTest {
  const content = stripInternalAiGuide(raw)
  return {
    title:          extractTitle(content),
    description:    extractDescription(content),
    areasEvaluated: extractAreas(content),
    activities:     extractActivities(content),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Seeder
// ─────────────────────────────────────────────────────────────────────────────

async function seedFromFolder(diff: DifficultyConfig): Promise<{ inserted: number; activities: number; items: number; recommendations: number; warnings: string[] }> {
  const dir = path.join(ROOT, diff.folderName)
  if (!fs.existsSync(dir)) {
    return { inserted: 0, activities: 0, items: 0, recommendations: 0, warnings: [`Carpeta no encontrada: ${dir}`] }
  }
  const files = fs.readdirSync(dir).filter((f) => /^\d+\.\d+\s.*\.md$/i.test(f)).sort()

  let inserted = 0
  let totalActs = 0
  let totalItems = 0
  let totalRecs = 0
  const warnings: string[] = []

  for (const file of files) {
    const m = file.match(/^(\d+)\.(\d+)\s/)
    if (!m) continue
    const grade = m[2]
    const gradeLabel = GRADE_LABELS[grade]
    if (!gradeLabel) { warnings.push(`Grado desconocido en ${file}`); continue }

    const raw = fs.readFileSync(path.join(dir, file), 'utf8')
    const parsed = parseTest(raw)
    if (parsed.activities.length === 0) {
      warnings.push(`Sin actividades parseadas en ${file}`)
      continue
    }

    const code = `${diff.code}_${grade}`

    await prisma.$transaction(async (tx) => {
      // BD remota → necesitamos margen amplio (75+ inserts por prueba)
      // upsert test (replace-or-create por (difficulty, grade))
      const existing = await tx.diagnosticTest.findUnique({
        where: { difficulty_grade: { difficulty: diff.code, grade } },
      })

      if (existing) {
        // Borra estructura hija antes de recrear (no hay aplicaciones en E′-1 todavía)
        await tx.diagnosticTestRecommendation.deleteMany({
          where: { activity: { testId: existing.id } },
        })
        await tx.diagnosticTestItem.deleteMany({
          where: { activity: { testId: existing.id } },
        })
        await tx.diagnosticTestActivity.deleteMany({ where: { testId: existing.id } })
        await tx.diagnosticTest.update({
          where: { id: existing.id },
          data: {
            code,
            difficultyLabel: diff.label,
            gradeLabel,
            title: parsed.title || `Prueba de ${diff.label} ${gradeLabel}`,
            description: parsed.description,
            areasEvaluated: parsed.areasEvaluated,
            sourceFile: path.relative(path.resolve(__dirname, '..'), path.join(dir, file)),
            sortOrder: diff.sortOrder,
            active: true,
          },
        })
      } else {
        await tx.diagnosticTest.create({
          data: {
            code,
            difficulty:      diff.code,
            difficultyLabel: diff.label,
            grade,
            gradeLabel,
            title:           parsed.title || `Prueba de ${diff.label} ${gradeLabel}`,
            description:     parsed.description,
            areasEvaluated:  parsed.areasEvaluated,
            sourceFile:      path.relative(path.resolve(__dirname, '..'), path.join(dir, file)),
            sortOrder:       diff.sortOrder,
            active:          true,
          },
        })
      }

      const test = await tx.diagnosticTest.findUnique({
        where: { difficulty_grade: { difficulty: diff.code, grade } },
      })
      if (!test) throw new Error(`No se pudo localizar prueba ${code}`)

      for (let a = 0; a < parsed.activities.length; a++) {
        const act = parsed.activities[a]
        const activityRow = await tx.diagnosticTestActivity.create({
          data: {
            testId:              test.id,
            letter:              act.letter,
            title:               act.title,
            purpose:             act.purpose,
            modality:            act.modality,
            estimatedTime:       act.estimatedTime,
            materials:           act.materials,
            teacherInstructions: act.teacherInstructions,
            applicationMaterial: act.applicationMaterial,
            crossDifficulties:   act.crossDifficulties,
            sortOrder:           a,
          },
        })
        totalActs++
        for (let i = 0; i < act.items.length; i++) {
          const it = act.items[i]
          await tx.diagnosticTestItem.create({
            data: {
              activityId:  activityRow.id,
              itemNumber:  it.itemNumber,
              description: it.description,
              sortOrder:   i,
            },
          })
          totalItems++
        }
        for (let r = 0; r < act.recommendations.length; r++) {
          await tx.diagnosticTestRecommendation.create({
            data: {
              activityId: activityRow.id,
              text:       act.recommendations[r],
              sortOrder:  r,
            },
          })
          totalRecs++
        }
      }
    }, { timeout: 90000, maxWait: 30000 })

    inserted++
    process.stdout.write(`  ✓ ${diff.label} ${gradeLabel}: ${parsed.activities.length} actividades\n`)
  }

  return { inserted, activities: totalActs, items: totalItems, recommendations: totalRecs, warnings }
}

async function main() {
  if (!fs.existsSync(ROOT)) {
    console.error(`No se encontró la carpeta: ${ROOT}`)
    process.exit(1)
  }
  console.log('▶ Sembrando pruebas diagnósticas estructuradas…\n')
  let totalTests = 0
  let totalActs  = 0
  let totalItems = 0
  let totalRecs  = 0
  const warnings: string[] = []
  for (const diff of DIFFICULTIES) {
    console.log(`◇ ${diff.label}`)
    const r = await seedFromFolder(diff)
    totalTests += r.inserted
    totalActs  += r.activities
    totalItems += r.items
    totalRecs  += r.recommendations
    warnings.push(...r.warnings)
  }
  console.log(`\n✔ ${totalTests} pruebas · ${totalActs} actividades · ${totalItems} items · ${totalRecs} recomendaciones.`)
  if (warnings.length) {
    console.log('\n⚠️  Avisos:')
    for (const w of warnings) console.log('  •', w)
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
