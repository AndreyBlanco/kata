import type { InterviewType, ObservationContext } from '@prisma/client'
import type { InterviewContent } from '@/lib/capa2-types'
import type { Capa2Checklist, ServiceIntakeType, ViFieldSnapshot } from '@/lib/vi-completeness'

export type AssistantMode =
  | 'interview_questions'
  | 'interview_synthesis'
  | 'observation_synthesis'
  | 'apply_preview'
  | 'review_vi'

export type AssistantChatRequest = {
  mode: AssistantMode
  studentId: string
  recordType?: 'interview' | 'observation'
  recordId?: string
  context?: {
    interviewType?: InterviewType
    partialContent?: InterviewContent
    observationContext?: ObservationContext
    dimensionNotes?: Record<string, string>
    generalNotes?: string
    overwrite?: boolean
    viFields?: ViFieldSnapshot
    capa2Checklist?: Capa2Checklist
    intakeType?: ServiceIntakeType | null
  }
}

export type FieldPreview = {
  field: string
  label: string
  before: string
  after: string
}

export type AssistantChatResponse = {
  mode: AssistantMode
  text: string
  source: 'google' | 'openai' | 'anthropic' | 'local'
  /** Modelo usado cuando source !== local */
  provider?: 'google' | 'openai' | 'anthropic'
  model?: string
  /** Vista previa al aplicar a VI */
  applyPreview?: {
    updatedFields: string[]
    skippedFields: string[]
    fields: FieldPreview[]
  }
}
