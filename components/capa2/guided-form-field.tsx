'use client'

import { FormField } from '@/components/ui/form-field'
import { FieldGuidanceNote } from '@/components/capa2/field-guidance-note'
import type { FieldGuidance } from '@/lib/field-guidance'

type Props = {
  label: string
  htmlFor?: string
  required?: boolean
  guidance: FieldGuidance
  catalogHint?: string | null
  children: React.ReactNode
}

export function GuidedFormField({
  label,
  htmlFor,
  required,
  guidance,
  catalogHint,
  children,
}: Props) {
  return (
    <FormField label={label} htmlFor={htmlFor} required={required}>
      <FieldGuidanceNote guidance={guidance} catalogHint={catalogHint} />
      <div className="mt-1.5">{children}</div>
    </FormField>
  )
}
