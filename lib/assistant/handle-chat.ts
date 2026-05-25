import type { Student } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { parseInterviewContent, parseDimensionNotes } from '@/lib/capa2-types'
import {
  previewInterviewApply,
  previewObservationApply,
} from '@/lib/apply-to-assessment'
import { completeChat, isAssistantConfigured } from '@/lib/assistant/client'
import {
  localInterviewQuestions,
  localInterviewSynthesis,
  localObservationSynthesis,
  localViReview,
} from '@/lib/assistant/local-fallback'
import {
  ASSISTANT_SYSTEM_PROMPT,
  interviewQuestionsUserPrompt,
  interviewSynthesisUserPrompt,
  observationSynthesisUserPrompt,
  viReviewUserPrompt,
} from '@/lib/assistant/prompts'
import type { AssistantChatRequest, AssistantChatResponse } from '@/lib/assistant/types'
import { buildViReviewSummary } from '@/lib/vi-review'
import { loadInstrumentCatalog } from '@/lib/instruments'
import type { Capa2Checklist, ViFieldSnapshot } from '@/lib/vi-completeness'
import { VI_SECTION_LABELS } from '@/lib/vi-completeness'

async function getStudentForTeacher(studentId: string, teacherId: string) {
  return prisma.student.findFirst({ where: { id: studentId, teacherId } })
}

async function loadAssessment(studentId: string) {
  return prisma.integralAssessment.upsert({
    where: { studentId },
    create: { studentId },
    update: {},
  })
}

export async function handleAssistantChat(
  teacherId: string,
  body: AssistantChatRequest,
): Promise<AssistantChatResponse> {
  const student = await getStudentForTeacher(body.studentId, teacherId)
  if (!student) throw new Error('Estudiante no encontrado')

  switch (body.mode) {
    case 'interview_questions':
      return handleInterviewQuestions(student, body)
    case 'interview_synthesis':
      return handleInterviewSynthesis(student, body)
    case 'observation_synthesis':
      return handleObservationSynthesis(student, body)
    case 'apply_preview':
      return handleApplyPreview(teacherId, body)
    case 'review_vi':
      return handleReviewVi(student, body)
    default:
      throw new Error('Modo no válido')
  }
}

async function handleInterviewQuestions(
  student: Student,
  body: AssistantChatRequest,
): Promise<AssistantChatResponse> {
  const interviewType = body.context?.interviewType
  if (!interviewType) throw new Error('interviewType requerido')

  const partial = parseInterviewContent(body.context?.partialContent ?? {})

  if (isAssistantConfigured()) {
    try {
      const result = await completeChat(
        ASSISTANT_SYSTEM_PROMPT,
        interviewQuestionsUserPrompt({
          studentName: student.name,
          grade: student.grade,
          interviewType,
          partialJson: JSON.stringify(partial, null, 2),
        }),
      )
      if (result) {
        return {
          mode: 'interview_questions',
          text: result.text,
          source: result.source,
          provider: result.provider,
          model: result.model,
        }
      }
    } catch (e) {
      console.error('[assistant] interview_questions', e)
    }
  }

  return {
    mode: 'interview_questions',
    text: localInterviewQuestions(interviewType, partial),
    source: 'local',
  }
}

async function handleInterviewSynthesis(
  student: Student,
  body: AssistantChatRequest,
): Promise<AssistantChatResponse> {
  let content = parseInterviewContent(body.context?.partialContent ?? {})
  let interviewType = body.context?.interviewType

  if (body.recordType === 'interview' && body.recordId) {
    const record = await prisma.interviewRecord.findFirst({
      where: { id: body.recordId, studentId: student.id },
    })
    if (!record) throw new Error('Entrevista no encontrada')
    content = parseInterviewContent(record.content)
    interviewType = record.interviewType
  }

  if (!interviewType) throw new Error('interviewType requerido')

  if (isAssistantConfigured()) {
    try {
      const result = await completeChat(
        ASSISTANT_SYSTEM_PROMPT,
        interviewSynthesisUserPrompt({
          studentName: student.name,
          grade: student.grade,
          interviewType,
          contentJson: JSON.stringify(content, null, 2),
        }),
      )
      if (result) {
        return {
          mode: 'interview_synthesis',
          text: result.text,
          source: result.source,
          provider: result.provider,
          model: result.model,
        }
      }
    } catch (e) {
      console.error('[assistant] interview_synthesis', e)
    }
  }

  return {
    mode: 'interview_synthesis',
    text: localInterviewSynthesis(content),
    source: 'local',
  }
}

async function handleObservationSynthesis(
  student: Student,
  body: AssistantChatRequest,
): Promise<AssistantChatResponse> {
  let dimensionNotes = body.context?.dimensionNotes ?? {}
  let generalNotes = body.context?.generalNotes ?? ''
  let contextLabel = body.context?.observationContext ?? 'AULA'

  if (body.recordType === 'observation' && body.recordId) {
    const record = await prisma.observationRecord.findFirst({
      where: { id: body.recordId, studentId: student.id },
    })
    if (!record) throw new Error('Observación no encontrada')
    dimensionNotes = parseDimensionNotes(record.dimensionNotes)
    generalNotes = record.generalNotes
    contextLabel = record.context
  }

  const dimensions = await prisma.contextDimension.findMany({
    where: { active: true },
    select: { code: true, label: true },
  })
  const dimensionLabels = Object.fromEntries(dimensions.map((d) => [d.code, d.label]))

  if (isAssistantConfigured()) {
    try {
      const payload = {
        dimensionNotes,
        generalNotes,
        labels: dimensionLabels,
      }
      const result = await completeChat(
        ASSISTANT_SYSTEM_PROMPT,
        observationSynthesisUserPrompt({
          studentName: student.name,
          grade: student.grade,
          context: contextLabel,
          notesJson: JSON.stringify(payload, null, 2),
        }),
      )
      if (result) {
        return {
          mode: 'observation_synthesis',
          text: result.text,
          source: result.source,
          provider: result.provider,
          model: result.model,
        }
      }
    } catch (e) {
      console.error('[assistant] observation_synthesis', e)
    }
  }

  return {
    mode: 'observation_synthesis',
    text: localObservationSynthesis(dimensionNotes, dimensionLabels, generalNotes),
    source: 'local',
  }
}

async function handleApplyPreview(
  teacherId: string,
  body: AssistantChatRequest,
): Promise<AssistantChatResponse> {
  if (!body.recordId || !body.recordType) {
    throw new Error('recordId y recordType requeridos')
  }

  const student = await getStudentForTeacher(body.studentId, teacherId)
  if (!student) throw new Error('Estudiante no encontrado')

  const overwrite = !!body.context?.overwrite
  const assessment = await loadAssessment(student.id)
  const catalog = await loadInstrumentCatalog()

  if (body.recordType === 'interview') {
    const interview = await prisma.interviewRecord.findFirst({
      where: { id: body.recordId, studentId: student.id },
    })
    if (!interview) throw new Error('Entrevista no encontrada')

    const preview = previewInterviewApply(interview, assessment, overwrite, catalog)
    const lines = [
      '### Vista previa — aplicar a valoración integral',
      '',
      preview.updatedFields.length
        ? `**Se actualizaría:** ${preview.updatedFields.map((f) => FIELD_LABELS[f] ?? f).join(', ')}`
        : '**No hay campos nuevos que actualizar** con el contenido actual.',
      preview.skippedFields.length
        ? `\n**Ya tienen texto (se omitirían):** ${preview.skippedFields.map((f) => FIELD_LABELS[f] ?? f).join(', ')}`
        : '',
      '',
    ]

    for (const f of preview.fields) {
      lines.push(`#### ${f.label}`)
      if (f.before) lines.push(`*Antes:* ${f.before.slice(0, 300)}${f.before.length > 300 ? '…' : ''}`)
      lines.push(`*Después:* ${f.after.slice(0, 500)}${f.after.length > 500 ? '…' : ''}`)
      lines.push('')
    }

    return {
      mode: 'apply_preview',
      text: lines.join('\n'),
      source: 'local',
      applyPreview: preview,
    }
  }

  const observation = await prisma.observationRecord.findFirst({
    where: { id: body.recordId, studentId: student.id },
  })
  if (!observation) throw new Error('Observación no encontrada')

  const dimensions = await prisma.contextDimension.findMany({
    where: { active: true },
    select: { code: true, label: true },
  })
  const dimensionLabels = Object.fromEntries(dimensions.map((d) => [d.code, d.label]))

  const preview = previewObservationApply(observation, dimensionLabels, assessment, overwrite, catalog)
  const lines = [
    '### Vista previa — aplicar a valoración integral',
    '',
    preview.updatedFields.length
      ? `**Se actualizaría:** ${preview.updatedFields.map((f) => FIELD_LABELS[f] ?? f).join(', ')}`
      : '**No hay campos nuevos que actualizar** con el contenido actual.',
    preview.skippedFields.length
      ? `\n**Ya tienen texto (se omitirían):** ${preview.skippedFields.map((f) => FIELD_LABELS[f] ?? f).join(', ')}`
      : '',
    '',
  ]

  for (const f of preview.fields) {
    lines.push(`#### ${f.label}`)
    if (f.before) lines.push(`*Antes:* ${f.before.slice(0, 300)}${f.before.length > 300 ? '…' : ''}`)
    lines.push(`*Después:* ${f.after.slice(0, 500)}${f.after.length > 500 ? '…' : ''}`)
    lines.push('')
  }

  return {
    mode: 'apply_preview',
    text: lines.join('\n'),
    source: 'local',
    applyPreview: preview,
  }
}

async function handleReviewVi(
  student: Student,
  body: AssistantChatRequest,
): Promise<AssistantChatResponse> {
  const viFields = (body.context?.viFields ?? {}) as ViFieldSnapshot
  const capa2 = (body.context?.capa2Checklist ?? {
    expedienteReviewed: false,
    hasClassroomObservation: false,
    hasFamilyInterview: false,
    hasStudentOrTeacherInterview: false,
    interviewCount: 0,
    observationCount: 0,
  }) as Capa2Checklist
  const intakeType = body.context?.intakeType ?? null

  const summary = buildViReviewSummary(viFields, capa2, intakeType)
  const emptyLabels = summary.emptySections.map((k) => VI_SECTION_LABELS[k])
  const inconsistencyMessages = summary.inconsistencies.map((i) => i.message)

  if (isAssistantConfigured()) {
    try {
      const result = await completeChat(
        ASSISTANT_SYSTEM_PROMPT,
        viReviewUserPrompt({
          studentName: student.name,
          grade: student.grade,
          intakeType,
          emptySections: emptyLabels,
          inconsistencies: inconsistencyMessages,
          sectionsComplete: summary.sectionsComplete,
          capa2Done: summary.capa2Complete.done,
          capa2Total: summary.capa2Complete.total,
          viSnapshotJson: JSON.stringify(viFields, null, 2),
        }),
      )
      if (result) {
        return {
          mode: 'review_vi',
          text: result.text,
          source: result.source,
          provider: result.provider,
          model: result.model,
        }
      }
    } catch (e) {
      console.error('[assistant] review_vi', e)
    }
  }

  return {
    mode: 'review_vi',
    text: localViReview(viFields, capa2, intakeType),
    source: 'local',
  }
}

const FIELD_LABELS: Record<string, string> = {
  participants: 'Participantes',
  instruments: 'Instrumentos',
  familyContext: 'Contexto familiar',
  requiredSupports: 'Apoyos requeridos',
  strengths: 'Fortalezas',
  classroomContext: 'Contexto de aula',
  institutionalContext: 'Contexto institucional',
}
