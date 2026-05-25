'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Capa2Checklist, ServiceIntakeType, ViFieldSnapshot } from '@/lib/vi-completeness'
import { countCapa2Complete } from '@/lib/vi-completeness'
import { IntakeTypeSelector } from '@/components/vi/intake-type-selector'
import { ViCompletenessBar } from '@/components/vi/vi-completeness-bar'
import { Capa2EvidencePanel } from '@/components/vi/capa2-evidence-panel'
import { ViReviewAssistant } from '@/components/vi/vi-review-assistant'

type Props = {
  studentId: string
  disabled?: boolean
  viSectionsComplete: number
  viFields: ViFieldSnapshot
  serviceIntakeType: ServiceIntakeType | null
  onIntakeTypeChange: (value: ServiceIntakeType) => void
  onEvidenceApplied: () => void
  intakeSaving?: boolean
}

export function ValoracionPhase2Panel({
  studentId,
  disabled,
  viSectionsComplete,
  viFields,
  serviceIntakeType,
  onIntakeTypeChange,
  onEvidenceApplied,
  intakeSaving,
}: Props) {
  const [capa2, setCapa2] = useState<Capa2Checklist>({
    expedienteReviewed: false,
    hasClassroomObservation: false,
    hasFamilyInterview: false,
    hasStudentOrTeacherInterview: false,
    interviewCount: 0,
    observationCount: 0,
  })

  const loadCapa2 = useCallback(async () => {
    const res = await fetch(`/api/students/${studentId}/capa2-evidence`)
    if (res.ok) {
      const data = await res.json()
      if (data.checklist) setCapa2(data.checklist)
    }
  }, [studentId])

  useEffect(() => {
    loadCapa2()
  }, [loadCapa2])

  const capa2Progress = countCapa2Complete(capa2, serviceIntakeType)

  const handleApplied = () => {
    loadCapa2()
    onEvidenceApplied()
  }

  return (
    <div className="mx-auto max-w-2xl space-y-3 px-4 pb-2 pt-4">
      <IntakeTypeSelector
        value={serviceIntakeType}
        onChange={onIntakeTypeChange}
        saving={intakeSaving}
      />
      <ViCompletenessBar
        viSectionsComplete={viSectionsComplete}
        capa2Done={capa2Progress.done}
        capa2Total={capa2Progress.total}
      />
      <Capa2EvidencePanel studentId={studentId} disabled={disabled} onApplied={handleApplied} />
      <ViReviewAssistant
        studentId={studentId}
        viFields={viFields}
        capa2Checklist={capa2}
        intakeType={serviceIntakeType}
        disabled={disabled}
      />
    </div>
  )
}
