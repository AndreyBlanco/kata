'use client'

import { Textarea } from '@/components/ui/textarea'
import { GuidedFormField } from '@/components/capa2/guided-form-field'
import type { InterviewContent } from '@/lib/capa2-types'
import {
  INTERVIEW_DIMENSIONS_GUIDANCE,
  INTERVIEW_NOTES_GUIDANCE,
  INTERVIEW_SABERES_GUIDANCE,
} from '@/lib/field-guidance'

type Props = {
  content: InterviewContent
  onChange: (content: InterviewContent) => void
  showFamilyBlock?: boolean
}

export function InterviewContentForm({ content, onChange, showFamilyBlock }: Props) {
  const setSaberes = (key: keyof InterviewContent['saberes'], value: string) => {
    onChange({
      ...content,
      saberes: { ...content.saberes, [key]: value },
    })
  }

  const setDimension = (key: keyof InterviewContent['dimensions'], value: string) => {
    onChange({
      ...content,
      dimensions: { ...content.dimensions, [key]: value },
    })
  }

  return (
    <div className="space-y-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
        Saberes (Cuaderno MEP)
      </p>

      <GuidedFormField label="¿Qué conoce?" guidance={INTERVIEW_SABERES_GUIDANCE.conoce}>
        <Textarea
          rows={2}
          value={content.saberes.conoce}
          onChange={(e) => setSaberes('conoce', e.target.value)}
        />
      </GuidedFormField>

      <GuidedFormField label="¿Qué sabe hacer?" guidance={INTERVIEW_SABERES_GUIDANCE.sabeHacer}>
        <Textarea
          rows={2}
          value={content.saberes.sabeHacer}
          onChange={(e) => setSaberes('sabeHacer', e.target.value)}
        />
      </GuidedFormField>

      <GuidedFormField
        label="¿Qué se le dificulta?"
        guidance={INTERVIEW_SABERES_GUIDANCE.dificultades}
      >
        <Textarea
          rows={2}
          value={content.saberes.dificultades}
          onChange={(e) => setSaberes('dificultades', e.target.value)}
        />
      </GuidedFormField>

      <GuidedFormField
        label="Estilo y preferencias de aprendizaje"
        guidance={INTERVIEW_SABERES_GUIDANCE.estiloPreferencias}
      >
        <Textarea
          rows={2}
          value={content.saberes.estiloPreferencias}
          onChange={(e) => setSaberes('estiloPreferencias', e.target.value)}
        />
      </GuidedFormField>

      <GuidedFormField
        label="Relación e interacción social"
        guidance={INTERVIEW_SABERES_GUIDANCE.relacionInteraccion}
      >
        <Textarea
          rows={2}
          value={content.saberes.relacionInteraccion}
          onChange={(e) => setSaberes('relacionInteraccion', e.target.value)}
        />
      </GuidedFormField>

      {(showFamilyBlock ?? true) && (
        <GuidedFormField
          label="Contexto familiar (fortalezas, apoyos en casa)"
          guidance={INTERVIEW_SABERES_GUIDANCE.contextoFamiliar}
        >
          <Textarea
            rows={3}
            value={content.saberes.contextoFamiliar}
            onChange={(e) => setSaberes('contextoFamiliar', e.target.value)}
          />
        </GuidedFormField>
      )}

      <GuidedFormField
        label="Situaciones que favorecen el aprendizaje"
        guidance={INTERVIEW_SABERES_GUIDANCE.situacionesFavorables}
      >
        <Textarea
          rows={2}
          value={content.saberes.situacionesFavorables}
          onChange={(e) => setSaberes('situacionesFavorables', e.target.value)}
        />
      </GuidedFormField>

      <GuidedFormField
        label="Situaciones que dificultan el aprendizaje"
        guidance={INTERVIEW_SABERES_GUIDANCE.situacionesDificultan}
      >
        <Textarea
          rows={2}
          value={content.saberes.situacionesDificultan}
          onChange={(e) => setSaberes('situacionesDificultan', e.target.value)}
        />
      </GuidedFormField>

      <GuidedFormField
        label="Apoyos educativos que ya recibe"
        guidance={INTERVIEW_SABERES_GUIDANCE.apoyosExistentes}
      >
        <Textarea
          rows={2}
          value={content.saberes.apoyosExistentes}
          onChange={(e) => setSaberes('apoyosExistentes', e.target.value)}
        />
      </GuidedFormField>

      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
        Dimensiones del desarrollo
      </p>

      <GuidedFormField
        label="Cognoscitiva"
        guidance={INTERVIEW_DIMENSIONS_GUIDANCE.cognoscitiva}
      >
        <Textarea
          rows={3}
          value={content.dimensions.cognoscitiva}
          onChange={(e) => setDimension('cognoscitiva', e.target.value)}
        />
      </GuidedFormField>

      <GuidedFormField
        label="Socioafectiva"
        guidance={INTERVIEW_DIMENSIONS_GUIDANCE.socioafectiva}
      >
        <Textarea
          rows={3}
          value={content.dimensions.socioafectiva}
          onChange={(e) => setDimension('socioafectiva', e.target.value)}
        />
      </GuidedFormField>

      <GuidedFormField label="Psicomotriz" guidance={INTERVIEW_DIMENSIONS_GUIDANCE.psicomotriz}>
        <Textarea
          rows={3}
          value={content.dimensions.psicomotriz}
          onChange={(e) => setDimension('psicomotriz', e.target.value)}
        />
      </GuidedFormField>

      <GuidedFormField
        label="Notas adicionales del registro"
        guidance={INTERVIEW_NOTES_GUIDANCE}
      >
        <Textarea
          rows={3}
          value={content.notes}
          onChange={(e) => onChange({ ...content, notes: e.target.value })}
        />
      </GuidedFormField>
    </div>
  )
}
