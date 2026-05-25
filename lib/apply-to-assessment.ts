import type { InterviewRecord, ObservationRecord } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  INTERVIEW_TYPE_TO_INSTRUMENT,
  INTERVIEW_TYPE_TO_PARTICIPANT,
  OBSERVATION_CONTEXT_TO_INSTRUMENT,
  parseDimensionNotes,
  parseInterviewContent,
  synthesizeInterviewNarrative,
  synthesizeObservationNarrative,
  mergeTextField,
  mergeUniqueStrings,
} from '@/lib/capa2-types'
import {
  loadInstrumentCatalog,
  mergeInstrumentSelection,
  normalizeInstrumentCodes,
  prepareAssessmentInstruments,
  resolveInstrumentLabel,
  type InstrumentCatalogEntry,
} from '@/lib/instruments'

export type ApplyResult = {
  updatedFields: string[]
  skippedFields: string[]
}

const FIELD_LABELS: Record<string, string> = {
  participants: 'Participantes (VI)',
  instruments: 'Instrumentos utilizados',
  familyContext: 'Contexto familiar',
  requiredSupports: 'Apoyos requeridos',
  strengths: 'Fortalezas',
  instrumentNotes: 'Notas por instrumento',
  classroomContext: 'Contexto de aula',
  institutionalContext: 'Contexto institucional',
}

export type ApplyPreview = ApplyResult & {
  fields: { field: string; label: string; before: string; after: string }[]
}

function previewField(
  field: string,
  before: string,
  after: string,
  updatedFields: string[],
  skippedFields: string[],
  previews: ApplyPreview['fields'],
) {
  if (after !== before) {
    updatedFields.push(field)
    previews.push({
      field,
      label: FIELD_LABELS[field] ?? field,
      before: before.trim(),
      after: after.trim(),
    })
  } else if (after.trim() && before.trim()) {
    skippedFields.push(field)
  }
}

export function previewInterviewApply(
  interview: InterviewRecord,
  assessment: {
    participants: string[]
    instruments: string[]
    familyContext: string
    requiredSupports: string
    strengths: string
    instrumentNotes: unknown
  },
  overwrite = false,
  catalog: InstrumentCatalogEntry[] = [],
): ApplyPreview {
  const prepared = prepareAssessmentInstruments(
    assessment.instruments,
    assessment.instrumentNotes,
    catalog,
  )
  const assessmentNorm = { ...assessment, ...prepared }
  const content = parseInterviewContent(interview.content)
  const narrative = synthesizeInterviewNarrative(content)
  const updatedFields: string[] = []
  const skippedFields: string[] = []
  const fields: ApplyPreview['fields'] = []

  const participantCode =
    interview.participantRoleCode ??
    INTERVIEW_TYPE_TO_PARTICIPANT[interview.interviewType] ??
    null
  const participants = mergeUniqueStrings(
    assessment.participants,
    participantCode ? [participantCode] : [],
  )
  previewField(
    'participants',
    assessment.participants.join(', '),
    participants.join(', '),
    updatedFields,
    skippedFields,
    fields,
  )

  const instrumentCode =
    interview.linkedInstrumentCode ??
    INTERVIEW_TYPE_TO_INSTRUMENT[interview.interviewType] ??
    null
  const instruments = mergeInstrumentSelection(
    assessmentNorm.instruments,
    instrumentCode ? [instrumentCode] : [],
    catalog,
  )
  previewField(
    'instruments',
    assessmentNorm.instruments.map((c) => resolveInstrumentLabel(c, catalog)).join(', '),
    instruments.map((c) => resolveInstrumentLabel(c, catalog)).join(', '),
    updatedFields,
    skippedFields,
    fields,
  )

  let familyContext = assessment.familyContext
  if (interview.interviewType === 'FAMILIA' || content.saberes.contextoFamiliar.trim()) {
    const familyText =
      interview.interviewType === 'FAMILIA'
        ? narrative
        : content.saberes.contextoFamiliar.trim() || narrative
    const next = mergeTextField(familyContext, familyText, overwrite)
    previewField('familyContext', familyContext, next, updatedFields, skippedFields, fields)
    familyContext = next
  }

  let requiredSupports = assessment.requiredSupports
  if (content.saberes.apoyosExistentes.trim()) {
    const next = mergeTextField(
      requiredSupports,
      `Apoyos reportados en entrevista:\n${content.saberes.apoyosExistentes.trim()}`,
      overwrite,
    )
    previewField('requiredSupports', requiredSupports, next, updatedFields, skippedFields, fields)
    requiredSupports = next
  }

  let strengths = assessment.strengths
  const strengthBits = [content.saberes.sabeHacer, content.saberes.situacionesFavorables]
    .map((s) => s.trim())
    .filter(Boolean)
  if (strengthBits.length) {
    const next = mergeTextField(strengths, strengthBits.join('\n'), overwrite)
    previewField('strengths', strengths, next, updatedFields, skippedFields, fields)
  }

  return { updatedFields, skippedFields, fields }
}

export async function applyInterviewToAssessment(
  interview: InterviewRecord,
  options: { overwrite?: boolean } = {},
): Promise<ApplyResult> {
  const overwrite = options.overwrite ?? false
  const content = parseInterviewContent(interview.content)
  const narrative = synthesizeInterviewNarrative(content)

  const assessment = await prisma.integralAssessment.upsert({
    where: { studentId: interview.studentId },
    create: { studentId: interview.studentId },
    update: {},
  })

  const catalog = await loadInstrumentCatalog()
  const prepared = prepareAssessmentInstruments(
    assessment.instruments,
    assessment.instrumentNotes,
    catalog,
  )

  const updatedFields: string[] = []
  const skippedFields: string[] = []

  const participantCode =
    interview.participantRoleCode ??
    INTERVIEW_TYPE_TO_PARTICIPANT[interview.interviewType] ??
    null

  const participants = mergeUniqueStrings(
    assessment.participants,
    participantCode ? [participantCode] : [],
  )
  if (participants.length !== assessment.participants.length) {
    updatedFields.push('participants')
  }

  const instrumentCode =
    interview.linkedInstrumentCode ??
    INTERVIEW_TYPE_TO_INSTRUMENT[interview.interviewType] ??
    null
  const instrumentsBefore = prepared.instruments
  const instruments = mergeInstrumentSelection(
    instrumentsBefore,
    instrumentCode ? [instrumentCode] : [],
    catalog,
  )
  if (instruments.length !== instrumentsBefore.length) {
    updatedFields.push('instruments')
  }

  let familyContext = assessment.familyContext
  if (interview.interviewType === 'FAMILIA' || content.saberes.contextoFamiliar.trim()) {
    const familyText =
      interview.interviewType === 'FAMILIA'
        ? narrative
        : content.saberes.contextoFamiliar.trim() || narrative
    const next = mergeTextField(familyContext, familyText, overwrite)
    if (next !== familyContext) {
      familyContext = next
      updatedFields.push('familyContext')
    } else if (familyText && familyContext.trim()) {
      skippedFields.push('familyContext')
    }
  }

  let requiredSupports = assessment.requiredSupports
  if (content.saberes.apoyosExistentes.trim()) {
    const next = mergeTextField(
      requiredSupports,
      `Apoyos reportados en entrevista:\n${content.saberes.apoyosExistentes.trim()}`,
      overwrite,
    )
    if (next !== requiredSupports) {
      requiredSupports = next
      updatedFields.push('requiredSupports')
    } else if (requiredSupports.trim()) {
      skippedFields.push('requiredSupports')
    }
  }

  let strengths = assessment.strengths
  const strengthBits = [
    content.saberes.sabeHacer,
    content.saberes.situacionesFavorables,
  ]
    .map((s) => s.trim())
    .filter(Boolean)
  if (strengthBits.length) {
    const next = mergeTextField(
      strengths,
      strengthBits.join('\n'),
      overwrite,
    )
    if (next !== strengths) {
      strengths = next
      updatedFields.push('strengths')
    } else if (strengths.trim()) {
      skippedFields.push('strengths')
    }
  }

  const instrumentNotes = { ...prepared.instrumentNotes }

  await prisma.integralAssessment.update({
    where: { id: assessment.id },
    data: {
      participants,
      instruments,
      familyContext,
      requiredSupports,
      strengths,
      instrumentNotes,
    },
  })

  await prisma.interviewRecord.update({
    where: { id: interview.id },
    data: { appliedToAssessment: true },
  })

  return { updatedFields, skippedFields }
}

export function previewObservationApply(
  observation: ObservationRecord,
  dimensionLabels: Record<string, string>,
  assessment: {
    instruments: string[]
    classroomContext: string
    institutionalContext: string
  },
  overwrite = false,
  catalog: InstrumentCatalogEntry[] = [],
): ApplyPreview {
  const instrumentsBefore = normalizeInstrumentCodes(
    assessment.instruments,
    catalog,
  )
  const dimensionNotes = parseDimensionNotes(observation.dimensionNotes)
  const narrative = synthesizeObservationNarrative(
    dimensionNotes,
    dimensionLabels,
    observation.generalNotes,
  )
  const updatedFields: string[] = []
  const skippedFields: string[] = []
  const fields: ApplyPreview['fields'] = []

  const instrumentCode =
    observation.linkedInstrumentCode ??
    OBSERVATION_CONTEXT_TO_INSTRUMENT[observation.context]
  const instruments = mergeInstrumentSelection(instrumentsBefore, [instrumentCode], catalog)
  previewField(
    'instruments',
    instrumentsBefore.map((c) => resolveInstrumentLabel(c, catalog)).join(', '),
    instruments.map((c) => resolveInstrumentLabel(c, catalog)).join(', '),
    updatedFields,
    skippedFields,
    fields,
  )

  const targetField =
    observation.context === 'AULA' ? 'classroomContext' : 'institutionalContext'
  const existing =
    targetField === 'classroomContext'
      ? assessment.classroomContext
      : assessment.institutionalContext
  const next = mergeTextField(existing, narrative, overwrite)
  previewField(targetField, existing, next, updatedFields, skippedFields, fields)

  return { updatedFields, skippedFields, fields }
}

export async function applyObservationToAssessment(
  observation: ObservationRecord,
  dimensionLabels: Record<string, string>,
  options: { overwrite?: boolean } = {},
): Promise<ApplyResult> {
  const overwrite = options.overwrite ?? false
  const dimensionNotes = parseDimensionNotes(observation.dimensionNotes)
  const narrative = synthesizeObservationNarrative(
    dimensionNotes,
    dimensionLabels,
    observation.generalNotes,
  )

  const assessment = await prisma.integralAssessment.upsert({
    where: { studentId: observation.studentId },
    create: { studentId: observation.studentId },
    update: {},
  })

  const catalog = await loadInstrumentCatalog()
  const prepared = prepareAssessmentInstruments(
    assessment.instruments,
    assessment.instrumentNotes,
    catalog,
  )

  const updatedFields: string[] = []
  const skippedFields: string[] = []

  const instrumentCode =
    observation.linkedInstrumentCode ??
    OBSERVATION_CONTEXT_TO_INSTRUMENT[observation.context]

  const instrumentsBefore = prepared.instruments
  const instruments = mergeInstrumentSelection(instrumentsBefore, [instrumentCode], catalog)
  if (instruments.length !== instrumentsBefore.length) {
    updatedFields.push('instruments')
  }

  const targetField =
    observation.context === 'AULA' ? 'classroomContext' : 'institutionalContext'

  const existing =
    targetField === 'classroomContext'
      ? assessment.classroomContext
      : assessment.institutionalContext

  const next = mergeTextField(existing, narrative, overwrite)
  if (next !== existing) {
    updatedFields.push(targetField)
  } else if (narrative.trim() && existing.trim()) {
    skippedFields.push(targetField)
  }

  const instrumentNotes = { ...prepared.instrumentNotes }

  await prisma.integralAssessment.update({
    where: { id: assessment.id },
    data: {
      instruments,
      classroomContext:
        targetField === 'classroomContext' ? next : assessment.classroomContext,
      institutionalContext:
        targetField === 'institutionalContext' ? next : assessment.institutionalContext,
      instrumentNotes,
    },
  })

  await prisma.observationRecord.update({
    where: { id: observation.id },
    data: { appliedToAssessment: true },
  })

  return { updatedFields, skippedFields }
}

export type BulkApplyItem = {
  recordType: 'interview' | 'observation'
  recordId: string
  applied: boolean
  updatedFields: string[]
  skippedFields: string[]
  error?: string
}

export type BulkApplyResult = {
  appliedCount: number
  skippedCount: number
  items: BulkApplyItem[]
}

export async function applyAllCapa2ToAssessment(
  studentId: string,
  schoolPeriod: string,
  options: { overwrite?: boolean; onlyUnapplied?: boolean } = {},
): Promise<BulkApplyResult> {
  const onlyUnapplied = options.onlyUnapplied ?? true
  const overwrite = options.overwrite ?? false

  const dimensions = await prisma.contextDimension.findMany({
    where: { active: true },
    select: { code: true, label: true },
  })
  const dimensionLabels = Object.fromEntries(
    dimensions.map((d) => [d.code, d.label]),
  )

  const interviewWhere = {
    studentId,
    schoolPeriod,
    ...(onlyUnapplied ? { appliedToAssessment: false } : {}),
  }
  const observationWhere = {
    studentId,
    schoolPeriod,
    ...(onlyUnapplied ? { appliedToAssessment: false } : {}),
  }

  const [interviews, observations] = await Promise.all([
    prisma.interviewRecord.findMany({
      where: interviewWhere,
      orderBy: { conductedAt: 'asc' },
    }),
    prisma.observationRecord.findMany({
      where: observationWhere,
      orderBy: { observedAt: 'asc' },
    }),
  ])

  const items: BulkApplyItem[] = []
  let appliedCount = 0
  let skippedCount = 0

  for (const interview of interviews) {
    try {
      const result = await applyInterviewToAssessment(interview, { overwrite })
      const hasUpdates = result.updatedFields.length > 0
      if (hasUpdates) appliedCount += 1
      else skippedCount += 1
      items.push({
        recordType: 'interview',
        recordId: interview.id,
        applied: true,
        ...result,
      })
    } catch (e) {
      items.push({
        recordType: 'interview',
        recordId: interview.id,
        applied: false,
        updatedFields: [],
        skippedFields: [],
        error: e instanceof Error ? e.message : 'Error al aplicar',
      })
    }
  }

  for (const observation of observations) {
    try {
      const result = await applyObservationToAssessment(
        observation,
        dimensionLabels,
        { overwrite },
      )
      const hasUpdates = result.updatedFields.length > 0
      if (hasUpdates) appliedCount += 1
      else skippedCount += 1
      items.push({
        recordType: 'observation',
        recordId: observation.id,
        applied: true,
        ...result,
      })
    } catch (e) {
      items.push({
        recordType: 'observation',
        recordId: observation.id,
        applied: false,
        updatedFields: [],
        skippedFields: [],
        error: e instanceof Error ? e.message : 'Error al aplicar',
      })
    }
  }

  return { appliedCount, skippedCount, items }
}
