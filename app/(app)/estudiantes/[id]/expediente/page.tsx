'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { PageHeader } from '@/components/ui/page-header'
import { LoadingState } from '@/components/ui/loading-state'
import { StepCard, type StepStatus } from '@/components/ui/step-card'
import { BsaFlagCard } from '@/components/ui/bsa-flag-card'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { calculateAge } from '@/lib/utils'
import { getSchoolPeriod, resolveSchoolPeriodId } from '@/lib/school-periods'
import {
  countCapa2Complete,
  SERVICE_INTAKE_LABELS,
  type ServiceIntakeType,
} from '@/lib/vi-completeness'
import { IntakeTypeSelector } from '@/components/vi/intake-type-selector'

type StudentData = {
  id: string
  name: string
  birthDate: string
  grade: string
  classroomTeacherName?: string
  educationalCenter?: {
    id: string
    name: string
    circuit: string
    budgetCode: string
    directorName: string
  } | null
}

type TimelineEvent = {
  id: string
  date: string
  label: string
  tone: 'neutral' | 'primary' | 'warning'
}

export default function ExpedienteHubPage() {
  const router = useRouter()
  const params = useParams()
  const studentId = params.id as string

  const [student, setStudent] = useState<StudentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [bsaSaving, setBsaSaving] = useState(false)

  const [bsaReceived, setBsaReceived] = useState(false)
  const [bsaReceivedDate, setBsaReceivedDate] = useState<string | null>(null)
  const [requiresSupport, setRequiresSupport] = useState<boolean | null>(null)
  const [assessmentUpdatedAt, setAssessmentUpdatedAt] = useState<string | null>(null)

  const [assessmentStatus, setAssessmentStatus] = useState<StepStatus>('empty')
  const [planStatus, setPlanStatus] = useState<StepStatus>('empty')
  const [diagnosticTests, setDiagnosticTests] = useState({
    total: 0,
    started: 0,
    completed: 0,
  })
  const [objectivesCount, setObjectivesCount] = useState({
    active: 0,
    strengths: 0,
    total: 0,
  })
  const [sessionsInfo, setSessionsInfo] = useState({ completed: 0, total: 0 })
  const [activeSchoolPeriodId, setActiveSchoolPeriodId] = useState<string | null>(null)
  const [serviceIntakeType, setServiceIntakeType] = useState<ServiceIntakeType | null>(null)
  const [intakeSaving, setIntakeSaving] = useState(false)

  const [hasBsaArchive, setHasBsaArchive] = useState(false)
  const [bsaExportReady, setBsaExportReady] = useState(false)

  const [capa2, setCapa2] = useState({
    expedienteReviewed: false,
    hasClassroomObservation: false,
    hasFamilyInterview: false,
    hasStudentOrTeacherInterview: false,
    interviewCount: 0,
    observationCount: 0,
  })

  const loadExpediente = useCallback(async () => {
        const [sRes, profileRes] = await Promise.all([
          fetch(`/api/students/${studentId}`),
          fetch('/api/profile'),
        ])
        if (!sRes.ok) throw new Error('No encontrado')
        const sData = await sRes.json()
        setStudent(sData)
        if (profileRes.ok) {
          const profile = await profileRes.json()
          setActiveSchoolPeriodId(resolveSchoolPeriodId(profile.activeSchoolPeriod))
        }

    const aRes = await fetch(`/api/assessments/${studentId}`)
    if (aRes.ok) {
      const aData = await aRes.json()
      if (aData?.id) {
        setBsaReceived(!!aData.bsaReceivedDate)
        setBsaReceivedDate(aData.bsaReceivedDate ?? null)
        setRequiresSupport(aData.requiresSupport ?? null)
        setAssessmentUpdatedAt(aData.updatedAt ?? null)
        setServiceIntakeType(
          aData.serviceIntakeType === 'nuevo_ingreso' || aData.serviceIntakeType === 'continuidad'
            ? aData.serviceIntakeType
            : null,
        )

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

    const bsaRes = await fetch(`/api/students/${studentId}/bsa`)
    if (bsaRes.ok) {
      const bsaData = await bsaRes.json()
      setHasBsaArchive(true)
      setBsaExportReady(!!bsaData.exportReadiness?.ready)
    } else {
      setHasBsaArchive(false)
      setBsaExportReady(false)
    }

    const pRes = await fetch(`/api/support-plans/${studentId}`)
    if (pRes.ok) {
      const pData = await pRes.json()
      if (pData?.id) {
        const hasDiff = pData.activeDifficulties?.length > 0
        const hasProc = pData.priorityProcesses?.length > 0
        setPlanStatus(hasDiff || hasProc ? 'complete' : 'started')
      }
    }

    const dxRes = await fetch(`/api/students/${studentId}/diagnostic-tests`)
    if (dxRes.ok) {
      const dxData: {
        tests: { applications: { completedAt: string | null }[] }[]
      } = await dxRes.json()
      const total = dxData.tests.length
      let started = 0
      let completed = 0
      for (const t of dxData.tests) {
        const anyApp = t.applications.length > 0
        const anyCompleted = t.applications.some((a) => !!a.completedAt)
        if (anyCompleted) completed++
        else if (anyApp) started++
      }
      setDiagnosticTests({ total, started, completed })
    }

    const objRes = await fetch(`/api/students/${studentId}/objectives`)
    if (objRes.ok) {
      const objData: {
        objectives: { result: string; isActive: boolean }[]
      } = await objRes.json()
      const strengths = objData.objectives.filter((o) => o.result === 'LOGRADO').length
      const active = objData.objectives.filter((o) => o.isActive && o.result !== 'LOGRADO').length
      setObjectivesCount({ active, strengths, total: objData.objectives.length })
    }

    const now = new Date()
    const sessionRes = await fetch(
      `/api/sessions?studentId=${studentId}&month=${now.getMonth() + 1}`,
    )
    if (sessionRes.ok) {
      const sessData = await sessionRes.json()
      if (Array.isArray(sessData)) {
        const completed = sessData.filter(
          (s: { attendance: string | null }) => s.attendance !== null,
        ).length
        setSessionsInfo({ completed, total: sessData.length })
      }
    }

    const c2Res = await fetch(`/api/students/${studentId}/capa2-summary`)
    if (c2Res.ok) {
      const c2 = await c2Res.json()
      if (c2.checklist) setCapa2(c2.checklist)
    }
  }, [studentId])

  useEffect(() => {
    async function init() {
      try {
        await loadExpediente()
      } catch {
        router.push('/estudiantes')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [loadExpediente, router])

  const handleBsaChange = async (received: boolean, dateIso: string | null) => {
    setBsaSaving(true)
    try {
      const res = await fetch(`/api/assessments/${studentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bsaReceivedDate: received && dateIso ? dateIso : null,
        }),
      })
      if (!res.ok) throw new Error('Error al guardar')
      const data = await res.json()
      setBsaReceived(!!data.bsaReceivedDate)
      setBsaReceivedDate(data.bsaReceivedDate ?? null)
    } catch {
      alert('No se pudo guardar el registro BSA. Intente de nuevo.')
    } finally {
      setBsaSaving(false)
    }
  }

  const timeline = useMemo((): TimelineEvent[] => {
    const events: TimelineEvent[] = []

    if (bsaReceived && bsaReceivedDate) {
      events.push({
        id: 'bsa',
        date: bsaReceivedDate,
        label: 'Solicitud BSA registrada',
        tone: 'primary',
      })
    } else {
      events.push({
        id: 'bsa-pending',
        date: new Date().toISOString(),
        label: 'Solicitud BSA pendiente de registro',
        tone: 'warning',
      })
    }

    if (assessmentUpdatedAt) {
      events.push({
        id: 'vi',
        date: assessmentUpdatedAt,
        label:
          assessmentStatus === 'complete'
            ? 'Valoración integral completada'
            : 'Valoración integral en edición',
        tone: assessmentStatus === 'complete' ? 'primary' : 'neutral',
      })
    }

    if (planStatus !== 'empty') {
      events.push({
        id: 'plan',
        date: assessmentUpdatedAt ?? new Date().toISOString(),
        label: planStatus === 'complete' ? 'Plan de apoyo configurado' : 'Plan de apoyo iniciado',
        tone: 'neutral',
      })
    }

    if (sessionsInfo.total > 0) {
      events.push({
        id: 'sessions',
        date: new Date().toISOString(),
        label: `${sessionsInfo.completed}/${sessionsInfo.total} sesiones del mes registradas`,
        tone: 'neutral',
      })
    }

    if (capa2.expedienteReviewed) {
      events.push({
        id: 'exp-consult',
        date: new Date().toISOString(),
        label: 'Expediente único consultado (registrado)',
        tone: 'primary',
      })
    }

    if (capa2.observationCount > 0) {
      events.push({
        id: 'obs',
        date: new Date().toISOString(),
        label: `${capa2.observationCount} observación(es) registrada(s)`,
        tone: 'neutral',
      })
    }

    if (capa2.interviewCount > 0) {
      events.push({
        id: 'int',
        date: new Date().toISOString(),
        label: `${capa2.interviewCount} entrevista(s) registrada(s)`,
        tone: 'neutral',
      })
    }

    return events.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )
  }, [
    assessmentStatus,
    assessmentUpdatedAt,
    bsaReceived,
    bsaReceivedDate,
    planStatus,
    sessionsInfo,
    capa2,
  ])

  const capa2Progress = countCapa2Complete(capa2, serviceIntakeType)
  const capa2Complete = capa2Progress.done

  const capa2Status: StepStatus =
    capa2Progress.done === capa2Progress.total
      ? 'complete'
      : capa2Progress.done > 0 || capa2.interviewCount > 0 || capa2.observationCount > 0
        ? 'started'
        : 'empty'

  const handleIntakeTypeChange = async (value: ServiceIntakeType) => {
    setIntakeSaving(true)
    try {
      const res = await fetch(`/api/assessments/${studentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceIntakeType: value }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setServiceIntakeType(
        data.serviceIntakeType === 'nuevo_ingreso' || data.serviceIntakeType === 'continuidad'
          ? data.serviceIntakeType
          : null,
      )
    } catch {
      alert('No se pudo guardar el tipo de atención.')
    } finally {
      setIntakeSaving(false)
    }
  }

  const diagnosticTestsAny = diagnosticTests.started + diagnosticTests.completed > 0
  const diagnosticTestsStatus: StepStatus =
    diagnosticTests.completed > 0
      ? 'complete'
      : diagnosticTests.started > 0
        ? 'started'
        : 'empty'

  const checklistComplete = [
    bsaReceived,
    capa2Complete >= (serviceIntakeType === 'continuidad' ? 1 : 3),
    diagnosticTestsAny,
    assessmentStatus !== 'empty',
    planStatus !== 'empty',
    sessionsInfo.total > 0,
  ].filter(Boolean).length

  if (loading || !student) {
    return <LoadingState message="Cargando expediente..." />
  }

  const serviceBadge =
    requiresSupport === true
      ? { label: 'En servicio PA', tone: 'primary' as const }
      : requiresSupport === false
        ? { label: 'Sin apoyo PA', tone: 'neutral' as const }
        : { label: 'Servicio por definir', tone: 'warning' as const }

  return (
    <>
      <PageHeader
        title={student.name}
        subtitle={`${calculateAge(student.birthDate)} años · Sección ${student.grade}${
          student.classroomTeacherName ? ` · ${student.classroomTeacherName}` : ''
        }`}
        backHref="/estudiantes"
        backLabel="← Estudiantes"
      >
        <Badge tone={serviceBadge.tone}>{serviceBadge.label}</Badge>
      </PageHeader>

      <div className="mx-auto max-w-lg space-y-4 p-4">
        <Card padding="sm">
          <p className="text-xs text-gray-500">Expediente interno PA</p>
          <p className="text-sm font-medium text-gray-900">
            Checklist: {checklistComplete} de 6 áreas con avance
          </p>
          <p className="mt-1 text-xs text-gray-500">
            BSA · Capa 2 · Pruebas · VI · Plan · Sesiones
          </p>
          {activeSchoolPeriodId && (
            <p className="mt-1 text-xs text-kata-primary-dark">
              Periodo activo: {getSchoolPeriod(activeSchoolPeriodId)?.shortLabel ?? activeSchoolPeriodId}
            </p>
          )}
        </Card>

        <BsaFlagCard
          received={bsaReceived}
          receivedDate={bsaReceivedDate}
          saving={bsaSaving}
          onChange={handleBsaChange}
        />

        {hasBsaArchive && (
          <StepCard
            step={1}
            title="Boleta BSA"
            description="Editar solicitud y exportar resolución para imprimir"
            status={bsaExportReady ? 'complete' : 'started'}
            statusLabels={{
              empty: 'Sin archivo',
              started: 'Resolución pendiente',
              complete: 'Lista para imprimir',
            }}
            onClick={() => router.push(`/estudiantes/${studentId}/expediente/bsa`)}
          />
        )}

        {student.educationalCenter && (
          <button
            type="button"
            className="w-full text-left"
            onClick={() => hasBsaArchive && router.push(`/estudiantes/${studentId}/expediente/bsa`)}
            disabled={!hasBsaArchive}
          >
            <Card
              padding="sm"
              className={hasBsaArchive ? 'transition-colors hover:border-kata-primary/40' : ''}
            >
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Centro educativo
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {student.educationalCenter.name}
            </p>
            <dl className="mt-2 space-y-1 text-xs text-gray-600">
              {student.educationalCenter.circuit && (
                <div className="flex gap-2">
                  <dt className="shrink-0 text-gray-500">Circuito:</dt>
                  <dd>{student.educationalCenter.circuit}</dd>
                </div>
              )}
              {student.educationalCenter.budgetCode && (
                <div className="flex gap-2">
                  <dt className="shrink-0 text-gray-500">Código presup.:</dt>
                  <dd>{student.educationalCenter.budgetCode}</dd>
                </div>
              )}
              {student.educationalCenter.directorName && (
                <div className="flex gap-2">
                  <dt className="shrink-0 text-gray-500">Director(a):</dt>
                  <dd>{student.educationalCenter.directorName}</dd>
                </div>
              )}
            </dl>
            {hasBsaArchive && (
              <p className="mt-2 text-xs text-kata-primary">Ver boleta completa →</p>
            )}
            </Card>
          </button>
        )}

        {!bsaReceived && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Antes de cerrar la valoración integral, confirme si recibió la solicitud BSA.
          </p>
        )}

        <IntakeTypeSelector
          value={serviceIntakeType}
          onChange={handleIntakeTypeChange}
          saving={intakeSaving}
        />

        {serviceIntakeType && (
          <p className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-900">
            {serviceIntakeType === 'continuidad'
              ? 'Continuidad: actualice Capa 2 solo si hubo cambios relevantes en el periodo.'
              : 'Ingreso nuevo: complete la evidencia Capa 2 antes de cerrar la valoración integral.'}
            {' '}
            ({SERVICE_INTAKE_LABELS[serviceIntakeType]})
          </p>
        )}

        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Entrada diagnóstica (Capa 2)
          {serviceIntakeType === 'continuidad' && ' · checklist reducido'}
        </p>

        <StepCard
          step={1}
          title="Consulta expediente único"
          description="Acción MEP 1.6 — revisión en el centro"
          status={capa2.expedienteReviewed ? 'complete' : 'empty'}
          statusLabels={{
            empty: 'Pendiente',
            started: 'Pendiente',
            complete: 'Registrada',
          }}
          onClick={() => router.push(`/estudiantes/${studentId}/expediente/consulta`)}
        />

        <StepCard
          step={2}
          title="Observaciones"
          description={
            capa2.hasClassroomObservation
              ? `${capa2.observationCount} registro(s) · aula documentada`
              : capa2.observationCount > 0
                ? `${capa2.observationCount} registro(s) · falta aula (≥3 dimensiones)`
                : 'Primordialmente en aula'
          }
          status={
            capa2.hasClassroomObservation
              ? 'complete'
              : capa2.observationCount > 0
                ? 'started'
                : 'empty'
          }
          statusLabels={{
            empty: 'Sin registros',
            started: 'En progreso',
            complete: 'Aula lista',
          }}
          onClick={() => router.push(`/estudiantes/${studentId}/observaciones`)}
        />

        <StepCard
          step={3}
          title="Pruebas diagnósticas"
          description={
            diagnosticTests.completed > 0
              ? `${diagnosticTests.completed} prueba${diagnosticTests.completed === 1 ? '' : 's'} completada${diagnosticTests.completed === 1 ? '' : 's'}${diagnosticTests.started ? ` · ${diagnosticTests.started} en proceso` : ''}`
              : diagnosticTests.started > 0
                ? `${diagnosticTests.started} en proceso · ${diagnosticTests.total} disponibles`
                : `${diagnosticTests.total} pruebas disponibles para el grado`
          }
          status={diagnosticTestsStatus}
          statusLabels={{
            empty: 'Sin aplicar',
            started: 'En proceso',
            complete: 'Aplicadas',
          }}
          onClick={() => router.push(`/estudiantes/${studentId}/pruebas`)}
        />

        <StepCard
          step={4}
          title="Entrevistas"
          description={
            capa2.hasFamilyInterview && capa2.hasStudentOrTeacherInterview
              ? `${capa2.interviewCount} registro(s) · familia y estudiante/docente`
              : capa2.interviewCount > 0
                ? `${capa2.interviewCount} registro(s) · completar tipos MEP`
                : 'Familia, estudiante, docente de grado'
          }
          status={
            capa2.hasFamilyInterview && capa2.hasStudentOrTeacherInterview
              ? 'complete'
              : capa2.interviewCount > 0
                ? 'started'
                : 'empty'
          }
          statusLabels={{
            empty: 'Sin entrevistas',
            started: 'En progreso',
            complete: 'Tipos cubiertos',
          }}
          onClick={() => router.push(`/estudiantes/${studentId}/entrevistas`)}
        />

        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Flujo del servicio
        </p>

        <StepCard
          step={5}
          title="Valoración integral"
          description="Documento fuente — Formato 2026"
          status={assessmentStatus}
          statusLabels={{
            empty: 'Sin iniciar',
            started: 'En progreso',
            complete: 'Completada',
          }}
          onClick={() => router.push(`/estudiantes/${studentId}/valoracion`)}
        />

        <StepCard
          step={6}
          title="Plan de apoyo"
          description="Procesos, dificultades y estrategias"
          status={planStatus}
          statusLabels={{
            empty: 'Sin iniciar',
            started: 'En progreso',
            complete: 'Configurado',
          }}
          onClick={() => router.push(`/estudiantes/${studentId}/plan`)}
        />

        <StepCard
          step={7}
          title="Objetivos de apoyo"
          description={
            objectivesCount.total === 0
              ? 'Aplicar pruebas para derivar objetivos'
              : objectivesCount.active === 0
                ? `${objectivesCount.strengths} fortaleza${objectivesCount.strengths === 1 ? '' : 's'} · sin objetivos activos`
                : `${objectivesCount.active} activo${objectivesCount.active === 1 ? '' : 's'} · ${objectivesCount.strengths} fortaleza${objectivesCount.strengths === 1 ? '' : 's'}`
          }
          status={
            objectivesCount.total === 0
              ? 'empty'
              : objectivesCount.active === 0
                ? 'complete'
                : 'started'
          }
          statusLabels={{
            empty: 'Sin objetivos',
            started: `${objectivesCount.active} activos`,
            complete: '¡Alta sugerida!',
          }}
          onClick={() => router.push(`/estudiantes/${studentId}/objetivos`)}
        />

        <StepCard
          step={8}
          title="Sesiones del periodo"
          description={
            sessionsInfo.total > 0
              ? `${sessionsInfo.completed} de ${sessionsInfo.total} registradas (mes actual)`
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

        <Button
          fullWidth
          className="bg-green-600 hover:bg-green-700 focus-visible:outline-green-600"
          onClick={() => router.push(`/informes/${studentId}`)}
        >
          Generar informe del periodo
        </Button>

        <button
          type="button"
          onClick={() => router.push(`/estudiantes/${studentId}/editar`)}
          className="w-full text-center text-sm text-kata-primary hover:underline"
        >
          Editar datos del estudiante
        </button>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Línea de tiempo</h2>
          <ul className="space-y-3">
            {timeline.map((ev, i) => (
              <li key={ev.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      ev.tone === 'primary'
                        ? 'bg-kata-primary'
                        : ev.tone === 'warning'
                          ? 'bg-amber-500'
                          : 'bg-gray-300'
                    }`}
                  />
                  {i < timeline.length - 1 && (
                    <span className="my-0.5 w-px flex-1 bg-gray-200" />
                  )}
                </div>
                <div className="min-w-0 pb-2">
                  <p className="text-sm text-gray-900">{ev.label}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(ev.date).toLocaleDateString('es-CR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-gray-400">
            Entrada diagnóstica: {capa2Status === 'complete' ? 'completa' : `${capa2Complete}/4 pasos MEP`}.
          </p>
        </Card>
      </div>
    </>
  )
}
