'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { PageHeader } from '@/components/ui/page-header'
import { LoadingState } from '@/components/ui/loading-state'
import { ListRow } from '@/components/ui/list-row'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'
import { calculateAge } from '@/lib/utils'
import {
  parseServiceFilter,
  SERVICE_STATUS_TONE,
  type ServiceFilter,
  type ServiceStatus,
} from '@/lib/service-status'
import type { BadgeTone } from '@/components/ui/badge'

type ServiceStudentRow = {
  id: string
  name: string
  grade: string
  birthDate: string
  requiresSupport: boolean | null
  assessmentStatus: string | null
  bsaReceived: boolean
  serviceStatus: ServiceStatus
  serviceStatusLabel: string
  viProgress: { completed: number; total: number }
  updatedAt: string
}

type ApiResponse = {
  filter: ServiceFilter
  counts: Record<ServiceFilter, number>
  students: ServiceStudentRow[]
}

const FILTER_OPTIONS: { key: ServiceFilter; label: string }[] = [
  { key: 'en_servicio', label: 'En servicio' },
  { key: 'valoracion', label: 'Valoración' },
  { key: 'pendientes', label: 'Pendientes' },
  { key: 'todos', label: 'Todos' },
]

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'hoy'
  if (days === 1) return 'ayer'
  if (days < 7) return `hace ${days} días`
  return new Date(iso).toLocaleDateString('es-CR', { day: 'numeric', month: 'short' })
}

function ServicioEstudiantesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const filter = parseServiceFilter(searchParams.get('filter'))

  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/servicio/estudiantes?filter=${filter}`)
      if (!res.ok) throw new Error('Error al cargar')
      const json: ApiResponse = await res.json()
      setData(json)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    load()
  }, [load])

  const setFilter = (f: ServiceFilter) => {
    router.replace(`/servicio/estudiantes?filter=${f}`)
  }

  if (loading && !data) {
    return <LoadingState message="Cargando lista del servicio..." />
  }

  const counts = data?.counts ?? {
    en_servicio: 0,
    todos: 0,
    valoracion: 0,
    pendientes: 0,
  }
  const students = data?.students ?? []

  return (
    <>
      <PageHeader
        title="Servicio PA"
        subtitle="Lista operativa — problemas de aprendizaje"
      >
        <Button
          variant="primary"
          className="shrink-0 text-xs"
          onClick={() => router.push('/estudiantes/nuevo')}
        >
          + Nuevo
        </Button>
      </PageHeader>

      <div className="mx-auto max-w-lg space-y-4 p-4">
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setFilter(opt.key)}
              className={cn(
                'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                filter === opt.key
                  ? 'bg-kata-primary text-white'
                  : 'border border-gray-200 bg-white text-gray-600 hover:border-gray-300',
              )}
            >
              {opt.label}
              <span
                className={cn(
                  'ml-1 text-xs',
                  filter === opt.key ? 'text-white/80' : 'text-gray-400',
                )}
              >
                ({counts[opt.key]})
              </span>
            </button>
          ))}
        </div>

        <p className="text-xs text-gray-500">
          <Link href="/estudiantes" className="text-kata-primary hover:underline">
            Ver registro completo de estudiantes
          </Link>
        </p>

        {students.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 bg-white py-12 text-center">
            <p className="mb-2 text-sm text-gray-500">
              No hay estudiantes en este filtro.
            </p>
            {filter === 'en_servicio' && (
              <button
                type="button"
                onClick={() => setFilter('todos')}
                className="text-sm text-kata-primary hover:underline"
              >
                Ver todos los registrados
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {students.map((s) => {
              const tone = SERVICE_STATUS_TONE[s.serviceStatus] as BadgeTone
              const viPct = Math.round(
                (s.viProgress.completed / s.viProgress.total) * 100,
              )
              return (
                <ListRow
                  key={s.id}
                  href={`/estudiantes/${s.id}/expediente`}
                  title={s.name}
                  subtitle={`Sección ${s.grade} · ${calculateAge(s.birthDate)} años`}
                  meta={`VI ${s.viProgress.completed}/${s.viProgress.total} (${viPct}%) · ${relativeDate(s.updatedAt)}${
                    !s.bsaReceived ? ' · BSA pendiente' : ''
                  }`}
                  statusLabel={s.serviceStatusLabel}
                  statusTone={tone}
                />
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

export default function ServicioEstudiantesPage() {
  return (
    <Suspense fallback={<LoadingState message="Cargando lista del servicio..." />}>
      <ServicioEstudiantesContent />
    </Suspense>
  )
}
