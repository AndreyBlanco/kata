'use client'

import type { Capa2RecordRef } from '@/lib/vi-capa2-derived'
import { Capa2SectionHint } from '@/components/vi/capa2-section-hint'

type Props = {
  studentId: string
  sources: Capa2RecordRef[]
  capa2Message: string
  complementMessage: string
  children: React.ReactNode
}

export function ViCapa2NarrativeSection({
  studentId,
  sources,
  capa2Message,
  complementMessage,
  children,
}: Props) {
  return (
    <>
      <Capa2SectionHint studentId={studentId} sources={sources} message={capa2Message} />
      <p className="text-xs text-gray-500 mb-3">{complementMessage}</p>
      {children}
    </>
  )
}
