'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { DerivedParticipant } from '@/lib/vi-capa2-derived'
import {
  participantMatchesDerived,
  resolveParticipantDisplay,
} from '@/lib/vi-capa2-derived'

type ParticipantRoleItem = {
  code: string
  label: string
  category: string
  isCore: boolean
}

type Props = {
  studentId: string
  derived: DerivedParticipant[]
  participantsInVi: string[]
  roleCodeToLabel: Record<string, string>
  participantRoles: Record<string, ParticipantRoleItem[]>
  categoryLabels: Record<string, string>
  disabled?: boolean
  newParticipant: string
  onNewParticipantChange: (value: string) => void
  onToggleRole: (label: string) => void
  onAddCustom: () => void
  onRemove: (value: string) => void
}

export function ViSectionParticipants({
  studentId,
  derived,
  participantsInVi,
  roleCodeToLabel,
  participantRoles,
  categoryLabels,
  disabled,
  newParticipant,
  onNewParticipantChange,
  onToggleRole,
  onAddCustom,
  onRemove,
}: Props) {
  const [showComplement, setShowComplement] = useState(false)

  const extraInVi = useMemo(
    () =>
      participantsInVi.filter(
        (p) => !derived.some((d) => participantMatchesDerived(p, d, roleCodeToLabel)),
      ),
    [participantsInVi, derived, roleCodeToLabel],
  )

  if (derived.length === 0 && extraInVi.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-center text-xs text-gray-500">
        <p>No hay entrevistas registradas en Capa 2 para este periodo.</p>
        <Link
          href={`/estudiantes/${studentId}/expediente`}
          className="mt-2 inline-block text-blue-600 hover:underline"
        >
          Ir a entrevistas y observaciones
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-600">
        Roles derivados de las entrevistas del periodo. Al incorporar evidencia desde Capa 2, se
        añaden automáticamente a la VI.
      </p>

      {derived.length > 0 && (
        <ul className="space-y-2">
          {derived.map((item) => {
            const inVi = participantsInVi.some((p) =>
              participantMatchesDerived(p, item, roleCodeToLabel),
            )
            const allApplied = item.sources.every((s) => s.appliedToAssessment)
            return (
              <li
                key={item.roleCode ?? item.roleLabel}
                className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-gray-900">{item.roleLabel}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      inVi && allApplied
                        ? 'bg-green-100 text-green-800'
                        : inVi
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {inVi && allApplied
                      ? 'En informe VI'
                      : inVi
                        ? 'Parcial en VI'
                        : 'Pendiente en VI'}
                  </span>
                </div>
                <ul className="mt-1.5 space-y-0.5 text-xs text-gray-600">
                  {item.sources.map((s) => (
                    <li key={`${s.recordType}-${s.recordId}`}>
                      <Link
                        href={`/estudiantes/${studentId}/entrevistas/${s.recordId}`}
                        className="text-blue-600 hover:underline"
                      >
                        {s.label}
                      </Link>
                      {' · '}
                      {new Date(s.date).toLocaleDateString('es-CR')}
                    </li>
                  ))}
                </ul>
              </li>
            )
          })}
        </ul>
      )}

      {extraInVi.length > 0 && (
        <div className="text-xs text-gray-600">
          <p className="mb-1 font-medium">Participantes adicionales en la VI</p>
          <div className="flex flex-wrap gap-2">
            {extraInVi.map((value) => {
              const display = resolveParticipantDisplay(value, roleCodeToLabel)
              return (
                <span
                  key={value}
                  className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-blue-800"
                >
                  {display}
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => onRemove(value)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      ×
                    </button>
                  )}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {!disabled && (
        <div className="border-t border-gray-100 pt-2">
          <button
            type="button"
            onClick={() => setShowComplement((v) => !v)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            {showComplement ? '▲' : '▼'} Complementar participantes (catálogo o nombre libre)
          </button>
          {showComplement && (
            <div className="mt-3 space-y-3">
              {Object.entries(participantRoles).map(([cat, roles]) => (
                <div key={cat}>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {categoryLabels[cat] ?? cat}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {roles.map((role) => {
                      const selected = participantsInVi.some(
                        (p) =>
                          p === role.label ||
                          p === role.code ||
                          resolveParticipantDisplay(p, roleCodeToLabel) === role.label,
                      )
                      return (
                        <button
                          key={role.code}
                          type="button"
                          onClick={() => onToggleRole(role.label)}
                          className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                            selected
                              ? 'border-blue-400 bg-blue-100 text-blue-800'
                              : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          {role.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}

              <div className="flex gap-2 border-t border-gray-100 pt-3">
                <input
                  type="text"
                  value={newParticipant}
                  onChange={(e) => onNewParticipantChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      onAddCustom()
                    }
                  }}
                  placeholder="Nombre de otro participante..."
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={onAddCustom}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                >
                  + Agregar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
