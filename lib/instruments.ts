import { prisma } from '@/lib/prisma'

export type InstrumentCatalogEntry = {
  code: string
  label: string
}

/** Instrumentos core del Informe VI 2026 — fallback sin BD */
export const CORE_INSTRUMENT_LABELS: Record<string, string> = {
  INS_OBS_AULA: 'Observación en aula',
  INS_OBS_OTROS: 'Observación en otros contextos',
  INS_REG_OBS: 'Registros de observación',
  INS_ENT_FAMILIA: 'Entrevista a familia',
  INS_ENT_DOCENTES: 'Entrevista a docentes',
  INS_CURR_BASE: 'Instrumentos basados en el currículo',
  INS_EVAL_DIAG: 'Evaluaciones diagnósticas en asignaturas básicas',
  INS_ESCALA_CALIF: 'Escala de calificación',
  INS_LISTA_COTEJO: 'Lista de cotejo',
}

const CORE_LABEL_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(CORE_INSTRUMENT_LABELS).map(([code, label]) => [
    label.toLowerCase(),
    code,
  ]),
)

export function isInstrumentCode(value: string): boolean {
  return value.startsWith('INS_') || value.startsWith('CUSTOM_')
}

export function resolveInstrumentCode(
  value: string,
  catalog: InstrumentCatalogEntry[] = [],
): string {
  const v = value.trim()
  if (!v) return v

  const byCode = catalog.find((c) => c.code === v)
  if (byCode) return byCode.code

  const byLabel = catalog.find((c) => c.label.toLowerCase() === v.toLowerCase())
  if (byLabel) return byLabel.code

  if (isInstrumentCode(v) && (CORE_INSTRUMENT_LABELS[v] || v.startsWith('CUSTOM_'))) {
    return v
  }

  const coreCode = CORE_LABEL_TO_CODE[v.toLowerCase()]
  if (coreCode) return coreCode

  return v
}

export function resolveInstrumentLabel(
  code: string,
  catalog: InstrumentCatalogEntry[] = [],
): string {
  const fromCatalog = catalog.find((c) => c.code === code)
  if (fromCatalog) return fromCatalog.label
  return CORE_INSTRUMENT_LABELS[code] ?? code
}

export function normalizeInstrumentCodes(
  values: string[],
  catalog: InstrumentCatalogEntry[] = [],
): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    const code = resolveInstrumentCode(value, catalog)
    if (!code || seen.has(code)) continue
    seen.add(code)
    result.push(code)
  }
  return result
}

export function normalizeInstrumentNotes(
  notes: Record<string, string>,
  catalog: InstrumentCatalogEntry[] = [],
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, text] of Object.entries(notes ?? {})) {
    const code = resolveInstrumentCode(key, catalog)
    const trimmed = text.trim()
    if (!trimmed) continue
    const existing = result[code]?.trim()
    result[code] = existing ? `${existing}\n\n${trimmed}` : trimmed
  }
  return result
}

export function mergeInstrumentSelection(
  existing: string[],
  additions: string[],
  catalog: InstrumentCatalogEntry[] = [],
): string[] {
  return normalizeInstrumentCodes([...existing, ...additions], catalog)
}

export async function loadInstrumentCatalog(): Promise<InstrumentCatalogEntry[]> {
  const rows = await prisma.assessmentInstrument.findMany({
    where: { active: true },
    select: { code: true, label: true },
    orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
  })
  return rows
}

export async function normalizeAssessmentInstruments(
  instruments: string[],
  instrumentNotes: unknown,
): Promise<{ instruments: string[]; instrumentNotes: Record<string, string> }> {
  const catalog = await loadInstrumentCatalog()
  return prepareAssessmentInstruments(instruments, instrumentNotes, catalog)
}

export function prepareAssessmentInstruments(
  instruments: string[],
  instrumentNotes: unknown,
  catalog: InstrumentCatalogEntry[] = [],
): { instruments: string[]; instrumentNotes: Record<string, string> } {
  return {
    instruments: normalizeInstrumentCodes(instruments, catalog),
    instrumentNotes: normalizeInstrumentNotes(
      (instrumentNotes as Record<string, string>) ?? {},
      catalog,
    ),
  }
}

/** Entradas por defecto para export Word (sección 7) */
export const DEFAULT_VI_INSTRUMENTS: InstrumentCatalogEntry[] = [
  { code: 'INS_OBS_AULA', label: 'Observación en aula' },
  { code: 'INS_OBS_OTROS', label: 'Observación en otros contextos' },
  { code: 'INS_ENT_FAMILIA', label: 'Entrevista a familia' },
  { code: 'INS_ENT_DOCENTES', label: 'Entrevista a docentes' },
  { code: 'INS_CURR_BASE', label: 'Instrumentos basados en el currículo' },
]
