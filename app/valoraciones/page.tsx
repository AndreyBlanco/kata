// app/valoraciones/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type AssessmentSummary = {
  id: string
  status: 'active' | 'completed'
  requiresSupport: boolean | null
  updatedAt: string
  completedSections: number
  totalSections: number
  student: { id: string; name: string; grade: string }
}

type Filter = 'all' | 'active' | 'completed'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'hoy'
  if (days === 1) return 'ayer'
  if (days < 7)  return `hace ${days} días`
  if (days < 30) return `hace ${Math.floor(days / 7)} sem.`
  return new Date(iso).toLocaleDateString('es-CR', { day: 'numeric', month: 'short' })
}

// ─────────────────────────────────────────────────────────────────────────────
// Assessment card
// ─────────────────────────────────────────────────────────────────────────────

function AssessmentCard({
  a, onOpen,
}: {
  a: AssessmentSummary
  onOpen: (studentId: string) => void
}) {
  const pct = Math.round((a.completedSections / a.totalSections) * 100)

  const statusBadge = a.status === 'completed'
    ? <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Completada</span>
    : <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">En proceso</span>

  const supportBadge = () => {
    if (a.status !== 'completed') return null
    if (a.requiresSupport === true)
      return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">Con plan de apoyo</span>
    if (a.requiresSupport === false)
      return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Archivada</span>
    return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Decisión pendiente</span>
  }

  return (
    <button
      onClick={() => onOpen(a.student.id)}
      className="w-full bg-white rounded-lg border shadow-sm p-4 text-left
                 hover:border-blue-300 hover:shadow-md transition-all"
    >
      {/* Name + grade + badges */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">{a.student.name}</p>
          <p className="text-xs text-gray-500">Sección {a.student.grade}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {statusBadge}
          {supportBadge()}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-1">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-500">Progreso del expediente</span>
          <span className="text-xs font-medium text-gray-700">
            {a.completedSections}/{a.totalSections} secciones
          </span>
        </div>
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              a.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-400">
          Actualizado {relativeDate(a.updatedAt)}
        </span>
        <span className="text-xs text-blue-600 font-medium">
          Ver expediente →
        </span>
      </div>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function ValoracionesPage() {
  const router = useRouter()
  const [assessments, setAssessments]   = useState<AssessmentSummary[]>([])
  const [loading, setLoading]           = useState(true)
  const [filter, setFilter]             = useState<Filter>('all')

  useEffect(() => {
    fetch('/api/assessments')
      .then((r) => r.json())
      .then((data) => {
        setAssessments(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filtered = assessments.filter((a) => {
    if (filter === 'active')    return a.status === 'active'
    if (filter === 'completed') return a.status === 'completed'
    return true
  })

  const counts = {
    all:       assessments.length,
    active:    assessments.filter((a) => a.status === 'active').length,
    completed: assessments.filter((a) => a.status === 'completed').length,
  }

  const pendingDecision = assessments.filter(
    (a) => a.status === 'completed' && a.requiresSupport === null
  ).length

  const filterBtn = (f: Filter, label: string, count: number) => (
    <button
      onClick={() => setFilter(f)}
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
        filter === f
          ? 'bg-blue-600 text-white'
          : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
      }`}
    >
      {label} <span className={`ml-1 text-xs ${filter === f ? 'text-blue-200' : 'text-gray-400'}`}>({count})</span>
    </button>
  )

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => router.push('/')}
            className="text-sm text-blue-600 mb-2 hover:underline"
          >
            ← Inicio
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Valoraciones Integrales</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {counts.active} en proceso · {counts.completed} completadas
              </p>
            </div>
            <button
              onClick={() => router.push('/estudiantes')}
              className="px-3 py-2 bg-blue-600 text-white text-sm font-medium
                         rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Nueva
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* Pending decision alert */}
        {pendingDecision > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-3">
            <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm text-amber-800">
              <strong>{pendingDecision} valoración{pendingDecision > 1 ? 'es' : ''}</strong> completada{pendingDecision > 1 ? 's' : ''} con decisión de apoyo pendiente.
            </p>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {filterBtn('all',       'Todas',       counts.all)}
          {filterBtn('active',    'En proceso',  counts.active)}
          {filterBtn('completed', 'Completadas', counts.completed)}
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-sm text-gray-400">Cargando expedientes...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-200">
            <p className="text-sm text-gray-500 mb-1">
              {filter === 'all'
                ? 'No hay expedientes de valoración aún.'
                : `No hay expedientes ${filter === 'active' ? 'en proceso' : 'completados'}.`}
            </p>
            {filter === 'all' && (
              <button
                onClick={() => router.push('/estudiantes')}
                className="text-sm text-blue-600 hover:underline mt-1"
              >
                Ir a Estudiantes para iniciar una valoración →
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((a) => (
              <AssessmentCard
                key={a.id}
                a={a}
                onOpen={(studentId) =>
                  router.push(`/estudiantes/${studentId}/valoracion`)
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
