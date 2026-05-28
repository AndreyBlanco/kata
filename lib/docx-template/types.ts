/** Tipos compartidos del pipeline DOCX → plantilla docxtemplater. */

export type TemplateFieldType = 'text' | 'multiline' | 'date' | 'checkbox'

export type TemplateFieldDef = {
  /** Identificador estable en manifest y payload. */
  id: string
  /** Marcador docxtemplater sin llaves externas. */
  marker: string
  /** Ruta en el schema Katà (ej. institution.centerName). */
  schemaPath: string
  label: string
  type: TemplateFieldType
  required?: boolean
}

export type TemplateManifest = {
  id: string
  documentType: string
  templateVersion: string
  sourceFile: string
  generatedAt: string
  dataSchema: string
  fields: TemplateFieldDef[]
  stats: {
    greenRunsFound: number
    greenRunsReplaced: number
    skipped: number
    warnings: string[]
  }
}

export type TemplateRegistryEntry = {
  id: string
  documentType: string
  templateVersion: string
  file: string
  manifest: string
  effectiveFrom: string
  source: string
  dataSchema: string
}

export type GenerateTemplateOptions = {
  sourcePath: string
  outputDocxPath: string
  manifestPath: string
  documentType: string
  templateVersion: string
  dataSchema: string
  fields: TemplateFieldDef[]
  /** Textos verdes que se dejan fijos (sin marcador). */
  skipTexts?: string[]
}

export type GenerateTemplateResult = {
  manifest: TemplateManifest
  outputDocxPath: string
}
