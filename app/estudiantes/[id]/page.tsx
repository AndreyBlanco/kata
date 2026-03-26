// app/estudiantes/[id]/page.tsx

'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { calculateAge } from '@/lib/utils'

type StudentData = {
  id: string
  name: string
  age: number
  birthDate: string
  grade: string
  cedula?: string
  medicalDiagnosis?: string
  classroomTeacherName?: string
  guardianName?: string
  guardianPhone?: string
}

type StepStatus = 'empty' | 'started' | 'complete'

export default function StudentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const studentId = params.id as string

  const [student, setStudent] = useState<StudentData | null>(null)
  const [loading, setLoading] = useState(true)

  // Step statuses
  const [assessmentStatus, setAssessmentStatus] = useState<StepStatus>('empty')
  const [planStatus, setPlanStatus] = useState<StepStatus>('empty')
  const [objectivesPending, setObjectivesPending]   = useState(0)
  const [objectivesAchieved, setObjectivesAchieved] = useState(0)
  const [sessionsInfo, setSessionsInfo] = useState({ completed: 0, total: 0 })

  useEffect(() => {
    async function loadAll() {
      try {
        // Student
        const sRes = await fetch(`/api/students/${studentId}`)
        if (!sRes.ok) throw new Error('No encontrado')
        const sData = await sRes.json()
        setStudent(sData)

        // Assessment status
        const aRes = await fetch(`/api/assessments/${studentId}`)
        if (aRes.ok) {
          const aData = await aRes.json()
          if (aData && aData.id) {
            if (aData.status === 'completed') {
              setAssessmentStatus('complete')
            } else {
              const hasSubstantive = !!(
                aData.strengths ||
                aData.classroomContext ||
                aData.curricularPerformance ||
                aData.requiredSupports
              )
              setAssessmentStatus(hasSubstantive ? 'started' : 'empty')
            }
          }
        }

        // Plan status
        const pRes = await fetch(`/api/support-plans/${studentId}`)
        if (pRes.ok) {
          const pData = await pRes.json()
          if (pData && pData.id) {
            const hasDiff = pData.activeDifficulties?.length > 0
            const hasProc = pData.priorityProcesses?.length > 0
            setPlanStatus(hasDiff || hasProc ? 'complete' : 'started')
          }
        }

        // Objectives — conteo desde resultados de valoración diagnóstica
        const oRes = await fetch(`/api/assessments/${studentId}/results?withObjective=true`)
        if (oRes.ok) {
          const oData = await oRes.json()
          if (Array.isArray(oData)) {
            const evaluated = oData.filter((r: { result: string }) =>
              r.result === 'no' || r.result === 'withSupport' || r.result === 'yes'
            )
            setObjectivesPending(evaluated.filter((r: { result: string }) => r.result !== 'yes').length)
            setObjectivesAchieved(evaluated.filter((r: { result: string }) => r.result === 'yes').length)
          }
        }

        // Sessions info (current month)
        const now = new Date()
        const sessionRes = await fetch(
          `/api/sessions?studentId=${studentId}&month=${now.getMonth() + 1}`
        )
        if (sessionRes.ok) {
          const sessData = await sessionRes.json()
          if (Array.isArray(sessData)) {
            const completed = sessData.filter(
              (s: { attendance: string | null }) => s.attendance !== null
            ).length
            setSessionsInfo({ completed, total: sessData.length })
          }
        }
      } catch {
        router.push('/estudiantes')
      } finally {
        setLoading(false)
      }
    }
    loadAll()
  }, [studentId, router])

  if (loading || !student) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4">
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => router.push('/estudiantes')}
            className="text-sm text-blue-600 mb-2 hover:underline"
          >
            ← Estudiantes
          </button>
          <h1 className="text-xl font-bold text-gray-900">{student.name}</h1>
          <div className="flex gap-3 mt-1 text-sm text-gray-500">
            <span>{calculateAge(student.birthDate)} años</span>
            <span>·</span>
            <span>Sección {student.grade}</span>
            {student.classroomTeacherName && (
              <>
                <span>·</span>
                <span>Docente: {student.classroomTeacherName}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto p-4 space-y-3">

        {/* ── Flujo sugerido ── */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
          <p className="text-xs text-blue-700">
            📋 <strong>Flujo sugerido:</strong> Valoración Integral → Plan de Apoyo → Objetivos → Sesiones → Informe
          </p>
        </div>

        {/* ── 1. Valoración Integral ── */}
        <StepCard
          step={1}
          title="Valoración Integral"
          description="Documento fuente — Formato 2026"
          status={assessmentStatus}
          statusLabels={{
            empty: 'Sin iniciar',
            started: 'En progreso',
            complete: 'Completada',
          }}
          onClick={() => router.push(`/estudiantes/${studentId}/valoracion`)}
        />

        {/* ── 2. Plan de Apoyo ── */}
        <StepCard
          step={2}
          title="Plan de Apoyo"
          description="Procesos, dificultades y estrategias"
          status={planStatus}
          statusLabels={{
            empty: 'Sin iniciar',
            started: 'En progreso',
            complete: 'Configurado',
          }}
          onClick={() => router.push(`/estudiantes/${studentId}/plan`)}
        />

        {/* ── 3. Objetivos ── */}
        {(() => {
          const total    = objectivesPending + objectivesAchieved
          const allDone  = total > 0 && objectivesPending === 0
          const hasItems = total > 0
          const status: StepStatus = allDone ? 'complete' : hasItems ? 'started' : 'empty'
          return (
            <StepCard
              step={3}
              title="Objetivos de Apoyo"
              description={
                allDone
                  ? `¡Todos logrados! (${total})`
                  : hasItems
                  ? `${objectivesPending} pendiente${objectivesPending !== 1 ? 's' : ''} · ${objectivesAchieved} logrado${objectivesAchieved !== 1 ? 's' : ''}`
                  : 'Sin objetivos de valoración'
              }
              status={status}
              statusLabels={{
                empty:    'Sin objetivos',
                started:  `${objectivesAchieved}/${total} logrados`,
                complete: '¡Alta sugerida!',
              }}
              onClick={() => router.push(`/estudiantes/${studentId}/objetivos`)}
            />
          )
        })()}

        {/* ── 4. Sesiones ── */}
        <StepCard
          step={4}
          title="Sesiones del Periodo"
          description={
            sessionsInfo.total > 0
              ? `${sessionsInfo.completed} de ${sessionsInfo.total} registradas`
              : 'Sin sesiones generadas'
          }
          status={
            sessionsInfo.total === 0
              ? 'empty'
              : sessionsInfo.completed === sessionsInfo.total
              ? 'complete'
              : 'started'
          }
          statusLabels={{
            empty: 'Sin sesiones',
            started: `${sessionsInfo.completed}/${sessionsInfo.total}`,
            complete: 'Completas',
          }}
          onClick={() => router.push(`/estudiantes/${studentId}/sesiones`)}
        />

        {/* ── 5. Generar Informe ── */}
        <div className="pt-2">
          <button
            onClick={() => router.push(`/estudiantes/${studentId}/informe`)}
            className="w-full py-3 px-4 bg-green-600 text-white rounded-lg
                       font-medium hover:bg-green-700 transition-colors
                       flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Generar Informe del Periodo
          </button>
        </div>

        {/* ── Student info card ── */}
        <div className="pt-4">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Datos del estudiante</h3>
              <button
                onClick={() => router.push(`/estudiantes/${studentId}/editar`)}
                className="text-xs text-blue-600 hover:underline"
              >
                Editar
              </button>
            </div>
            <div className="space-y-1.5 text-sm">
              <InfoRow label="Nombre" value={student.name} />
              <InfoRow label="Fecha nacimiento" value={new Date(student.birthDate).toLocaleDateString('es-CR')} />
<InfoRow label="Edad" value={`${calculateAge(student.birthDate)} años`} />
              <InfoRow label="Sección" value={student.grade} />
              {student.cedula && <InfoRow label="Cédula" value={student.cedula} />}
              {student.classroomTeacherName && (
                <InfoRow label="Docente guía" value={student.classroomTeacherName} />
              )}
              {student.medicalDiagnosis && student.medicalDiagnosis !== 'NO APLICA' && (
                <InfoRow label="Diagnóstico" value={student.medicalDiagnosis} />
              )}
              {student.guardianName && (
                <InfoRow label="Encargado" value={student.guardianName} />
              )}
              {student.guardianPhone && (
                <InfoRow label="Teléfono" value={student.guardianPhone} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Step Card Component ───
function StepCard({
  step,
  title,
  description,
  status,
  statusLabels,
  onClick,
}: {
  step: number
  title: string
  description: string
  status: StepStatus
  statusLabels: Record<StepStatus, string>
  onClick: () => void
}) {
  const statusColors: Record<StepStatus, string> = {
    empty: 'bg-gray-100 text-gray-500',
    started: 'bg-amber-100 text-amber-700',
    complete: 'bg-green-100 text-green-700',
  }

  const stepColors: Record<StepStatus, string> = {
    empty: 'bg-gray-200 text-gray-500',
    started: 'bg-amber-500 text-white',
    complete: 'bg-green-500 text-white',
  }

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-lg shadow-sm border p-4
                 hover:border-blue-300 hover:shadow-md transition-all
                 flex items-center gap-4 text-left"
    >
      {/* Step number */}
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center
                    text-sm font-bold flex-shrink-0 ${stepColors[status]}`}
      >
        {status === 'complete' ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          step
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{description}</p>
      </div>

      {/* Status badge */}
      <span
        className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0
                    ${statusColors[status]}`}
      >
        {statusLabels[status]}
      </span>

      {/* Arrow */}
      <svg
        className="w-4 h-4 text-gray-400 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  )
}

// ─── Info Row Component ───
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}:</span>
      <span className="text-gray-900 font-medium text-right">{value}</span>
    </div>
  )
}