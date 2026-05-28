/**
 * lib/bsa-parser.ts
 *
 * Extrae StudentBsaFields desde texto plano de un DOCX BSA MEP 2026.
 * Estrategia: heurística por etiquetas + secciones; IA opcional para huecos.
 */

import { completeChat, getAssistantConfig, type AssistantProvider } from '@/lib/assistant/client'
import { BSA_PARSE_SYSTEM_PROMPT, bsaParseUserPrompt } from '@/lib/assistant/bsa-prompts'
import {
  BSA_SERVICE_CODES,
  type BsaServiceCode,
  emptyStudentBsaFields,
  parseStudentBsaFields,
  type StudentBsaFields,
} from '@/lib/bsa-types'
import { sanitizeBsaParsedFields } from '@/lib/bsa-parse-cleanup'

export type BsaParseOutcome = {
  fields: StudentBsaFields
  warnings: string[]
  parser: 'heuristic' | 'ai' | 'hybrid'
  provider: AssistantProvider | 'local' | null
  model: string | null
}

/** Etiquetas alternativas por campo (orden de preferencia). */
const FIELD_LABELS: Record<string, string[]> = {
  centerName: [
    'nombre de la institución educativa',
    'nombre de la institución',
    'nombre institución',
    'institución educativa',
  ],
  circuit: ['circuito'],
  budgetCode: ['código presupuestario', 'codigo presupuestario'],
  directorName: ['nombre del director', 'director'],
  referenceDate: [
    'fecha de confección de la referencia',
    'fecha de confeccion de la referencia',
    'fecha confección referencia',
  ],
  fullName: ['nombre completo'],
  birthDate: ['fecha de nacimiento', 'fecha nacimiento'],
  ageAsWritten: ['edad'],
  cedula: ['número de cédula', 'numero de cedula', 'n° de cédula', 'cédula'],
  contactPhone: [
    'número de persona contacto',
    'numero de persona contacto',
    'teléfono de contacto',
    'telefono de contacto',
  ],
  legalGuardian: ['encargado legal', 'persona encargada'],
  residence: ['lugar de residencia', 'residencia'],
  referringTeacher: ['docente que refiere', 'docente de grado que refiere'],
  grade: ['grado que cursa', 'grado', 'sección que cursa'],
}

const SERVICE_KEYWORDS: Array<{ code: BsaServiceCode; patterns: RegExp[] }> = [
  {
    code: 'aprendizaje',
    patterns: [/servicio de apoyo educativo en aprendizaje/i, /\baprendizaje\b/i],
  },
  {
    code: 'discapacidad_intelectual',
    patterns: [/discapacidad intelectual/i, /retardo mental/i],
  },
  {
    code: 'discapacidad_visual',
    patterns: [/discapacidad visual/i],
  },
  {
    code: 'audicion_lenguaje',
    patterns: [/audici[oó]n y lenguaje/i],
  },
  {
    code: 'terapia_lenguaje',
    patterns: [/terapia del lenguaje/i],
  },
  {
    code: 'discapacidad_multiple',
    patterns: [/discapacidad m[uú]ltiple/i],
  },
]

const MARK_RE = /\b[Xx×✓✔☑]\b|^\s*X\s*$/i

function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function parseCrDateToIso(raw: string): string {
  const t = raw.trim()
  if (!t) return ''
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) return t

  const dmy = t.match(/(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/)
  if (dmy) {
    const d = dmy[1].padStart(2, '0')
    const m = dmy[2].padStart(2, '0')
    return `${dmy[3]}-${m}-${d}`
  }
  return ''
}

function extractByLabels(text: string, labels: string[]): string {
  for (const label of labels) {
    const labelRe = escapeRegExp(label).replace(/\s+/g, '\\s+')

    const sameLine = new RegExp(`${labelRe}\\s*:?\\s*(.+?)(?:\\n|$)`, 'i')
    const m1 = text.match(sameLine)
    if (m1?.[1]?.trim()) {
      const val = m1[1].trim()
      if (!/^[\-–—]+$/.test(val)) return val
    }

    const nextLine = new RegExp(`${labelRe}\\s*:?\\s*\\n\\s*(.+?)(?:\\n|$)`, 'i')
    const m2 = text.match(nextLine)
    if (m2?.[1]?.trim()) {
      const val = m2[1].trim()
      if (!/^[\-–—]+$/.test(val)) return val
    }
  }
  return ''
}

function extractSection(text: string, startPattern: RegExp, endPattern: RegExp): string {
  const startMatch = text.match(startPattern)
  if (!startMatch || startMatch.index === undefined) return ''

  const bodyStart = startMatch.index + startMatch[0].length
  const rest = text.slice(bodyStart)
  const endMatch = rest.match(endPattern)
  const body = endMatch ? rest.slice(0, endMatch.index) : rest

  return body
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !/^[\-–—]+$/.test(l))
    .join('\n')
    .trim()
}

function parseServicesFromText(text: string): StudentBsaFields['request']['servicesRequested'] {
  const services = emptyStudentBsaFields().request.servicesRequested

  const serviceBlock = extractSection(
    text,
    /servicios de apoyo solicitados/i,
    /determinaci[oó]n del apoyo|fechas de valoraci[oó]n|consignaci[oó]n de la forma|firma/i,
  )

  const scanText = serviceBlock || text
  const lines = scanText.split('\n').map((l) => l.trim()).filter(Boolean)

  for (const line of lines) {
    for (const { code, patterns } of SERVICE_KEYWORDS) {
      if (!patterns.some((p) => p.test(line))) continue
      if (MARK_RE.test(line)) {
        services[code] = true
      }
    }
  }

  // Tablas Word a veces ponen la X en la línea siguiente
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i]
    const next = lines[i + 1]
    if (!MARK_RE.test(next)) continue
    for (const { code, patterns } of SERVICE_KEYWORDS) {
      if (patterns.some((p) => p.test(line))) services[code] = true
    }
  }

  return services
}

function parseViDates(text: string): string[] {
  const block = extractSection(
    text,
    /fechas de valoraci[oó]n integral/i,
    /consignaci[oó]n de la forma|determinaci[oó]n del apoyo|firma/i,
  )

  const source = block || text
  const dates: string[] = []

  for (const m of source.matchAll(/(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{4}|\d{4}-\d{2}-\d{2})/g)) {
    const iso = parseCrDateToIso(m[1])
    if (iso && !dates.includes(iso)) dates.push(iso)
  }

  return dates.length > 0 ? dates : ['']
}

function heuristicParse(documentText: string): StudentBsaFields {
  const text = normalizeText(documentText)
  const fields = emptyStudentBsaFields()

  fields.institution.centerName = extractByLabels(text, FIELD_LABELS.centerName)
  fields.institution.circuit = extractByLabels(text, FIELD_LABELS.circuit)
  fields.institution.budgetCode = extractByLabels(text, FIELD_LABELS.budgetCode)
  fields.institution.directorName = extractByLabels(text, FIELD_LABELS.directorName)
  fields.institution.referenceDate = parseCrDateToIso(
    extractByLabels(text, FIELD_LABELS.referenceDate),
  )

  fields.student.fullName = extractByLabels(text, FIELD_LABELS.fullName)
  fields.student.birthDate = parseCrDateToIso(extractByLabels(text, FIELD_LABELS.birthDate))
  fields.student.ageAsWritten = extractByLabels(text, FIELD_LABELS.ageAsWritten)
  fields.student.cedula = extractByLabels(text, FIELD_LABELS.cedula)
  fields.student.contactPhone = extractByLabels(text, FIELD_LABELS.contactPhone)
  fields.student.legalGuardian = extractByLabels(text, FIELD_LABELS.legalGuardian)
  fields.student.residence = extractByLabels(text, FIELD_LABELS.residence)
  fields.student.referringTeacher = extractByLabels(text, FIELD_LABELS.referringTeacher)
  fields.student.grade = extractByLabels(text, FIELD_LABELS.grade)

  fields.request.educationalSituations = extractSection(
    text,
    /situaciones educativas[^\n]*/i,
    /horario de la persona estudiante|servicios de apoyo solicitados|determinaci[oó]n del apoyo/i,
  )

  fields.request.studentSchedule = extractSection(
    text,
    /horario de la persona estudiante/i,
    /servicios de apoyo solicitados|determinaci[oó]n del apoyo|fechas de valoraci[oó]n/i,
  )

  fields.request.servicesRequested = parseServicesFromText(text)

  fields.resolution.supportDetermination = extractSection(
    text,
    /determinaci[oó]n del apoyo educativo por brindar/i,
    /fechas de valoraci[oó]n integral|consignaci[oó]n de la forma|firma/i,
  )

  fields.resolution.viSessionDates = parseViDates(text)

  fields.resolution.serviceProvisionNotes = extractSection(
    text,
    /consignaci[oó]n de la forma en que se brindar[aá] el servicio/i,
    /firma|v[\s°]?b[\s°]?|nombre y firma/i,
  )

  return sanitizeBsaParsedFields(fields)
}

function parseJsonStrict(raw: string): unknown {
  const trimmed = raw.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return JSON.parse(trimmed)
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenceMatch) return JSON.parse(fenceMatch[1].trim())
  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1))
  }
  throw new Error('La respuesta no contiene JSON válido.')
}

function mergeFields(base: StudentBsaFields, patch: StudentBsaFields): StudentBsaFields {
  const out = parseStudentBsaFields(base)

  const mergeStr = (current: string, next: string) =>
    current.trim().length > 0 ? current : next

  out.institution.centerName = mergeStr(out.institution.centerName, patch.institution.centerName)
  out.institution.circuit = mergeStr(out.institution.circuit, patch.institution.circuit)
  out.institution.budgetCode = mergeStr(out.institution.budgetCode, patch.institution.budgetCode)
  out.institution.directorName = mergeStr(out.institution.directorName, patch.institution.directorName)
  out.institution.referenceDate = mergeStr(
    out.institution.referenceDate,
    patch.institution.referenceDate,
  )

  out.student.fullName = mergeStr(out.student.fullName, patch.student.fullName)
  out.student.birthDate = mergeStr(out.student.birthDate, patch.student.birthDate)
  out.student.ageAsWritten = mergeStr(out.student.ageAsWritten, patch.student.ageAsWritten)
  out.student.cedula = mergeStr(out.student.cedula, patch.student.cedula)
  out.student.contactPhone = mergeStr(out.student.contactPhone, patch.student.contactPhone)
  out.student.legalGuardian = mergeStr(out.student.legalGuardian, patch.student.legalGuardian)
  out.student.residence = mergeStr(out.student.residence, patch.student.residence)
  out.student.referringTeacher = mergeStr(
    out.student.referringTeacher,
    patch.student.referringTeacher,
  )
  out.student.grade = mergeStr(out.student.grade, patch.student.grade)

  out.request.educationalSituations = mergeStr(
    out.request.educationalSituations,
    patch.request.educationalSituations,
  )
  out.request.studentSchedule = mergeStr(
    out.request.studentSchedule,
    patch.request.studentSchedule,
  )

  for (const code of BSA_SERVICE_CODES) {
    if (!out.request.servicesRequested[code] && patch.request.servicesRequested[code]) {
      out.request.servicesRequested[code] = true
    }
  }

  out.resolution.supportDetermination = mergeStr(
    out.resolution.supportDetermination,
    patch.resolution.supportDetermination,
  )
  out.resolution.serviceProvisionNotes = mergeStr(
    out.resolution.serviceProvisionNotes,
    patch.resolution.serviceProvisionNotes,
  )

  const patchDates = patch.resolution.viSessionDates.filter((d) => d.trim().length > 0)
  const baseDates = out.resolution.viSessionDates.filter((d) => d.trim().length > 0)
  if (baseDates.length === 0 && patchDates.length > 0) {
    out.resolution.viSessionDates = patchDates
  }

  return out
}

function collectWarnings(fields: StudentBsaFields): string[] {
  const warnings: string[] = []
  if (!fields.student.fullName.trim()) warnings.push('No se detectó el nombre completo del estudiante.')
  if (!fields.student.birthDate.trim()) warnings.push('No se detectó la fecha de nacimiento.')
  if (!fields.student.grade.trim()) warnings.push('No se detectó el grado o sección.')
  if (!fields.request.educationalSituations.trim()) {
    warnings.push('No se detectó el párrafo de situaciones educativas.')
  }
  if (!fields.institution.referenceDate.trim()) {
    warnings.push('No se detectó la fecha de confección de la referencia.')
  }
  const anyService = BSA_SERVICE_CODES.some((c) => fields.request.servicesRequested[c])
  if (!anyService) warnings.push('No se detectó ningún servicio de apoyo marcado.')
  return warnings
}

function needsAiAssist(fields: StudentBsaFields): boolean {
  return (
    !fields.student.fullName.trim() ||
    !fields.request.educationalSituations.trim() ||
    (!fields.student.birthDate.trim() && !fields.student.grade.trim())
  )
}

export async function parseBsaDocument(documentText: string): Promise<BsaParseOutcome> {
  let fields = heuristicParse(documentText)
  let parser: BsaParseOutcome['parser'] = 'heuristic'
  let provider: BsaParseOutcome['provider'] = 'local'
  let model: string | null = 'heuristic'

  const cfg = getAssistantConfig()
  if (cfg.configured && needsAiAssist(fields)) {
    try {
      const completion = await completeChat(
        BSA_PARSE_SYSTEM_PROMPT,
        bsaParseUserPrompt(documentText),
      )
      if (completion?.text) {
        const aiRaw = parseJsonStrict(completion.text)
        const aiFields = parseStudentBsaFields(aiRaw)
        fields = mergeFields(fields, aiFields)
        parser = parser === 'heuristic' ? 'hybrid' : 'ai'
        provider = completion.provider
        model = completion.model
      }
    } catch {
      // Mantener heurística si la IA falla
    }
  }

  const warnings = collectWarnings(fields)
  return { fields: sanitizeBsaParsedFields(fields), warnings, parser, provider, model }
}
