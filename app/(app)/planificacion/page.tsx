'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/page-header'
import { LoadingState } from '@/components/ui/loading-state'

interface PlanRow {
  id: string
  year: number
  month: number
  label: string
  status: 'BORRADOR' | 'APROBADO'
  approvedAt: string | null
  linesCount: number
  updatedAt: string
}

interface MonthOption {
  year: number
  month: number
  label: string
}

interface ServiceSummary {
  activeStudents: number
  totalStudents: number
  withPlan: number
  withVi: number
  byDifficulty: Array<{ difficulty: string; label: string; students: number }>
}

const STATUS_TONE: Record<PlanRow['status'], string> = {
  BORRADOR: 'bg-amber-100 text-amber-800',
  APROBADO: 'bg-emerald-100 text-emerald-800',
}

export default function PlanificacionListPage() {
  const router = useRouter()
  const [plans, setPlans] = useState<PlanRow[]>([])
  const [schoolPeriod, setSchoolPeriod] = useState('')
  const [monthOptions, setMonthOptions] = useState<MonthOption[]>([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<ServiceSummary | null>(null)
  const [creating, setCreating] = useState(false)
  const [showWizard, setShowWizard] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const [plansRes, periodsRes, summaryRes] = await Promise.all([
      fetch('/api/action-plans'),
      fetch('/api/school-periods'),
      fetch('/api/teacher/service-summary'),
    ])
    if (plansRes.ok) {
      const d = await plansRes.json()
      setPlans(d.plans)
      setSchoolPeriod(d.schoolPeriod)
      if (periodsRes.ok) {
        const periodsData = await periodsRes.json()
        const period = periodsData.periods?.find((p: { id: string }) => p.id === d.schoolPeriod)
        if (period) {
          setMonthOptions(
            period.months.map((m: number) => ({
              year: period.schoolYear,
              month: m,
              label: `${MONTH_NAMES[m]} ${period.schoolYear}`,
            })),
          )
        }
      }
    }
    if (summaryRes.ok) setSummary(await summaryRes.json())
  }, [])

  useEffect(() => {
    reload().finally(() => setLoading(false))
  }, [reload])

  async function createPlan(year: number, month: number) {
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/action-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, month }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 409 && data.existingId) {
          router.push(`/planificacion/${data.existingId}`)
          return
        }
        throw new Error(data.error || 'Error al crear el plan')
      }
      router.push(`/planificacion/${data.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear el plan')
    } finally {
      setCreating(false)
    }
  }

  // Filtra meses para los que ya existe plan
  const existingMonths = new Set(plans.map((p) => `${p.year}-${p.month}`))
  const availableMonths = monthOptions.filter(
    (m) => !existingMonths.has(`${m.year}-${m.month}`),
  )

  if (loading) return <LoadingState message="Cargando planificación…" />

  return (
    <>
      <PageHeader
        title="Planificación de acciones"
        subtitle={`Periodo ${schoolPeriod}`}
        backHref="/"
      />
      <div className="mx-auto max-w-3xl space-y-4 p-4">
        {summary && (
          <div className="rounded-xl border bg-white p-3 text-xs text-gray-700">
            <p>
              <strong>{summary.activeStudents}</strong> estudiantes activos ·{' '}
              <strong>{summary.withPlan}</strong> con plan de apoyo ·{' '}
              <strong>{summary.withVi}</strong> con VI iniciada
            </p>
            {summary.byDifficulty.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {summary.byDifficulty.slice(0, 6).map((d) => (
                  <span
                    key={d.difficulty}
                    className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-700"
                  >
                    {d.label}: {d.students}
                  </span>
                ))}
                {summary.byDifficulty.length > 6 && (
                  <span className="text-[10px] text-gray-400">
                    + {summary.byDifficulty.length - 6} más
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-900">Planes del periodo</h2>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/planificacion/documentos"
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Documentos institucionales
            </Link>
            <button
              type="button"
              onClick={() => setShowWizard(true)}
              disabled={availableMonths.length === 0}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              + Nuevo plan mensual
            </button>
          </div>
        </div>

        {plans.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-xs text-gray-500">
            Aún no has creado planes para este periodo.
          </div>
        ) : (
          <ul className="space-y-2">
            {plans.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/planificacion/${p.id}`}
                  className="block rounded-xl border bg-white p-3 transition-colors hover:border-kata-primary/40"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{p.label}</p>
                      <p className="text-[11px] text-gray-500">
                        {p.linesCount} línea{p.linesCount === 1 ? '' : 's'} ·{' '}
                        Actualizado {new Date(p.updatedAt).toLocaleDateString('es-CR')}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_TONE[p.status]}`}
                    >
                      {p.status === 'APROBADO'
                        ? `Aprobado · ${p.approvedAt ? new Date(p.approvedAt).toLocaleDateString('es-CR') : ''}`
                        : 'Borrador'}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}

        {showWizard && (
          <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center">
            <div className="w-full max-w-md rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl">
              <h3 className="text-sm font-semibold text-gray-900">Nuevo plan mensual</h3>
              <p className="mt-1 text-xs text-gray-500">
                Selecciona el mes a planificar (sólo se muestran los meses del periodo sin plan creado).
              </p>
              {availableMonths.length === 0 ? (
                <p className="mt-3 text-xs text-amber-700">
                  Todos los meses del periodo ya tienen plan.
                </p>
              ) : (
                <ul className="mt-3 grid grid-cols-2 gap-2">
                  {availableMonths.map((m) => (
                    <li key={`${m.year}-${m.month}`}>
                      <button
                        type="button"
                        disabled={creating}
                        onClick={() => createPlan(m.year, m.month)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm hover:border-blue-400 hover:bg-blue-50 disabled:opacity-50"
                      >
                        {m.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowWizard(false)}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

const MONTH_NAMES = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
