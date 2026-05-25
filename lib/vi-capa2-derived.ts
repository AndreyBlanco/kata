import type { InterviewRecord, ObservationRecord } from '@prisma/client'
import {
  INTERVIEW_TYPE_LABELS,
  INTERVIEW_TYPE_TO_INSTRUMENT,
  INTERVIEW_TYPE_TO_PARTICIPANT,
  OBSERVATION_CONTEXT_TO_INSTRUMENT,
} from '@/lib/capa2-types'
import { resolveInstrumentLabel, type InstrumentCatalogEntry } from '@/lib/instruments'

export type Capa2RecordRef = {
  recordType: 'interview' | 'observation'
  recordId: string
  label: string
  date: string
  appliedToAssessment: boolean
}

export type DerivedInstrument = {
  code: string
  label: string
  sources: Capa2RecordRef[]
}

export type ViSectionFeed = {
  sectionKey: string
  title: string
  sources: Capa2RecordRef[]
}

export type DerivedParticipant = {
  roleCode: string | null
  roleLabel: string
  sources: Capa2RecordRef[]
}

export function instrumentCodeForInterview(
  interview: Pick<InterviewRecord, 'interviewType' | 'linkedInstrumentCode'>,
): string | null {
  return (
    interview.linkedInstrumentCode ??
    INTERVIEW_TYPE_TO_INSTRUMENT[interview.interviewType] ??
    null
  )
}

export function instrumentCodeForObservation(
  observation: Pick<ObservationRecord, 'context' | 'linkedInstrumentCode'>,
): string {
  return (
    observation.linkedInstrumentCode ??
    OBSERVATION_CONTEXT_TO_INSTRUMENT[observation.context]
  )
}

export function buildDerivedInstruments(
  interviews: Pick<
    InterviewRecord,
    'id' | 'interviewType' | 'conductedAt' | 'appliedToAssessment' | 'linkedInstrumentCode'
  >[],
  observations: Pick<
    ObservationRecord,
    'id' | 'context' | 'observedAt' | 'appliedToAssessment' | 'linkedInstrumentCode'
  >[],
  catalog: InstrumentCatalogEntry[] = [],
): DerivedInstrument[] {
  const byCode = new Map<string, DerivedInstrument>()

  const add = (code: string, source: Capa2RecordRef) => {
    if (!code) return
    const existing = byCode.get(code)
    if (existing) {
      existing.sources.push(source)
      return
    }
    byCode.set(code, {
      code,
      label: resolveInstrumentLabel(code, catalog),
      sources: [source],
    })
  }

  for (const i of interviews) {
    const code = instrumentCodeForInterview(i)
    if (!code) continue
    add(code, {
      recordType: 'interview',
      recordId: i.id,
      label: INTERVIEW_TYPE_LABELS[i.interviewType] ?? i.interviewType,
      date: i.conductedAt.toISOString(),
      appliedToAssessment: i.appliedToAssessment,
    })
  }

  for (const o of observations) {
    const code = instrumentCodeForObservation(o)
    add(code, {
      recordType: 'observation',
      recordId: o.id,
      label: `Observación · ${o.context === 'AULA' ? 'aula' : o.context === 'SERVICIO_APOYO' ? 'servicio PA' : 'otro'}`,
      date: o.observedAt.toISOString(),
      appliedToAssessment: o.appliedToAssessment,
    })
  }

  return [...byCode.values()].sort((a, b) => a.label.localeCompare(b.label, 'es'))
}

export function buildViSectionFeeds(
  interviews: Pick<
    InterviewRecord,
    'id' | 'interviewType' | 'conductedAt' | 'appliedToAssessment'
  >[],
  observations: Pick<
    ObservationRecord,
    'id' | 'context' | 'observedAt' | 'appliedToAssessment'
  >[],
): ViSectionFeed[] {
  const feeds: ViSectionFeed[] = []

  const interviewSources = interviews.map(
    (i): Capa2RecordRef => ({
      recordType: 'interview',
      recordId: i.id,
      label: INTERVIEW_TYPE_LABELS[i.interviewType] ?? i.interviewType,
      date: i.conductedAt.toISOString(),
      appliedToAssessment: i.appliedToAssessment,
    }),
  )

  const family = interviewSources.filter((_, idx) =>
    interviews[idx]?.interviewType === 'FAMILIA',
  )
  if (family.length) {
    feeds.push({
      sectionKey: 'familyContext',
      title: 'Contexto familiar (3c)',
      sources: family,
    })
  }

  const aulaObs = observations
    .filter((o) => o.context === 'AULA')
    .map(
      (o): Capa2RecordRef => ({
        recordType: 'observation',
        recordId: o.id,
        label: 'Observación en aula',
        date: o.observedAt.toISOString(),
        appliedToAssessment: o.appliedToAssessment,
      }),
    )
  if (aulaObs.length) {
    feeds.push({
      sectionKey: 'classroomContext',
      title: 'Contexto de aula (3a)',
      sources: aulaObs,
    })
  }

  const instObs = observations
    .filter((o) => o.context !== 'AULA')
    .map(
      (o): Capa2RecordRef => ({
        recordType: 'observation',
        recordId: o.id,
        label: `Observación · ${o.context}`,
        date: o.observedAt.toISOString(),
        appliedToAssessment: o.appliedToAssessment,
      }),
    )
  if (instObs.length) {
    feeds.push({
      sectionKey: 'institutionalContext',
      title: 'Contexto institucional (3b)',
      sources: instObs,
    })
  }

  const observationSources = observations.map(
    (o): Capa2RecordRef => ({
      recordType: 'observation',
      recordId: o.id,
      label: `Observación · ${o.context === 'AULA' ? 'aula' : o.context === 'SERVICIO_APOYO' ? 'servicio PA' : 'otro'}`,
      date: o.observedAt.toISOString(),
      appliedToAssessment: o.appliedToAssessment,
    }),
  )

  if (interviewSources.length) {
    feeds.push({
      sectionKey: 'participants',
      title: 'Participantes (2)',
      sources: interviewSources,
    })
    feeds.push({
      sectionKey: 'strengths',
      title: 'Fortalezas (4)',
      sources: interviewSources,
    })
    feeds.push({
      sectionKey: 'supports',
      title: 'Apoyos requeridos (9)',
      sources: interviewSources,
    })
  }

  const barrierSources = [...interviewSources, ...observationSources]
  if (barrierSources.length) {
    feeds.push({
      sectionKey: 'barriers',
      title: 'Barreras (5)',
      sources: barrierSources,
    })
  }

  if (interviewSources.length) {
    feeds.push({
      sectionKey: 'instruments',
      title: 'Instrumentos (7)',
      sources: interviewSources,
    })
  }
  if (observationSources.length) {
    const existing = feeds.find((f) => f.sectionKey === 'instruments')
    if (existing) {
      existing.sources.push(...observationSources)
    } else {
      feeds.push({ sectionKey: 'instruments', title: 'Instrumentos (7)', sources: observationSources })
    }
  }

  return feeds
}

export function derivedInstrumentCodes(derived: DerivedInstrument[]): string[] {
  return derived.map((d) => d.code)
}

export function resolveParticipantDisplay(
  value: string,
  roleCodeToLabel: Record<string, string>,
): string {
  return roleCodeToLabel[value] ?? value
}

export function participantMatchesDerived(
  value: string,
  derived: DerivedParticipant,
  roleCodeToLabel: Record<string, string>,
): boolean {
  const display = resolveParticipantDisplay(value, roleCodeToLabel)
  return (
    display === derived.roleLabel ||
    (derived.roleCode !== null && value === derived.roleCode)
  )
}

export function buildDerivedParticipants(
  interviews: Pick<
    InterviewRecord,
    'id' | 'interviewType' | 'conductedAt' | 'appliedToAssessment' | 'participantRoleCode'
  >[],
  roleCodeToLabel: Record<string, string>,
): DerivedParticipant[] {
  const byKey = new Map<string, DerivedParticipant>()

  for (const i of interviews) {
    const roleCode =
      i.participantRoleCode ?? INTERVIEW_TYPE_TO_PARTICIPANT[i.interviewType] ?? null
    const roleLabel =
      (roleCode && roleCodeToLabel[roleCode]) ||
      INTERVIEW_TYPE_LABELS[i.interviewType] ||
      i.interviewType
    const key = roleCode ?? roleLabel

    const source: Capa2RecordRef = {
      recordType: 'interview',
      recordId: i.id,
      label: INTERVIEW_TYPE_LABELS[i.interviewType] ?? i.interviewType,
      date: i.conductedAt.toISOString(),
      appliedToAssessment: i.appliedToAssessment,
    }

    const existing = byKey.get(key)
    if (existing) {
      existing.sources.push(source)
      continue
    }
    byKey.set(key, { roleCode, roleLabel, sources: [source] })
  }

  return [...byKey.values()].sort((a, b) => a.roleLabel.localeCompare(b.roleLabel, 'es'))
}

export function participantLabelsFromInterviews(
  interviews: Pick<InterviewRecord, 'interviewType' | 'participantRoleCode'>[],
  roleCodeToLabel: Record<string, string>,
): string[] {
  const labels = new Set<string>()
  for (const i of interviews) {
    const code =
      i.participantRoleCode ?? INTERVIEW_TYPE_TO_PARTICIPANT[i.interviewType] ?? null
    if (code && roleCodeToLabel[code]) labels.add(roleCodeToLabel[code])
    else if (INTERVIEW_TYPE_LABELS[i.interviewType]) {
      labels.add(INTERVIEW_TYPE_LABELS[i.interviewType])
    }
  }
  return [...labels]
}
